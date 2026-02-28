import type { SupabaseClient } from '@supabase/supabase-js';

type LedgerType = 'reserve' | 'finalize' | 'release' | 'topup' | 'adjustment';

interface EnsureAccountResult {
    accountId: string;
    balance: number;
}

const DEFAULT_INITIAL_CREDITS = Number(process.env.DEFAULT_PROJECT_CREDITS || 3000);

async function ensureCreditAccount(
    supabase: SupabaseClient,
    projectId: string
): Promise<EnsureAccountResult> {
    const { data: existing, error } = await supabase
        .from('credit_accounts')
        .select('id, balance_credits')
        .eq('project_id', projectId)
        .maybeSingle();

    if (error) throw error;

    if (existing) {
        return {
            accountId: existing.id,
            balance: existing.balance_credits,
        };
    }

    const { data: created, error: insertError } = await supabase
        .from('credit_accounts')
        .insert({
            project_id: projectId,
            balance_credits: DEFAULT_INITIAL_CREDITS,
        } as never)
        .select('id, balance_credits')
        .single();

    if (insertError || !created) {
        throw insertError || new Error('Failed to create credit account');
    }

    return {
        accountId: created.id,
        balance: created.balance_credits,
    };
}

async function insertLedgerEntry(
    supabase: SupabaseClient,
    payload: {
        accountId: string;
        projectId: string;
        operationId: string;
        idempotencyKey: string;
        entryType: LedgerType;
        amount: number;
        modelId?: string;
        pricingVersion?: string;
        details?: Record<string, unknown>;
    }
) {
    const { data: existing } = await supabase
        .from('credit_ledger_entries')
        .select('*')
        .eq('idempotency_key', payload.idempotencyKey)
        .maybeSingle();

    if (existing) {
        return existing;
    }

    const { data, error } = await supabase
        .from('credit_ledger_entries')
        .insert({
            account_id: payload.accountId,
            project_id: payload.projectId,
            operation_id: payload.operationId,
            idempotency_key: payload.idempotencyKey,
            entry_type: payload.entryType,
            amount_credits: payload.amount,
            model_id: payload.modelId || null,
            pricing_version: payload.pricingVersion || null,
            details: payload.details || {},
        } as never)
        .select('*')
        .single();

    if (error || !data) {
        throw error || new Error('Failed to insert credit ledger entry');
    }

    return data;
}

export async function reserveCredits(input: {
    supabase: SupabaseClient;
    projectId: string;
    operationId: string;
    amount: number;
    modelId: string;
    pricingVersion: string;
    details?: Record<string, unknown>;
}) {
    const amount = Math.max(0, Math.ceil(input.amount));
    const reserveKey = `reserve:${input.operationId}`;

    const { data: existingReserve } = await input.supabase
        .from('credit_ledger_entries')
        .select('*')
        .eq('idempotency_key', reserveKey)
        .maybeSingle();

    if (existingReserve) {
        const { data: account } = await input.supabase
            .from('credit_accounts')
            .select('balance_credits')
            .eq('id', existingReserve.account_id)
            .single();

        return {
            accountId: existingReserve.account_id,
            reservedAmount: amount,
            remainingCredits: account?.balance_credits ?? 0,
            alreadyReserved: true,
        };
    }

    const account = await ensureCreditAccount(input.supabase, input.projectId);
    if (account.balance < amount) {
        return {
            accountId: account.accountId,
            reservedAmount: 0,
            remainingCredits: account.balance,
            insufficient: true,
        };
    }

    const nextBalance = account.balance - amount;
    const { error: updateError } = await input.supabase
        .from('credit_accounts')
        .update({ balance_credits: nextBalance } as never)
        .eq('id', account.accountId);

    if (updateError) throw updateError;

    await insertLedgerEntry(input.supabase, {
        accountId: account.accountId,
        projectId: input.projectId,
        operationId: input.operationId,
        idempotencyKey: reserveKey,
        entryType: 'reserve',
        amount: -amount,
        modelId: input.modelId,
        pricingVersion: input.pricingVersion,
        details: input.details,
    });

    return {
        accountId: account.accountId,
        reservedAmount: amount,
        remainingCredits: nextBalance,
        insufficient: false,
    };
}

export async function finalizeCredits(input: {
    supabase: SupabaseClient;
    operationId: string;
    projectId: string;
    modelId: string;
    pricingVersion: string;
    details?: Record<string, unknown>;
}) {
    const reserveKey = `reserve:${input.operationId}`;
    const finalizeKey = `finalize:${input.operationId}`;

    const { data: existingFinalize } = await input.supabase
        .from('credit_ledger_entries')
        .select('*')
        .eq('idempotency_key', finalizeKey)
        .maybeSingle();

    if (existingFinalize) {
        return existingFinalize;
    }

    const { data: reserveEntry, error: reserveError } = await input.supabase
        .from('credit_ledger_entries')
        .select('*')
        .eq('idempotency_key', reserveKey)
        .maybeSingle();

    if (reserveError) throw reserveError;
    if (!reserveEntry) {
        throw new Error('Cannot finalize credits: reserve entry not found');
    }

    return insertLedgerEntry(input.supabase, {
        accountId: reserveEntry.account_id,
        projectId: input.projectId,
        operationId: input.operationId,
        idempotencyKey: finalizeKey,
        entryType: 'finalize',
        amount: 0,
        modelId: input.modelId,
        pricingVersion: input.pricingVersion,
        details: input.details,
    });
}

export async function releaseReservedCredits(input: {
    supabase: SupabaseClient;
    operationId: string;
    projectId: string;
    modelId: string;
    pricingVersion: string;
    details?: Record<string, unknown>;
}) {
    const reserveKey = `reserve:${input.operationId}`;
    const releaseKey = `release:${input.operationId}`;

    const { data: existingRelease } = await input.supabase
        .from('credit_ledger_entries')
        .select('*')
        .eq('idempotency_key', releaseKey)
        .maybeSingle();

    if (existingRelease) {
        return existingRelease;
    }

    const { data: reserveEntry } = await input.supabase
        .from('credit_ledger_entries')
        .select('*')
        .eq('idempotency_key', reserveKey)
        .maybeSingle();

    if (!reserveEntry) {
        return null;
    }

    const releaseAmount = Math.abs(reserveEntry.amount_credits || 0);
    if (releaseAmount > 0) {
        const { data: account } = await input.supabase
            .from('credit_accounts')
            .select('balance_credits')
            .eq('id', reserveEntry.account_id)
            .single();

        const nextBalance = (account?.balance_credits || 0) + releaseAmount;
        const { error: updateError } = await input.supabase
            .from('credit_accounts')
            .update({ balance_credits: nextBalance } as never)
            .eq('id', reserveEntry.account_id);

        if (updateError) throw updateError;
    }

    return insertLedgerEntry(input.supabase, {
        accountId: reserveEntry.account_id,
        projectId: input.projectId,
        operationId: input.operationId,
        idempotencyKey: releaseKey,
        entryType: 'release',
        amount: releaseAmount,
        modelId: input.modelId,
        pricingVersion: input.pricingVersion,
        details: input.details,
    });
}

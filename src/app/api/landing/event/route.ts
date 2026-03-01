import { NextRequest, NextResponse } from 'next/server';

const allowedEvents = new Set([
  'landing_view',
  'landing_primary_cta_click',
  'landing_secondary_cta_click',
  'landing_tertiary_cta_click',
  'landing_faq_interaction',
]);

const allowedCtaTypes = new Set(['primary', 'secondary', 'tertiary']);

function toSafeString(value: unknown, maxLength = 200): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = toSafeString(body?.event, 64);
    if (!event || !allowedEvents.has(event)) {
      return NextResponse.json({ error: 'Invalid event name' }, { status: 400 });
    }

    const ctaType = toSafeString(body?.ctaType, 32);
    const safeCtaType = ctaType && allowedCtaTypes.has(ctaType) ? ctaType : undefined;

    const source = toSafeString(body?.source, 32) || 'landing';
    const path = toSafeString(body?.path, 300) || '/';
    const target = toSafeString(body?.target, 300);
    const faqId = toSafeString(body?.faqId, 64);
    const timestamp = Number.isFinite(body?.timestamp) ? Number(body.timestamp) : Date.now();

    const utm = {
      source: toSafeString(body?.utm?.source, 120),
      medium: toSafeString(body?.utm?.medium, 120),
      campaign: toSafeString(body?.utm?.campaign, 120),
    };

    console.log('[LandingEvent]', {
      event,
      source,
      path,
      target,
      ctaType: safeCtaType,
      faqId,
      utm,
      timestamp,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 });
  }
}

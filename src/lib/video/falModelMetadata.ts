export interface FalModelPreview {
    previewImageUrl?: string;
    previewVideoUrl?: string;
}

interface FalModelResponseItem {
    endpoint_id?: string;
    metadata?: {
        thumbnail_url?: string;
        thumbnail_animated_url?: string;
    };
}

interface FalModelSearchResponse {
    models?: FalModelResponseItem[];
}

const FAL_MODEL_SEARCH_URL = 'https://api.fal.ai/v1/models';

function sanitizeHttpUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return undefined;
        }

        return parsed.toString();
    } catch {
        return undefined;
    }
}

export async function fetchFalModelPreviews(endpointIds: string[]): Promise<Record<string, FalModelPreview>> {
    const normalizedEndpointIds = Array.from(
        new Set(
            endpointIds
                .map((id) => (typeof id === 'string' ? id.trim() : ''))
                .filter((id) => id.length > 0)
        )
    );

    if (normalizedEndpointIds.length === 0) {
        return {};
    }

    const query = new URLSearchParams();
    query.set('status', 'active');
    query.set('limit', String(Math.min(normalizedEndpointIds.length, 50)));
    normalizedEndpointIds.forEach((id) => {
        query.append('endpoint_id', id);
    });

    const headers: Record<string, string> = {};
    const falKey = process.env.FAL_KEY?.trim();
    if (falKey) {
        headers.Authorization = `Key ${falKey}`;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), 3500);

    try {
        const response = await fetch(`${FAL_MODEL_SEARCH_URL}?${query.toString()}`, {
            method: 'GET',
            headers,
            signal: controller.signal,
            next: { revalidate: 60 * 60 * 6 },
        });

        if (!response.ok) {
            return {};
        }

        const payload = (await response.json()) as FalModelSearchResponse;
        const map: Record<string, FalModelPreview> = {};

        for (const item of payload.models || []) {
            const endpointId = typeof item.endpoint_id === 'string' ? item.endpoint_id : '';
            if (!endpointId) {
                continue;
            }

            map[endpointId] = {
                previewImageUrl: sanitizeHttpUrl(item.metadata?.thumbnail_url),
                previewVideoUrl: sanitizeHttpUrl(item.metadata?.thumbnail_animated_url),
            };
        }

        return map;
    } catch (error) {
        console.warn('[falModelMetadata] Failed to load model previews:', error);
        return {};
    } finally {
        clearTimeout(timeoutHandle);
    }
}

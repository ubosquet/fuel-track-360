import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ═══════════════════════════════════════════════════════════
// Signed URL for GCS objects — single + batch
// ═══════════════════════════════════════════════════════════

interface SignedUrlResult {
    url: string;
    expires_at: string;
}

interface BatchSignedUrlResult {
    path: string;
    url: string | null;
    expires_at?: string;
    error?: string;
}

/**
 * Fetch a signed URL for a single GCS storage path.
 * Caches the result for 20 minutes (signed URLs last 24h).
 */
export function useSignedUrl(storagePath: string | null | undefined, bucket: 'photos' | 'signatures' = 'photos') {
    return useQuery({
        queryKey: ['signed-url', bucket, storagePath],
        queryFn: async (): Promise<string> => {
            if (!storagePath) return '';
            // If already a full URL, return as-is
            if (storagePath.startsWith('http')) return storagePath;

            const res: any = await api.get('/storage/signed-url', {
                params: { path: storagePath, bucket },
            });
            return res?.data?.url ?? res?.url ?? '';
        },
        enabled: !!storagePath && !storagePath.startsWith('http'),
        staleTime: 20 * 60 * 1000,     // 20 minutes
        gcTime: 30 * 60 * 1000,         // 30 minutes
    });
}

/**
 * Fetch signed URLs for multiple GCS storage paths in one request.
 * Returns a Map<storagePath, signedUrl> for easy lookup.
 */
export function useBatchSignedUrls(storagePaths: string[], bucket: 'photos' | 'signatures' = 'photos') {
    // Filter to only paths that need signing
    const pathsToSign = storagePaths.filter((p) => p && !p.startsWith('http'));
    const sortedPaths = [...pathsToSign].sort(); // stable query key

    return useQuery({
        queryKey: ['signed-urls', bucket, sortedPaths],
        queryFn: async (): Promise<Map<string, string>> => {
            if (pathsToSign.length === 0) return new Map();

            const res: any = await api.get('/storage/signed-urls', {
                params: { paths: pathsToSign.join(','), bucket },
            });

            const urlMap = new Map<string, string>();

            // Response: { data: { urls: [...] } } or { urls: [...] }
            const urlList: BatchSignedUrlResult[] = res?.data?.urls ?? res?.urls ?? [];
            for (const item of urlList) {
                if (item.url) {
                    urlMap.set(item.path, item.url);
                }
            }

            // Keep already-signed URLs
            for (const p of storagePaths) {
                if (p?.startsWith('http')) {
                    urlMap.set(p, p);
                }
            }

            return urlMap;
        },
        enabled: storagePaths.length > 0,
        staleTime: 20 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Utility: get the display URL for a photo.
 * Falls back to the API proxy if no signed URL is available.
 */
export function resolvePhotoUrl(
    storagePath: string | null | undefined,
    urlMap?: Map<string, string>,
): string {
    if (!storagePath) return '';
    if (storagePath.startsWith('http')) return storagePath;
    if (urlMap?.has(storagePath)) return urlMap.get(storagePath)!;

    // Fallback: proxy through the API (will require auth)
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    return `${apiBase}/storage/signed-url?path=${encodeURIComponent(storagePath)}`;
}

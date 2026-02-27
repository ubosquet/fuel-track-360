/**
 * Pagination utility
 *
 * Used by all list endpoints to return a consistent response envelope:
 *   { data, meta: { total, page, limit, total_pages } }
 *
 * This is L5 of the low-priority hardening list — ensures every paginated
 * response includes navigation metadata rather than returning a bare array.
 */

export interface PageMeta {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface PagedResult<T> {
    data: T[];
    meta: PageMeta;
}

/**
 * Clamp and normalise raw query pagination params from a controller.
 * Prevents negative pages, absurdly large limits, and non-integer inputs.
 */
export function normalizePagination(
    rawPage?: number,
    rawLimit?: number,
    maxLimit = 100,
): { page: number; limit: number } {
    const page = Math.max(1, Math.floor(Number(rawPage) || 1));
    const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(rawLimit) || 20)));
    return { page, limit };
}

/**
 * Wrap a TypeORM `getManyAndCount()` result in a standard paginated envelope.
 */
export function toPagedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
): PagedResult<T> {
    const total_pages = Math.ceil(total / limit);
    return {
        data,
        meta: {
            total,
            page,
            limit,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        },
    };
}

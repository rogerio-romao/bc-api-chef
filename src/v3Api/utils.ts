import tchef from 'tchef';

import { DEFAULT_START_PAGE, PER_PAGE_DEFAULT, PER_PAGE_MAX, PER_PAGE_MIN } from './constants';

import type { TchefResult } from 'tchef';

import type { BcRequestResponseMeta } from '@/types/api-types';

const PAGINATION_PARAMS = new Set(['page', 'limit']);

/**
 * Serializes a query object into a URL query string suffix (e.g. `?foo=bar`).
 * `page` and `limit` are always omitted — they are handled separately by
 * pagination helpers in each resource class.
 * @param query - Key/value query params. Arrays are joined with commas.
 * @param options - Optional settings for query string generation.
 * @param options.include - Optional comma-separated include string, appended as `include=...`.
 * @returns { string } The query string with a leading `?`, or an empty string when there are no params.
 */
export function buildQueryString(
    query: object | undefined,
    options?: { include?: string },
): string {
    const params = new URLSearchParams();

    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && !PAGINATION_PARAMS.has(key)) {
                params.set(key, Array.isArray(value) ? value.join(',') : String(value));
            }
        }
    }

    if (options?.include) {
        params.set('include', options.include);
    }

    return params.size > 0 ? `?${params.toString()}` : '';
}

export function clampPerPageLimits(limit: number | undefined): number {
    if (limit === undefined) {
        return PER_PAGE_DEFAULT;
    }

    return Math.min(Math.max(limit, PER_PAGE_MIN), PER_PAGE_MAX);
}

/** Validates that an number is a positive integer.
 * @param numbers Number values to validate.
 * @returns {true | string} `true` if all numbers are valid, or an error message for the first invalid number.
 */
export function validatePositiveIntegers(numbers: Record<string, number>): true | string {
    for (const [fieldName, value] of Object.entries(numbers)) {
        if (!Number.isInteger(value) || value <= 0) {
            return `Invalid ${fieldName}: must be a positive integer.`;
        }
    }
    return true;
}

/**
 * Fetches a single BC resource and unwraps the `{ data }` envelope.
 * @param url - Fully-built request URL.
 * @param accessToken - BigCommerce API access token.
 * @returns {Promise<TchefResult<T>>} The resource or an error result.
 */
export async function fetchOne<T>(url: string, accessToken: string): Promise<TchefResult<T>> {
    const response = await tchef(url, {
        headers: {
            Accept: 'application/json',
            'X-Auth-Token': accessToken,
        },
    });

    if (!response.ok) {
        return response;
    }

    const { data } = response.data as { data: T };
    return { data, ok: true };
}

/**
 * Fetches all pages of a paginated BC endpoint and returns the merged data
 * array, or a single page when `singlePage` is supplied.
 * @param baseUrl - Fully-built URL including any query string (excluding page/limit).
 * @param accessToken - BigCommerce API access token.
 * @param limit - Page size (should already be clamped by the caller).
 * @param singlePage - When provided, only that page is fetched and returned.
 * @returns {Promise<TchefResult<T[]>>} The collected rows or an error result.
 */
export async function fetchPaginated<T>(
    baseUrl: string,
    accessToken: string,
    limit: number,
    singlePage?: number,
): Promise<TchefResult<T[]>> {
    const results: T[] = [];

    let page = singlePage ?? DEFAULT_START_PAGE;
    let totalPages = 1;

    const separator = baseUrl.includes('?') ? '&' : '?';

    do {
        const pagedUrl = `${baseUrl}${separator}page=${page}&limit=${limit}`;

        const response = await tchef(pagedUrl, {
            headers: {
                Accept: 'application/json',
                'X-Auth-Token': accessToken,
            },
        });

        if (!response.ok) {
            return response;
        }

        const { data, meta } = response.data as { data: T[]; meta: BcRequestResponseMeta };

        results.push(...data);

        if (singlePage !== undefined) {
            return { data: results, ok: true };
        }

        totalPages = meta?.pagination?.total_pages ?? 1;
        page += 1;
    } while (page <= totalPages);

    return { data: results, ok: true };
}

/**
 * Sends a `DELETE` request to the specified URL.
 * @param url - Fully-built request URL.
 * @param accessToken - BigCommerce API access token.
 * @returns {Promise<TchefResult<null>>} An empty success result or an error result.
 */
export async function deleteResource(url: string, accessToken: string): Promise<TchefResult<null>> {
    const response = await tchef(url, {
        headers: {
            Accept: 'application/json',
            'X-Auth-Token': accessToken,
        },
        method: 'DELETE',
        responseFormat: 'text',
    });

    if (!response.ok) {
        return response;
    }

    return { data: null, ok: true };
}

/**
 * Sends a JSON `POST` request and unwraps the common `{ data }` response envelope.
 * Validation stays at the call site so this helper only handles transport concerns.
 * @param url - Fully-built request URL.
 * @param accessToken - BigCommerce API access token.
 * @param payload - Request body to serialize as JSON.
 * @returns {Promise<TchefResult<T>>} The created resource or an error result.
 */
export async function createResource<T, P>(
    url: string,
    accessToken: string,
    payload: P,
): Promise<TchefResult<T>> {
    const response = await tchef(url, {
        body: JSON.stringify(payload),
        headers: {
            Accept: 'application/json',
            'Content-type': 'application/json',
            'X-Auth-Token': accessToken,
        },
        method: 'POST',
    });

    if (!response.ok) {
        return response;
    }

    const { data } = response.data as { data: T };
    return { data, ok: true };
}

/**
 * Sends a `multipart/form-data` `POST` request and unwraps the common `{ data }` response envelope.
 * Uses raw `fetch` instead of `tchef` because `tchef` only accepts a `string` body.
 * The `Content-type` header must NOT be set manually — `fetch` auto-generates it with the
 * correct multipart boundary when given a `FormData` body.
 * @param url - Fully-built request URL.
 * @param accessToken - BigCommerce API access token.
 * @param formData - The `FormData` body to send.
 * @returns {Promise<TchefResult<T>>} The created resource or an error result.
 */
export async function createResourceMultipart<T>(
    url: string,
    accessToken: string,
    formData: FormData,
): Promise<TchefResult<T>> {
    try {
        const response = await fetch(url, {
            body: formData,
            headers: {
                Accept: 'application/json',
                'X-Auth-Token': accessToken,
            },
            method: 'POST',
        });

        if (!response.ok) {
            return { error: response.statusText, ok: false, statusCode: response.status };
        }

        const json = (await response.json()) as { data: T };
        return { data: json.data, ok: true };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Network Error',
            ok: false,
            statusCode: 500,
        };
    }
}

/**
 * Sends a JSON `PUT` request and unwraps the common `{ data }` response envelope.
 * Validation stays at the call site so this helper only handles transport concerns.
 * @param url - Fully-built request URL.
 * @param accessToken - BigCommerce API access token.
 * @param payload - Request body to serialize as JSON.
 * @returns {Promise<TchefResult<T>>} The updated resource or an error result.
 */
export async function updateResource<T, P>(
    url: string,
    accessToken: string,
    payload: P,
): Promise<TchefResult<T>> {
    const response = await tchef(url, {
        body: JSON.stringify(payload),
        headers: {
            Accept: 'application/json',
            'Content-type': 'application/json',
            'X-Auth-Token': accessToken,
        },
        method: 'PUT',
    });

    if (!response.ok) {
        return response;
    }

    const { data } = response.data as { data: T };
    return { data, ok: true };
}

import type { TchefResult } from 'tchef';

import type { BcRequestResponseMeta } from '@/types/api-types';

interface MockTchef {
    mock: {
        calls: unknown[][];
    };
}

interface MockTchefCallOptions {
    body?: unknown;
    headers?: Record<string, string>;
    method?: string;
    responseFormat?: string;
}

interface MockPageResponse {
    data: {
        data: object[];
        meta: BcRequestResponseMeta;
    };
    ok: true;
}

/**
 * Returns the request URL from a mocked tchef call.
 * @param mockTchef - The mocked tchef instance.
 * @param callIndex - The zero-based call index.
 * @returns {URL} The captured request URL.
 * @throws {Error} If the call index is out of bounds or if the URL argument is not a string.
 */
export function getCallUrl(mockTchef: MockTchef, callIndex = 0): URL {
    const call = mockTchef.mock.calls[callIndex];

    if (!call) {
        throw new Error(`No mock call at index ${callIndex}`);
    }

    const urlArg: unknown = call[0];

    if (typeof urlArg !== 'string') {
        throw new TypeError(`Call ${callIndex} arg 0 is not a string`);
    }

    return new URL(urlArg);
}

/**
 * Returns the request headers from a mocked tchef call.
 * @param mockTchef - The mocked tchef instance.
 * @param callIndex - The zero-based call index.
 * @returns {Record<string, string>} The captured request headers.
 * @throws {Error} If the call index is out of bounds or if the call has no headers.
 */
export function getCallHeaders(mockTchef: MockTchef, callIndex = 0): Record<string, string> {
    const call = mockTchef.mock.calls[callIndex];

    if (!call) {
        throw new Error(`No mock call at index ${callIndex}`);
    }

    const options = call[1] as MockTchefCallOptions;

    if (!options || !options.headers) {
        throw new Error(`Call ${callIndex} has no headers`);
    }

    return options.headers;
}

/**
 * Returns the request options from a mocked tchef call.
 * @param mockTchef - The mocked tchef instance.
 * @param callIndex - The zero-based call index.
 * @returns {MockTchefCallOptions} The captured request options.
 * @throws {Error} If the call index is out of bounds.
 */
export function getCallOptions(mockTchef: MockTchef, callIndex = 0): MockTchefCallOptions {
    const call = mockTchef.mock.calls[callIndex];

    if (!call) {
        throw new Error(`No mock call at index ${callIndex}`);
    }

    const options = call[1] as MockTchefCallOptions | undefined;

    if (!options) {
        throw new Error(`Call ${callIndex} has no options`);
    }

    return options;
}

/**
 * Builds a paginated mock response for list tests.
 * @param rows - The page items to include.
 * @param currentPage - The current page number.
 * @param totalPages - The total number of pages.
 * @returns {MockPageResponse} A mock paginated response object.
 */
export function makePageResponse(
    rows: object[] = [],
    currentPage = 1,
    totalPages = 1,
): MockPageResponse {
    return {
        data: {
            data: rows,
            meta: {
                pagination: {
                    count: rows.length,
                    current_page: currentPage,
                    links: { current: '', next: '', previous: '' },
                    per_page: 250,
                    total: rows.length,
                    total_pages: totalPages,
                },
            },
        },
        ok: true,
    };
}

/**
 * Asserts that a tchef result succeeded.
 * @param result - The result to validate.
 */
export function assertOk<T>(result: TchefResult<T>): asserts result is { ok: true; data: T } {
    if (!result.ok) {
        throw new Error(
            `Expected result.ok === true, got error: "${result.error}" (status ${result.statusCode.toString()})`,
        );
    }
}

/**
 * Asserts that a tchef result failed.
 * @param result - The result to validate.
 */
export function assertErr<T>(
    result: TchefResult<T>,
): asserts result is { ok: false; error: string; statusCode: number } {
    if (result.ok) {
        throw new Error(
            `Expected result.ok === false, but request succeeded with data: ${JSON.stringify(result.data)}`,
        );
    }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductsV3 from '../v3Api/Products/ProductsV3.ts';

// vi.mock is hoisted to the top of the file, so mockTchef must be declared
// with vi.hoisted() to be available inside the factory function.
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock('tchef', () => {
    return {
        default: mockTchef,
    };
});

function getCallUrl(callIndex: number): URL {
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

function makePageResponse(
    products: object[],
    currentPage: number,
    totalPages: number
) {
    return {
        ok: true,
        data: {
            data: products,
            meta: {
                pagination: {
                    total: products.length,
                    count: products.length,
                    per_page: 250,
                    current_page: currentPage,
                    total_pages: totalPages,
                    links: { previous: '', current: '', next: '' },
                },
            },
        },
    };
}

describe('ProductsV3', () => {
    let products: ProductsV3;

    beforeEach(() => {
        mockTchef.mockReset();
        products = new ProductsV3(
            'https://api.bigcommerce.com/stores/test-hash/v3/',
            'test-token'
        );
    });

    describe('getAllProducts — pagination', () => {
        it('fetches a single page when total_pages is 1', async () => {
            mockTchef.mockResolvedValue(
                makePageResponse([{ id: 1 }, { id: 2 }], 1, 1)
            );

            const result = await products.getAllProducts();

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }
            expect(result.data).toHaveLength(2);
            expect(mockTchef).toHaveBeenCalledTimes(1);
        });

        it('fetches all pages and concatenates results when total_pages > 1', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

            const result = await products.getAllProducts();

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }
            expect(result.data).toHaveLength(3);
            expect(mockTchef).toHaveBeenCalledTimes(3);
        });

        it('requests page=1 on first call, page=2 on second, page=3 on third', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

            await products.getAllProducts();

            expect(getCallUrl(0).searchParams.get('page')).toBe('1');
            expect(getCallUrl(1).searchParams.get('page')).toBe('2');
            expect(getCallUrl(2).searchParams.get('page')).toBe('3');
        });

        it('starts from the user-supplied page and uses the user-supplied limit', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

            const result = await products.getAllProducts({
                query: { page: 2, limit: 10 },
            });

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }
            expect(result.data).toHaveLength(2);
            expect(getCallUrl(0).searchParams.getAll('page')).toEqual(['2']);
            expect(getCallUrl(0).searchParams.getAll('limit')).toEqual(['10']);
            expect(getCallUrl(1).searchParams.getAll('page')).toEqual(['3']);
            expect(getCallUrl(1).searchParams.getAll('limit')).toEqual(['10']);
        });

        it('returns the error result immediately when a page fetch fails', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce({
                    ok: false,
                    error: 'Unauthorized',
                    statusCode: 401,
                });

            const result = await products.getAllProducts();

            expect(result.ok).toBe(false);
            if (result.ok) {
                return;
            }
            expect(result.statusCode).toBe(401);
            expect(mockTchef).toHaveBeenCalledTimes(2);
        });
    });

    describe('getAllProducts — includes', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
        });

        it('includes only keys with value true', async () => {
            await products.getAllProducts({
                includes: {
                    variants: true,
                    images: false,
                    custom_fields: true,
                },
            });

            const url = getCallUrl(0);
            const include = url.searchParams.get('include');
            expect(include).toContain('variants');
            expect(include).toContain('custom_fields');
            expect(include).not.toContain('images');
        });

        it('omits include param when all includes are false', async () => {
            await products.getAllProducts({
                includes: { variants: false, images: false },
            });

            const url = getCallUrl(0);
            expect(url.searchParams.has('include')).toBe(false);
        });

        it('includes sub-resources even when no query is provided', async () => {
            await products.getAllProducts({
                includes: { custom_fields: true },
            });

            const url = getCallUrl(0);
            expect(url.searchParams.get('include')).toBe('custom_fields');
        });

        it('omits include param when no includes provided', async () => {
            await products.getAllProducts({ query: { id: 1 } });

            const url = getCallUrl(0);
            expect(url.searchParams.has('include')).toBe(false);
        });
    });

    describe('getAllProducts — query params', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
        });

        it('adds query params to the URL', async () => {
            await products.getAllProducts({
                query: { id: 42, name: 'Widget' },
            });

            const url = getCallUrl(0);
            expect(url.searchParams.get('id')).toBe('42');
            expect(url.searchParams.get('name')).toBe('Widget');
        });

        it('URL-encodes query values with special characters', async () => {
            await products.getAllProducts({ query: { name: 'foo&bar=baz' } });

            const url = getCallUrl(0);
            expect(url.searchParams.get('name')).toBe('foo&bar=baz');
        });

        it('serializes id:in array as comma-separated string', async () => {
            await products.getAllProducts({ query: { 'id:in': [1, 2, 3] } });

            const url = getCallUrl(0);
            // URLSearchParams encodes : as %3A, but get() will decode it
            const idIn = url.searchParams.get('id:in');
            expect(idIn).toBe('1,2,3');
        });

        it('serializes id:not_in array as comma-separated string', async () => {
            await products.getAllProducts({ query: { 'id:not_in': [10, 20] } });

            const url = getCallUrl(0);
            expect(url.searchParams.get('id:not_in')).toBe('10,20');
        });

        it('handles empty options gracefully', async () => {
            const result = await products.getAllProducts();

            expect(result.ok).toBe(true);
            expect(mockTchef).toHaveBeenCalledTimes(1);
            const url = getCallUrl(0);
            expect(url.searchParams.get('page')).toBe('1');
            expect(url.searchParams.get('limit')).toBe('250');
        });

        it('does not duplicate user-supplied page and limit in the query string', async () => {
            await products.getAllProducts({
                query: { page: 3, limit: 25, name: 'Widget' },
            });

            const url = getCallUrl(0);
            expect(url.searchParams.getAll('page')).toEqual(['3']);
            expect(url.searchParams.getAll('limit')).toEqual(['25']);
            expect(url.searchParams.get('name')).toBe('Widget');
        });

        it('combines query params and includes in the same URL', async () => {
            await products.getAllProducts({
                includes: { images: true },
                query: { name: 'Test' },
            });

            const url = getCallUrl(0);
            expect(url.searchParams.get('name')).toBe('Test');
            expect(url.searchParams.get('include')).toBe('images');
        });
    });
});

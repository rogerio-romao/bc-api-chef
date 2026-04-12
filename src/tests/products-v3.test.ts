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

function getCallHeaders(callIndex: number): Record<string, string> {
    const call = mockTchef.mock.calls[callIndex];
    if (!call) {
        throw new Error(`No mock call at index ${callIndex}`);
    }
    const options = call[1] as { headers?: Record<string, string> };
    if (!options.headers) {
        throw new Error(`Call ${callIndex} has no headers`);
    }
    return options.headers;
}

function getCallOptions(callIndex: number): Record<string, unknown> {
    const call = mockTchef.mock.calls[callIndex];
    if (!call) {
        throw new Error(`No mock call at index ${callIndex}`);
    }
    return call[1] as Record<string, unknown>;
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

    describe('getAllProducts — request headers', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
        });

        it('sends the access token as X-Auth-Token', async () => {
            await products.getAllProducts();
            expect(getCallHeaders(0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await products.getAllProducts();
            expect(getCallHeaders(0).Accept).toBe('application/json');
        });
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
                query: { page: 2, limit: 50 },
            });

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }
            expect(result.data).toHaveLength(2);
            expect(getCallUrl(0).searchParams.getAll('page')).toEqual(['2']);
            expect(getCallUrl(0).searchParams.getAll('limit')).toEqual(['50']);
            expect(getCallUrl(1).searchParams.getAll('page')).toEqual(['3']);
            expect(getCallUrl(1).searchParams.getAll('limit')).toEqual(['50']);
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

    describe('deleteProduct', () => {
        it('makes exactly one HTTP call', async () => {
            mockTchef.mockResolvedValue({ ok: true, data: '' });
            await products.deleteProduct(42);
            expect(mockTchef).toHaveBeenCalledTimes(1);
        });

        it('uses the DELETE method', async () => {
            mockTchef.mockResolvedValue({ ok: true, data: '' });
            await products.deleteProduct(42);
            expect(getCallOptions(0).method).toBe('DELETE');
        });

        it('includes the product ID in the URL path', async () => {
            mockTchef.mockResolvedValue({ ok: true, data: '' });
            await products.deleteProduct(42);
            expect(getCallUrl(0).href).toContain('catalog/products/42');
        });

        it('sends the access token as X-Auth-Token', async () => {
            mockTchef.mockResolvedValue({ ok: true, data: '' });
            await products.deleteProduct(42);
            expect(getCallHeaders(0)['X-Auth-Token']).toBe('test-token');
        });

        it('uses responseFormat: text to handle the empty 204 body', async () => {
            mockTchef.mockResolvedValue({ ok: true, data: '' });
            await products.deleteProduct(42);
            expect(getCallOptions(0).responseFormat).toBe('text');
        });

        it('returns { ok: true, data: null } on success', async () => {
            mockTchef.mockResolvedValue({ ok: true, data: '' });
            const result = await products.deleteProduct(42);
            expect(result).toEqual({ ok: true, data: null });
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                ok: false,
                error: 'Not Found',
                statusCode: 404,
            });
            const result = await products.deleteProduct(999);
            expect(result.ok).toBe(false);
            if (result.ok) {
                return;
            }
            expect(result.statusCode).toBe(404);
            expect(result.error).toBe('Not Found');
        });
    });

    describe('getProduct', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue({
                ok: true,
                data: { data: { id: 42, name: 'Widget' } },
            });
        });

        it('makes exactly one HTTP call', async () => {
            await products.getProduct(42);
            expect(mockTchef).toHaveBeenCalledTimes(1);
        });

        it('includes the product ID in the URL path', async () => {
            await products.getProduct(42);
            expect(getCallUrl(0).href).toContain('catalog/products/42');
        });

        it('sends the access token as X-Auth-Token', async () => {
            await products.getProduct(42);
            expect(getCallHeaders(0)['X-Auth-Token']).toBe('test-token');
        });

        it('appends includes to the URL', async () => {
            await products.getProduct(42, { includes: { variants: true } });
            expect(getCallUrl(0).searchParams.get('include')).toBe('variants');
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                ok: false,
                error: 'Not Found',
                statusCode: 404,
            });
            const result = await products.getProduct(999);
            expect(result.ok).toBe(false);
            if (result.ok) {
                return;
            }
            expect(result.statusCode).toBe(404);
        });
    });

    describe('createProduct', () => {
        const minPayload = {
            name: 'Test Widget',
            type: 'physical' as const,
            weight: 1.5,
            price: 29.99,
        };

        const mockProduct = {
            id: 123,
            name: 'Test Widget',
            type: 'physical',
            weight: 1.5,
            price: 29.99,
        };

        beforeEach(() => {
            mockTchef.mockResolvedValue({
                ok: true,
                data: { data: mockProduct },
            });
        });

        it('makes exactly one HTTP call', async () => {
            await products.createProduct(minPayload);
            expect(mockTchef).toHaveBeenCalledTimes(1);
        });

        it('uses the POST method', async () => {
            await products.createProduct(minPayload);
            expect(getCallOptions(0).method).toBe('POST');
        });

        it('targets the catalog/products path (no ID in URL)', async () => {
            await products.createProduct(minPayload);
            const url = getCallUrl(0);
            expect(url.pathname).toMatch(/catalog\/products$/);
        });

        it('sends X-Auth-Token header', async () => {
            await products.createProduct(minPayload);
            expect(getCallHeaders(0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Content-Type: application/json header', async () => {
            await products.createProduct(minPayload);
            expect(getCallHeaders(0)['Content-Type']).toBe('application/json');
        });

        it('sends Accept: application/json header', async () => {
            await products.createProduct(minPayload);
            expect(getCallHeaders(0).Accept).toBe('application/json');
        });

        it('serializes the payload as a JSON string in the body', async () => {
            await products.createProduct(minPayload);
            const body = getCallOptions(0).body;
            expect(typeof body).toBe('string');
            expect(JSON.parse(body as string)).toEqual(minPayload);
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await products.createProduct(minPayload);
            expect(result).toEqual({ ok: true, data: mockProduct });
        });

        it('includes all optional fields in the body when provided', async () => {
            const fullPayload = {
                ...minPayload,
                sku: 'SKU-001',
                description: '<p>A widget</p>',
                width: 10,
                depth: 5,
                height: 3,
                inventory_level: 100,
                categories: [1, 2],
                is_visible: true,
                custom_fields: [{ name: 'material', value: 'steel' }],
                bulk_pricing_rules: [
                    { quantity_min: 10, quantity_max: 50, type: 'price' as const, amount: 2 },
                ],
                images: [{ image_url: 'https://example.com/img.jpg', is_thumbnail: true }],
                videos: [{ title: 'Demo', description: '', sort_order: 0, type: 'youtube' as const, video_id: 'abc123' }],
            };

            await products.createProduct(fullPayload);

            const body = JSON.parse(getCallOptions(0).body as string);
            expect(body).toEqual(fullPayload);
        });

        it('appends include_fields to the URL when provided', async () => {
            await products.createProduct(minPayload, {
                query: { include_fields: ['id', 'name'] as const },
            });

            const url = getCallUrl(0);
            const includeFields = url.searchParams.get('include_fields');
            expect(includeFields).toBe('id,name');
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                ok: false,
                error: 'Unprocessable Entity',
                statusCode: 422,
            });

            const result = await products.createProduct(minPayload);
            expect(result.ok).toBe(false);
            if (result.ok) {
                return;
            }
            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Unprocessable Entity');
        });
    });

    describe('getAllProducts -- limit clamping', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
        });

        it('clamps limit above 250 down to 250', async () => {
            await products.getAllProducts({ query: { limit: 500 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe('250');
        });

        it('clamps limit below 20 up to 20', async () => {
            await products.getAllProducts({ query: { limit: 1 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe('20');
        });

        it('passes through a limit within the valid range unchanged', async () => {
            await products.getAllProducts({ query: { limit: 100 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe('100');
        });

        it('uses 250 as the default when no limit is provided', async () => {
            await products.getAllProducts();
            expect(getCallUrl(0).searchParams.get('limit')).toBe('250');
        });

        it('passes through limit of exactly 20 (lower boundary) unchanged', async () => {
            await products.getAllProducts({ query: { limit: 20 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe('20');
        });

        it('passes through limit of exactly 250 (upper boundary) unchanged', async () => {
            await products.getAllProducts({ query: { limit: 250 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe('250');
        });
    });
});

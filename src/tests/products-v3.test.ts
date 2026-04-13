// oxlint-disable max-lines-per-function

import { DEFAULT_LIMIT, MAX_LIMIT, MIN_LIMIT } from '@/v3Api/constants.ts';
import ProductsV3 from '@/v3Api/Products/ProductsV3.ts';

import { assertErr, assertOk } from './helpers';

vi.setConfig({ testTimeout: 1000 });

// vi.mock is hoisted to the top of the file, so mockTchef must be declared
// with vi.hoisted() to be available inside the factory function.
// oxlint-disable-next-line vitest/require-mock-type-parameters -- tchef is generic; adding type params causes a TS error in the vi.mock factory
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

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

// oxlint-disable-next-line typescript/explicit-function-return-type
function makePageResponse(products: object[], currentPage: number, totalPages: number) {
    return {
        data: {
            data: products,
            meta: {
                pagination: {
                    count: products.length,
                    current_page: currentPage,
                    links: { current: '', next: '', previous: '' },
                    per_page: 250,
                    total: products.length,
                    total_pages: totalPages,
                },
            },
        },
        ok: true,
    };
}

describe('ProductsV3 class', () => {
    let products: ProductsV3;

    beforeEach(() => {
        mockTchef.mockReset();
        products = new ProductsV3('https://api.bigcommerce.com/stores/test-hash/v3/', 'test-token');
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
            mockTchef.mockResolvedValue(makePageResponse([{ id: 1 }, { id: 2 }], 1, 1));

            const result = await products.getAllProducts();

            assertOk(result);
            expect(result.data).toHaveLength(2);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('fetches all pages and concatenates results when total_pages > 1', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

            const result = await products.getAllProducts();

            assertOk(result);
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
                query: { limit: 50, page: 2 },
            });

            assertOk(result);
            expect(result.data).toHaveLength(2);
            expect(getCallUrl(0).searchParams.getAll('page')).toStrictEqual(['2']);
            expect(getCallUrl(0).searchParams.getAll('limit')).toStrictEqual(['50']);
            expect(getCallUrl(1).searchParams.getAll('page')).toStrictEqual(['3']);
            expect(getCallUrl(1).searchParams.getAll('limit')).toStrictEqual(['50']);
        });

        it('returns the error result immediately when a page fetch fails', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce({
                    error: 'Unauthorized',
                    ok: false,
                    statusCode: 401,
                });

            const result = await products.getAllProducts();

            assertErr(result);
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
                    custom_fields: true,
                    images: false,
                    variants: true,
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
                includes: { images: false, variants: false },
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
            expect(mockTchef).toHaveBeenCalledOnce();
            const url = getCallUrl(0);
            expect(url.searchParams.get('page')).toBe('1');
            expect(url.searchParams.get('limit')).toBe('250');
        });

        it('does not duplicate user-supplied page and limit in the query string', async () => {
            await products.getAllProducts({
                query: { limit: 25, name: 'Widget', page: 3 },
            });

            const url = getCallUrl(0);
            expect(url.searchParams.getAll('page')).toStrictEqual(['3']);
            expect(url.searchParams.getAll('limit')).toStrictEqual(['25']);
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
            mockTchef.mockResolvedValue({ data: '', ok: true });
            await products.deleteProduct(42);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the DELETE method', async () => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
            await products.deleteProduct(42);
            expect(getCallOptions(0).method).toBe('DELETE');
        });

        it('includes the product ID in the URL path', async () => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
            await products.deleteProduct(42);
            expect(getCallUrl(0).href).toContain('catalog/products/42');
        });

        it('sends the access token as X-Auth-Token', async () => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
            await products.deleteProduct(42);
            expect(getCallHeaders(0)['X-Auth-Token']).toBe('test-token');
        });

        it('uses responseFormat: text to handle the empty 204 body', async () => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
            await products.deleteProduct(42);
            expect(getCallOptions(0).responseFormat).toBe('text');
        });

        it('returns { ok: true, data: null } on success', async () => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
            const result = await products.deleteProduct(42);
            expect(result).toStrictEqual({ data: null, ok: true });
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });
            const result = await products.deleteProduct(999);
            assertErr(result);
            expect(result.statusCode).toBe(404);
            expect(result.error).toBe('Not Found');
        });
    });

    describe('getProduct', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue({
                data: { data: { id: 42, name: 'Widget' } },
                ok: true,
            });
        });

        it('makes exactly one HTTP call', async () => {
            await products.getProduct(42);
            expect(mockTchef).toHaveBeenCalledOnce();
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

        it('uses the GET method (or default)', async () => {
            await products.getProduct(42);
            const { method } = getCallOptions(0);
            expect([undefined, 'GET']).toContain(method);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });
            const result = await products.getProduct(999);
            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    // oxlint-disable-next-line max-statements
    describe('createProduct', () => {
        const minPayload = {
            name: 'Test Widget',
            price: 29.99,
            type: 'physical' as const,
            weight: 1.5,
        };

        const mockProduct = {
            id: 123,
            name: 'Test Widget',
            price: 29.99,
            type: 'physical',
            weight: 1.5,
        };

        beforeEach(() => {
            mockTchef.mockResolvedValue({
                data: { data: mockProduct },
                ok: true,
            });
        });

        it('makes exactly one HTTP call', async () => {
            await products.createProduct(minPayload);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the POST method', async () => {
            await products.createProduct(minPayload);
            expect(getCallOptions(0).method).toBe('POST');
        });

        it('targets the catalog/products path (no ID in URL)', async () => {
            await products.createProduct(minPayload);
            const url = getCallUrl(0);
            expect(url.pathname).toMatch(/catalog\/products$/u);
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
            const { body } = getCallOptions(0);
            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual(minPayload);
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await products.createProduct(minPayload);
            expect(result).toStrictEqual({ data: mockProduct, ok: true });
        });

        it('includes all optional fields in the body when provided', async () => {
            const fullPayload = {
                ...minPayload,
                bulk_pricing_rules: [
                    {
                        amount: 2,
                        quantity_max: 50,
                        quantity_min: 10,
                        type: 'price' as const,
                    },
                ],
                categories: [1, 2],
                custom_fields: [{ name: 'material', value: 'steel' }],
                depth: 5,
                description: '<p>A widget</p>',
                height: 3,
                images: [
                    {
                        image_url: 'https://example.com/img.jpg',
                        is_thumbnail: true,
                    },
                ],
                inventory_level: 100,
                is_visible: true,
                sku: 'SKU-001',
                videos: [
                    {
                        description: '',
                        sort_order: 0,
                        title: 'Demo',
                        type: 'youtube' as const,
                        video_id: 'abc123',
                    },
                ],
                width: 10,
            };

            await products.createProduct(fullPayload);

            const body: unknown = JSON.parse(getCallOptions(0).body as string);
            expect(body).toStrictEqual(fullPayload);
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
                error: 'Unprocessable Entity',
                ok: false,
                statusCode: 422,
            });

            const result = await products.createProduct(minPayload);
            assertErr(result);

            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Unprocessable Entity');
        });

        it('returns a 400 error without calling the API when name is empty', async () => {
            const result = await products.createProduct({
                ...minPayload,
                name: '',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Product name must not be empty');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when price is negative', async () => {
            const result = await products.createProduct({
                ...minPayload,
                price: -1,
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('price must be >= 0');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when weight exceeds maximum', async () => {
            const result = await products.createProduct({
                ...minPayload,
                weight: 10_000_000_000,
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('weight must be <= 9999999999');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when an optional string field exceeds its maxLength', async () => {
            const result = await products.createProduct({
                ...minPayload,
                upc: 'a'.repeat(33),
            });
            assertErr(result);

            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('upc must not exceed 32 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when an optional number field is out of range', async () => {
            const result = await products.createProduct({
                ...minPayload,
                tax_class_id: 256,
            });
            assertErr(result);

            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('tax_class_id must be <= 255');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when sort_order is below minimum', async () => {
            const result = await products.createProduct({
                ...minPayload,
                sort_order: -2_147_483_649,
            });
            assertErr(result);

            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('sort_order must be >= -2147483648');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when categories exceeds 1000 items', async () => {
            const result = await products.createProduct({
                ...minPayload,
                categories: Array.from({ length: 1001 }, (_, i) => i),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('categories must not contain more than 1000 items');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when custom_fields exceeds 200 items', async () => {
            const result = await products.createProduct({
                ...minPayload,
                custom_fields: Array.from({ length: 201 }, (_, i) => ({
                    name: `f${i}`,
                    value: 'v',
                })),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('custom_fields must not contain more than 200 items');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when a custom_field name is empty', async () => {
            const result = await products.createProduct({
                ...minPayload,
                custom_fields: [{ name: '', value: 'some value' }],
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('custom_fields[0].name must be between 1 and 250 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when a custom_field name exceeds 250 characters', async () => {
            const result = await products.createProduct({
                ...minPayload,
                custom_fields: [{ name: 'a'.repeat(251), value: 'some value' }],
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('custom_fields[0].name must be between 1 and 250 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when a custom_field value is empty', async () => {
            const result = await products.createProduct({
                ...minPayload,
                custom_fields: [{ name: 'ISBN', value: '' }],
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe(
                'custom_fields[0].value must be between 1 and 250 characters',
            );
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('reports the correct index when a later custom_field item is invalid', async () => {
            const result = await products.createProduct({
                ...minPayload,
                custom_fields: [
                    { name: 'valid', value: 'ok' },
                    { name: 'also valid', value: 'b'.repeat(251) },
                ],
            });
            assertErr(result);
            expect(result.error).toBe(
                'custom_fields[1].value must be between 1 and 250 characters',
            );
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when name exceeds 250 characters', async () => {
            const result = await products.createProduct({
                ...minPayload,
                name: 'a'.repeat(251),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Product name must not exceed 250 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when sku exceeds 255 characters', async () => {
            const result = await products.createProduct({
                ...minPayload,
                sku: 'a'.repeat(256),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('sku must not exceed 255 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts a sku of exactly 255 characters', async () => {
            const result = await products.createProduct({
                ...minPayload,
                sku: 'a'.repeat(255),
            });

            expect(result.ok).toBe(true);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('accepts an empty sku', async () => {
            const result = await products.createProduct({
                ...minPayload,
                sku: '',
            });

            expect(result.ok).toBe(true);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('accepts a name of exactly 250 characters', async () => {
            const result = await products.createProduct({
                ...minPayload,
                name: 'a'.repeat(250),
            });

            expect(result.ok).toBe(true);
            expect(mockTchef).toHaveBeenCalledOnce();
        });
    });

    // oxlint-disable-next-line max-statements
    describe('updateProduct', () => {
        const mockProduct = {
            id: 42,
            name: 'Updated Widget',
            price: 19.99,
            type: 'physical',
            weight: 2,
        };

        beforeEach(() => {
            mockTchef.mockResolvedValue({
                data: { data: mockProduct },
                ok: true,
            });
        });

        it('makes exactly one HTTP call', async () => {
            await products.updateProduct(42, { name: 'Updated Widget' });
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the PUT method', async () => {
            await products.updateProduct(42, { name: 'Updated Widget' });
            expect(getCallOptions(0).method).toBe('PUT');
        });

        it('includes the product ID in the URL path', async () => {
            await products.updateProduct(42, { name: 'Updated Widget' });
            expect(getCallUrl(0).href).toContain('catalog/products/42');
        });

        it('sends X-Auth-Token header', async () => {
            await products.updateProduct(42, {});
            expect(getCallHeaders(0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Content-Type: application/json header', async () => {
            await products.updateProduct(42, {});
            expect(getCallHeaders(0)['Content-Type']).toBe('application/json');
        });

        it('sends Accept: application/json header', async () => {
            await products.updateProduct(42, {});
            expect(getCallHeaders(0).Accept).toBe('application/json');
        });

        it('serializes the payload as a JSON string in the body', async () => {
            const payload = { name: 'New Name', price: 9.99 };
            await products.updateProduct(42, payload);
            const { body } = getCallOptions(0);
            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual(payload);
        });

        it('accepts an empty payload without error', async () => {
            const result = await products.updateProduct(42, {});
            expect(result.ok).toBe(true);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('accepts a payload missing name/price/weight/type', async () => {
            const result = await products.updateProduct(42, { sku: 'NEW-SKU' });
            expect(result.ok).toBe(true);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await products.updateProduct(42, {});
            expect(result).toStrictEqual({ data: mockProduct, ok: true });
        });

        it('appends include_fields to the URL when provided', async () => {
            await products.updateProduct(
                42,
                {},
                {
                    query: { include_fields: ['id', 'name'] as const },
                },
            );
            expect(getCallUrl(0).searchParams.get('include_fields')).toBe('id,name');
        });

        it('appends include param for sub-resources when provided', async () => {
            await products.updateProduct(
                42,
                {},
                {
                    includes: { variants: true },
                },
            );
            expect(getCallUrl(0).searchParams.get('include')).toBe('variants');
        });

        it('combines include_fields and include in the same URL', async () => {
            await products.updateProduct(
                42,
                {},
                {
                    includes: { images: true },
                    query: { include_fields: ['id', 'name'] as const },
                },
            );
            const url = getCallUrl(0);
            expect(url.searchParams.get('include')).toBe('images');
            expect(url.searchParams.get('include_fields')).toBe('id,name');
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });
            const result = await products.updateProduct(999, { name: 'Ghost' });
            assertErr(result);
            expect(result.statusCode).toBe(404);
            expect(result.error).toBe('Not Found');
        });

        it('returns a 400 error without calling the API when name is empty', async () => {
            const result = await products.updateProduct(42, { name: '' });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Product name must not be empty');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when name exceeds 250 characters', async () => {
            const result = await products.updateProduct(42, {
                name: 'a'.repeat(251),
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Product name must not exceed 250 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when price is negative', async () => {
            const result = await products.updateProduct(42, { price: -1 });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('price must be >= 0');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when weight exceeds maximum', async () => {
            const result = await products.updateProduct(42, {
                weight: 10_000_000_000,
            });
            assertErr(result);

            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('weight must be <= 9999999999');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when upc exceeds 32 characters', async () => {
            const result = await products.updateProduct(42, {
                upc: 'a'.repeat(33),
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('upc must not exceed 32 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when a custom_field is invalid', async () => {
            const result = await products.updateProduct(42, {
                custom_fields: [{ name: '', value: 'val' }],
            });
            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('custom_fields[0].name must be between 1 and 250 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });
    });

    describe('getAllProducts -- limit clamping', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
        });

        it(`clamps limit above ${MAX_LIMIT} down to ${MAX_LIMIT}`, async () => {
            await products.getAllProducts({ query: { limit: 500 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe(`${MAX_LIMIT}`);
        });

        it(`clamps limit below ${MIN_LIMIT} up to ${MIN_LIMIT}`, async () => {
            await products.getAllProducts({ query: { limit: 1 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe(`${MIN_LIMIT}`);
        });

        it('passes through a limit within the valid range unchanged', async () => {
            await products.getAllProducts({ query: { limit: 100 } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe('100');
        });

        it(`uses ${DEFAULT_LIMIT} as the default when no limit is provided`, async () => {
            await products.getAllProducts();
            expect(getCallUrl(0).searchParams.get('limit')).toBe(`${DEFAULT_LIMIT}`);
        });

        it(`passes through limit of exactly ${MIN_LIMIT} (lower boundary) unchanged`, async () => {
            await products.getAllProducts({ query: { limit: MIN_LIMIT } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe(`${MIN_LIMIT}`);
        });

        it(`passes through limit of exactly ${MAX_LIMIT} (upper boundary) unchanged`, async () => {
            await products.getAllProducts({ query: { limit: MAX_LIMIT } });
            expect(getCallUrl(0).searchParams.get('limit')).toBe(`${MAX_LIMIT}`);
        });
    });
});

// oxlint-disable max-lines-per-function

import {
    assertErr,
    assertOk,
    getCallHeaders,
    getCallOptions,
    getCallUrl,
    makePageResponse,
} from '@/tests/unit/helpers.ts';
import {
    DEFAULT_START_PAGE,
    PER_PAGE_DEFAULT,
    PER_PAGE_MAX,
    PER_PAGE_MIN,
} from '@/v3Api/constants.ts';
import ProductMetafields from '@/v3Api/Products/ProductMetafields';

// oxlint-disable-next-line vitest/require-mock-type-parameters -- tchef is generic; adding type params causes a TS error in the vi.mock factory
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

const BASE_URL = 'https://api.bigcommerce.com/stores/test-hash/v3/catalog/products';

const mockMetafield = {
    date_created: '2024-01-01T00:00:00+00:00',
    date_modified: '2024-01-01T00:00:00+00:00',
    description: '',
    id: 99,
    key: 'k',
    namespace: 'app',
    owner_client_id: 'client-abc',
    permission_set: 'read' as const,
    resource_id: 42,
    resource_type: 'product' as const,
    value: 'v',
};

const mockMetafieldEnvelope = {
    data: { data: mockMetafield },
    ok: true,
};

describe('ProductMetafields class', () => {
    let metafields: ProductMetafields;

    beforeEach(() => {
        mockTchef.mockReset();
        metafields = new ProductMetafields('test-token', BASE_URL);
    });

    describe('get one metafield', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(mockMetafieldEnvelope);
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await metafields.getOne(0, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is negative', async () => {
            const result = await metafields.getOne(-1, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await metafields.getOne(1.5, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when metafieldId is 0', async () => {
            const result = await metafields.getOne(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid metafieldId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when metafieldId is negative', async () => {
            const result = await metafields.getOne(42, -1);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid metafieldId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when metafieldId is a non-integer', async () => {
            const result = await metafields.getOne(42, 1.5);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid metafieldId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call', async () => {
            await metafields.getOne(42, 7);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('includes productId and metafieldId in the URL path', async () => {
            await metafields.getOne(42, 7);

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/metafields/7');
        });

        it('sends the access token as X-Auth-Token', async () => {
            await metafields.getOne(42, 7);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await metafields.getOne(42, 7);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('uses the GET method (or default)', async () => {
            await metafields.getOne(42, 7);

            const { method } = getCallOptions(mockTchef, 0);

            expect([undefined, 'GET']).toContain(method);
        });

        it('appends include_fields to the URL when provided', async () => {
            await metafields.getOne(42, 7, {
                include_fields: ['key', 'value'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe('key,value');
        });

        it('appends exclude_fields to the URL when provided', async () => {
            await metafields.getOne(42, 7, {
                exclude_fields: ['description'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe('description');
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await metafields.getOne(42, 7);

            assertOk(result);
            expect(result.data).toStrictEqual(mockMetafield);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await metafields.getOne(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('get multiple metafields', () => {
        describe('request headers', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it('sends the access token as X-Auth-Token', async () => {
                await metafields.getMultiple(42);

                expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
            });

            it('sends Accept: application/json', async () => {
                await metafields.getMultiple(42);

                expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
            });
        });

        describe('URL', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it('URL contains catalog/products/{productId}/metafields (no trailing id)', async () => {
                await metafields.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/metafields');
                expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/metafields$/u);
            });

            it('appends namespace filter param when provided', async () => {
                await metafields.getMultiple(42, { namespace: 'app' });

                expect(getCallUrl(mockTchef, 0).searchParams.get('namespace')).toBe('app');
            });

            it('appends key filter param when provided', async () => {
                await metafields.getMultiple(42, { key: 'my-key' });

                expect(getCallUrl(mockTchef, 0).searchParams.get('key')).toBe('my-key');
            });

            it('appends resource_id:in filter param when provided', async () => {
                await metafields.getMultiple(42, { 'resource_id:in': '1,2,3' });

                expect(getCallUrl(mockTchef, 0).searchParams.get('resource_id:in')).toBe('1,2,3');
            });

            it('appends include_fields to the URL when provided', async () => {
                await metafields.getMultiple(42, {
                    include_fields: ['key', 'value'],
                });

                expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe(
                    'key,value',
                );
            });

            it('appends exclude_fields to the URL when provided', async () => {
                await metafields.getMultiple(42, {
                    exclude_fields: ['description'],
                });

                expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe(
                    'description',
                );
            });

            it('does not duplicate user-supplied page and limit in the query string', async () => {
                await metafields.getMultiple(42, { limit: 25, page: 2 });

                const url = getCallUrl(mockTchef, 0);

                expect(url.searchParams.getAll('page')).toStrictEqual(['2']);
                expect(url.searchParams.getAll('limit')).toStrictEqual(['25']);
            });
        });

        describe('pagination', () => {
            it('fetches a single page when total_pages is 1', async () => {
                mockTchef.mockResolvedValue(
                    makePageResponse([mockMetafield, { ...mockMetafield, id: 2 }], 1, 1),
                );

                const result = await metafields.getMultiple(42);

                assertOk(result);
                expect(result.data).toHaveLength(2);
                expect(mockTchef).toHaveBeenCalledOnce();
            });

            it('fetches all pages and concatenates results when total_pages > 1', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

                const result = await metafields.getMultiple(42);

                assertOk(result);
                expect(result.data).toHaveLength(3);
                expect(mockTchef).toHaveBeenCalledTimes(3);
            });

            it('requests page=1 on first call, page=2 on second, page=3 on third', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

                await metafields.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe('1');
                expect(getCallUrl(mockTchef, 1).searchParams.get('page')).toBe('2');
                expect(getCallUrl(mockTchef, 2).searchParams.get('page')).toBe('3');
            });

            it('fetches only the user-supplied page and stops', async () => {
                mockTchef.mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3));

                const result = await metafields.getMultiple(42, { limit: 50, page: 2 });

                assertOk(result);
                expect(result.data).toHaveLength(1);
                expect(mockTchef).toHaveBeenCalledOnce();
                expect(getCallUrl(mockTchef, 0).searchParams.getAll('page')).toStrictEqual(['2']);
                expect(getCallUrl(mockTchef, 0).searchParams.getAll('limit')).toStrictEqual(['50']);
            });

            it('returns the error result immediately when a page fetch fails', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce({
                        error: 'Unauthorized',
                        ok: false,
                        statusCode: 401,
                    });

                const result = await metafields.getMultiple(42);

                assertErr(result);
                expect(result.statusCode).toBe(401);
                expect(mockTchef).toHaveBeenCalledTimes(2);
            });
        });

        describe('limit clamping', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it(`uses ${PER_PAGE_DEFAULT} as the default when no limit is provided`, async () => {
                await metafields.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(
                    `${PER_PAGE_DEFAULT}`,
                );
            });

            it(`clamps limit above ${PER_PAGE_MAX} down to ${PER_PAGE_MAX}`, async () => {
                await metafields.getMultiple(42, { limit: 500 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MAX}`);
            });

            it(`clamps limit below ${PER_PAGE_MIN} up to ${PER_PAGE_MIN}`, async () => {
                await metafields.getMultiple(42, { limit: 1 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MIN}`);
            });

            it('passes through a limit within the valid range unchanged', async () => {
                await metafields.getMultiple(42, { limit: 100 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe('100');
            });

            it(`requests page=${DEFAULT_START_PAGE} when no page is provided`, async () => {
                await metafields.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe(
                    `${DEFAULT_START_PAGE}`,
                );
            });
        });
    });

    // oxlint-disable-next-line max-statements
    describe('create metafield', () => {
        const minPayload = {
            key: 'my-key',
            namespace: 'my-namespace',
            permission_set: 'read' as const,
            value: 'my-value',
        };

        beforeEach(() => {
            mockTchef.mockResolvedValue(mockMetafieldEnvelope);
        });

        it('returns a 400 error without calling the API when productId is invalid', async () => {
            const result = await metafields.create(0, minPayload);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when namespace is missing', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                namespace: '',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when key is missing', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                key: '',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when value is missing', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                value: '',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when permission_set is missing', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                // @ts-expect-error intentionally omitting required field
                permission_set: '',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when key exceeds 64 characters', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                key: 'k'.repeat(65),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Key cannot exceed 64 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts a key of exactly 64 characters', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                key: 'k'.repeat(64),
            });

            assertOk(result);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('returns a 400 error when value exceeds 65535 characters', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                value: 'v'.repeat(65_536),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Value cannot exceed 65535 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts a value of exactly 65535 characters', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                value: 'v'.repeat(65_535),
            });

            assertOk(result);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('returns a 400 error when namespace exceeds 64 characters', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                namespace: 'n'.repeat(65),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Namespace cannot exceed 64 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when description exceeds 255 characters', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                description: 'd'.repeat(256),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Description cannot exceed 255 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts a description of exactly 255 characters', async () => {
            const result = await metafields.create(42, {
                ...minPayload,
                description: 'd'.repeat(255),
            });

            assertOk(result);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('makes exactly one HTTP call', async () => {
            await metafields.create(42, minPayload);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the POST method', async () => {
            await metafields.create(42, minPayload);

            expect(getCallOptions(mockTchef, 0).method).toBe('POST');
        });

        it('targets catalog/products/{productId}/metafields', async () => {
            await metafields.create(42, minPayload);

            expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/metafields$/u);
        });

        it('sends X-Auth-Token header', async () => {
            await metafields.create(42, minPayload);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Content-Type: application/json header', async () => {
            await metafields.create(42, minPayload);

            expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBe('application/json');
        });

        it('sends Accept: application/json header', async () => {
            await metafields.create(42, minPayload);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('serializes the payload as a JSON string in the body', async () => {
            await metafields.create(42, minPayload);

            const { body } = getCallOptions(mockTchef, 0);

            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual(minPayload);
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await metafields.create(42, minPayload);

            assertOk(result);
            expect(result.data).toStrictEqual(mockMetafield);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Unprocessable Entity',
                ok: false,
                statusCode: 422,
            });

            const result = await metafields.create(42, minPayload);

            assertErr(result);
            expect(result.statusCode).toBe(422);
        });
    });

    describe('update metafield', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(mockMetafieldEnvelope);
        });

        it('returns a 400 error without calling the API when productId is invalid', async () => {
            const result = await metafields.update(0, 7, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when metafieldId is invalid', async () => {
            const result = await metafields.update(42, 0, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid metafieldId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await metafields.update(1.5, 7, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when metafieldId is a non-integer', async () => {
            const result = await metafields.update(42, 1.5, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts an empty partial payload without error', async () => {
            const result = await metafields.update(42, 7, {});

            assertOk(result);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('returns a 400 error when key is an empty string', async () => {
            const result = await metafields.update(42, 7, { key: '' });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Key cannot be an empty string');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when value is an empty string', async () => {
            const result = await metafields.update(42, 7, { value: '' });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Value cannot be an empty string');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when namespace is an empty string', async () => {
            const result = await metafields.update(42, 7, { namespace: '' });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Namespace cannot be an empty string');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when namespace exceeds 64 characters', async () => {
            const result = await metafields.update(42, 7, {
                namespace: 'n'.repeat(65),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Namespace cannot exceed 64 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when key exceeds 64 characters', async () => {
            const result = await metafields.update(42, 7, { key: 'k'.repeat(65) });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Key cannot exceed 64 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when value exceeds 65535 characters', async () => {
            const result = await metafields.update(42, 7, {
                value: 'v'.repeat(65_536),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Value cannot exceed 65535 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when description exceeds 255 characters', async () => {
            const result = await metafields.update(42, 7, {
                description: 'd'.repeat(256),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Description cannot exceed 255 characters');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('uses the PUT method', async () => {
            await metafields.update(42, 7, {});

            expect(getCallOptions(mockTchef, 0).method).toBe('PUT');
        });

        it('includes productId and metafieldId in the URL path', async () => {
            await metafields.update(42, 7, {});

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/metafields/7');
        });

        it('sends X-Auth-Token header', async () => {
            await metafields.update(42, 7, {});

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Content-Type: application/json header', async () => {
            await metafields.update(42, 7, {});

            expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBe('application/json');
        });

        it('sends Accept: application/json header', async () => {
            await metafields.update(42, 7, {});

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('serializes the payload as a JSON string in the body', async () => {
            const payload = { value: 'new-value' };

            await metafields.update(42, 7, payload);

            const { body } = getCallOptions(mockTchef, 0);

            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual(payload);
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await metafields.update(42, 7, {});

            assertOk(result);
            expect(result.data).toStrictEqual(mockMetafield);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await metafields.update(42, 99_999, {});

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('delete metafield', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await metafields.remove(0, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await metafields.remove(1.5, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when metafieldId is 0', async () => {
            const result = await metafields.remove(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid metafieldId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when metafieldId is a non-integer', async () => {
            const result = await metafields.remove(42, 1.5);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call', async () => {
            await metafields.remove(42, 7);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the DELETE method', async () => {
            await metafields.remove(42, 7);

            expect(getCallOptions(mockTchef, 0).method).toBe('DELETE');
        });

        it('includes productId and metafieldId in the URL path', async () => {
            await metafields.remove(42, 7);

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/metafields/7');
        });

        it('sends the access token as X-Auth-Token', async () => {
            await metafields.remove(42, 7);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('uses responseFormat: text to handle the empty 204 body', async () => {
            await metafields.remove(42, 7);

            expect(getCallOptions(mockTchef, 0).responseFormat).toBe('text');
        });

        it('returns { ok: true, data: null } on success', async () => {
            const result = await metafields.remove(42, 7);

            expect(result).toStrictEqual({ data: null, ok: true });
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await metafields.remove(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('retries forwarding', () => {
        it('passes retries and retryDelayMs to the underlying HTTP call', async () => {
            mockTchef.mockResolvedValue(mockMetafieldEnvelope);

            await metafields.getOne(42, 99, { retries: { repeat: 2, retryDelay: 0 } });

            const opts = getCallOptions(mockTchef, 0);

            expect(opts.retries).toBe(2);
            expect(opts.retryDelayMs).toBe(0);
        });
    });
});

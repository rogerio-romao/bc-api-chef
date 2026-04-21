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
import ProductCustomFields from '@/v3Api/Products/ProductCustomFields.ts';

// oxlint-disable-next-line vitest/require-mock-type-parameters -- tchef is generic; adding type params causes a TS error in the vi.mock factory
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

const BASE_URL = 'https://api.bigcommerce.com/stores/test-hash/v3/catalog/products';

const mockCustomField = {
    id: 55,
    name: 'Material',
    value: 'Cotton',
};

const mockCustomFieldEnvelope = {
    data: { data: mockCustomField },
    ok: true,
};

describe('ProductCustomFields class', () => {
    let customFields: ProductCustomFields;

    beforeEach(() => {
        mockTchef.mockReset();
        customFields = new ProductCustomFields('test-token', BASE_URL, {});
    });

    describe('get one custom field', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(mockCustomFieldEnvelope);
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await customFields.getOne(0, 55);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when customFieldId is 0', async () => {
            const result = await customFields.getOne(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid customFieldId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call', async () => {
            await customFields.getOne(42, 55);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('includes productId and customFieldId in the URL path', async () => {
            await customFields.getOne(42, 55);

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/custom-fields/55');
        });

        it('sends the access token as X-Auth-Token', async () => {
            await customFields.getOne(42, 55);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await customFields.getOne(42, 55);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('appends include_fields to the URL when provided', async () => {
            await customFields.getOne(42, 55, {
                include_fields: ['name'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe('name');
        });

        it('appends exclude_fields to the URL when provided', async () => {
            await customFields.getOne(42, 55, {
                exclude_fields: ['value'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe('value');
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await customFields.getOne(42, 55);

            assertOk(result);
            expect(result.data).toStrictEqual(mockCustomField);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await customFields.getOne(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('get multiple custom fields', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
        });

        it('returns a 400 error without calling the API when productId is invalid', async () => {
            const result = await customFields.getMultiple(0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('sends the access token as X-Auth-Token', async () => {
            await customFields.getMultiple(42);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await customFields.getMultiple(42);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('URL contains catalog/products/{productId}/custom-fields', async () => {
            await customFields.getMultiple(42);

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/custom-fields');
            expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/custom-fields$/u);
        });

        it('appends include_fields to the URL when provided', async () => {
            await customFields.getMultiple(42, {
                include_fields: ['name'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe('name');
        });

        it('appends exclude_fields to the URL when provided', async () => {
            await customFields.getMultiple(42, {
                exclude_fields: ['value'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe('value');
        });

        it('does not duplicate user-supplied page and limit in the query string', async () => {
            await customFields.getMultiple(42, { limit: 25, page: 2 });

            const url = getCallUrl(mockTchef, 0);

            expect(url.searchParams.getAll('page')).toStrictEqual(['2']);
            expect(url.searchParams.getAll('limit')).toStrictEqual(['25']);
        });

        it('fetches a single page when total_pages is 1', async () => {
            mockTchef.mockResolvedValue(
                makePageResponse([mockCustomField, { ...mockCustomField, id: 56 }], 1, 1),
            );

            const result = await customFields.getMultiple(42);

            assertOk(result);
            expect(result.data).toHaveLength(2);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('fetches all pages and concatenates results when total_pages > 1', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

            const result = await customFields.getMultiple(42);

            assertOk(result);
            expect(result.data).toHaveLength(3);
            expect(mockTchef).toHaveBeenCalledTimes(3);
        });

        it('requests page=1 on first call, page=2 on second, page=3 on third', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

            await customFields.getMultiple(42);

            expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe('1');
            expect(getCallUrl(mockTchef, 1).searchParams.get('page')).toBe('2');
            expect(getCallUrl(mockTchef, 2).searchParams.get('page')).toBe('3');
        });

        it('fetches only the user-supplied page and stops', async () => {
            mockTchef.mockResolvedValueOnce(makePageResponse([{ id: 56 }], 2, 3));

            const result = await customFields.getMultiple(42, { limit: 50, page: 2 });

            assertOk(result);
            expect(result.data).toHaveLength(1);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('returns the error result immediately when a page fetch fails', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                .mockResolvedValueOnce({
                    error: 'Unauthorized',
                    ok: false,
                    statusCode: 401,
                });

            const result = await customFields.getMultiple(42);

            assertErr(result);
            expect(result.statusCode).toBe(401);
            expect(mockTchef).toHaveBeenCalledTimes(2);
        });

        it(`uses ${PER_PAGE_DEFAULT} as the default when no limit is provided`, async () => {
            await customFields.getMultiple(42);

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_DEFAULT}`);
        });

        it(`clamps limit above ${PER_PAGE_MAX} down to ${PER_PAGE_MAX}`, async () => {
            await customFields.getMultiple(42, { limit: 500 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MAX}`);
        });

        it(`clamps limit below ${PER_PAGE_MIN} up to ${PER_PAGE_MIN}`, async () => {
            await customFields.getMultiple(42, { limit: 1 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MIN}`);
        });

        it('passes through a limit within the valid range unchanged', async () => {
            await customFields.getMultiple(42, { limit: 100 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe('100');
        });

        it(`requests page=${DEFAULT_START_PAGE} when no page is provided`, async () => {
            await customFields.getMultiple(42);

            expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe(`${DEFAULT_START_PAGE}`);
        });
    });

    describe('create custom field', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(mockCustomFieldEnvelope);
        });

        it('returns a 400 error without calling the API when productId is invalid', async () => {
            const result = await customFields.create(0, {
                name: 'Material',
                value: 'Cotton',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when name is missing', async () => {
            const result = await customFields.create(42, {
                name: '',
                value: 'Cotton',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when value is missing', async () => {
            const result = await customFields.create(42, {
                name: 'Material',
                value: '',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when name exceeds 250 characters', async () => {
            const result = await customFields.create(42, {
                name: 'x'.repeat(251),
                value: 'Cotton',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Name cannot exceed 250 characters.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when value exceeds 250 characters', async () => {
            const result = await customFields.create(42, {
                name: 'Material',
                value: 'x'.repeat(251),
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Value cannot exceed 250 characters.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('sends a POST request to the custom-fields collection URL', async () => {
            await customFields.create(42, {
                name: 'Material',
                value: 'Cotton',
            });

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/custom-fields');
            expect(getCallOptions(mockTchef, 0).method).toBe('POST');
        });

        it('sends the payload in the request body', async () => {
            const payload = {
                name: 'Material',
                value: 'Cotton',
            };

            await customFields.create(42, payload);

            const { body } = getCallOptions(mockTchef, 0);

            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual(payload);
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await customFields.create(42, {
                name: 'Material',
                value: 'Cotton',
            });

            assertOk(result);
            expect(result.data).toStrictEqual(mockCustomField);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Bad Request',
                ok: false,
                statusCode: 400,
            });

            const result = await customFields.create(42, {
                name: 'Material',
                value: 'Cotton',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
        });
    });

    describe('update custom field', () => {
        const mockUpdatedCustomField = {
            ...mockCustomField,
            value: 'Silk',
        };

        beforeEach(() => {
            mockTchef.mockResolvedValue({
                data: { data: mockUpdatedCustomField },
                ok: true,
            });
        });

        it('returns a 400 error without calling the API when productId is invalid', async () => {
            const result = await customFields.update(0, 55, { value: 'Silk' });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when customFieldId is invalid', async () => {
            const result = await customFields.update(42, 0, { value: 'Silk' });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when neither name nor value is provided', async () => {
            const result = await customFields.update(42, 55, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe(
                'At least one of name or value must be provided to update a product custom field.',
            );
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts a value-only update payload', async () => {
            const result = await customFields.update(42, 55, { value: 'Silk' });

            assertOk(result);
            expect(result.data).toStrictEqual(mockUpdatedCustomField);

            const { body } = getCallOptions(mockTchef, 0);

            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual({
                value: 'Silk',
            });
        });

        it('accepts a name-only update payload', async () => {
            mockTchef.mockResolvedValue({
                data: {
                    data: {
                        ...mockCustomField,
                        name: 'Fabric',
                    },
                },
                ok: true,
            });

            const result = await customFields.update(42, 55, { name: 'Fabric' });

            assertOk(result);
            expect(result.data.name).toBe('Fabric');

            const { body } = getCallOptions(mockTchef, 0);

            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual({
                name: 'Fabric',
            });
        });

        it('returns a 400 error when the provided name is empty', async () => {
            const result = await customFields.update(42, 55, { name: '' });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when the provided value is empty', async () => {
            const result = await customFields.update(42, 55, { value: '' });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('sends a PUT request to the item URL', async () => {
            await customFields.update(42, 55, { value: 'Silk' });

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/custom-fields/55');
            expect(getCallOptions(mockTchef, 0).method).toBe('PUT');
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Conflict',
                ok: false,
                statusCode: 409,
            });

            const result = await customFields.update(42, 55, { value: 'Silk' });

            assertErr(result);
            expect(result.statusCode).toBe(409);
        });
    });

    describe('remove custom field', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue({
                data: null,
                ok: true,
            });
        });

        it('returns a 400 error without calling the API when productId is invalid', async () => {
            const result = await customFields.remove(0, 55);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when customFieldId is invalid', async () => {
            const result = await customFields.remove(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('sends a DELETE request to the item URL', async () => {
            await customFields.remove(42, 55);

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/custom-fields/55');
            expect(getCallOptions(mockTchef, 0).method).toBe('DELETE');
        });

        it('returns null data on success', async () => {
            const result = await customFields.remove(42, 55);

            assertOk(result);
            expect(result.data).toBeNull();
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await customFields.remove(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });
});

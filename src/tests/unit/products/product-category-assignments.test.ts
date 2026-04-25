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
import ProductCategoryAssignments from '@/v3Api/Products/ProductCategoryAssignments.ts';

// oxlint-disable-next-line vitest/require-mock-type-parameters -- tchef is generic; adding type params causes a TS error in the vi.mock factory
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

const BASE_URL = 'https://api.bigcommerce.com/stores/test-hash/v3/catalog/products';

const mockAssignment = {
    category_id: 10,
    product_id: 42,
};

describe('ProductCategoryAssignments class', () => {
    let categoryAssignments: ProductCategoryAssignments;

    beforeEach(() => {
        mockTchef.mockReset();
        categoryAssignments = new ProductCategoryAssignments('test-token', BASE_URL);
    });

    describe('upsert', () => {
        beforeEach(() => {
            // BC returns 204 No Content for PUT category-assignments
            mockTchef.mockResolvedValue({ data: '', ok: true });
        });

        it('makes exactly one HTTP call', async () => {
            await categoryAssignments.upsert([mockAssignment]);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the PUT method', async () => {
            await categoryAssignments.upsert([mockAssignment]);

            expect(getCallOptions(mockTchef, 0).method).toBe('PUT');
        });

        it('targets the category-assignments endpoint', async () => {
            await categoryAssignments.upsert([mockAssignment]);

            expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/category-assignments$/u);
        });

        it('sends the access token as X-Auth-Token', async () => {
            await categoryAssignments.upsert([mockAssignment]);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await categoryAssignments.upsert([mockAssignment]);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('sends Content-Type: application/json', async () => {
            await categoryAssignments.upsert([mockAssignment]);

            expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBe('application/json');
        });

        it('serializes the payload as JSON in the request body', async () => {
            await categoryAssignments.upsert([mockAssignment]);

            expect(getCallOptions(mockTchef, 0).body).toBe(JSON.stringify([mockAssignment]));
        });

        it('returns null data on success (BC returns 204 No Content)', async () => {
            const result = await categoryAssignments.upsert([mockAssignment]);

            assertOk(result);
            expect(result.data).toBeNull();
        });

        it('accepts multiple assignments in a single call without error', async () => {
            const second = { category_id: 20, product_id: 42 };

            const result = await categoryAssignments.upsert([mockAssignment, second]);

            assertOk(result);
            expect(result.data).toBeNull();
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({ error: 'Bad Request', ok: false, statusCode: 400 });

            const result = await categoryAssignments.upsert([mockAssignment]);

            assertErr(result);
            expect(result.statusCode).toBe(400);
        });

        it('forwards retries to the underlying HTTP call', async () => {
            await categoryAssignments.upsert([mockAssignment], {
                retries: { repeat: 2, retryDelay: 0 },
            });

            const opts = getCallOptions(mockTchef, 0);

            expect(opts.retries).toBe(2);
            expect(opts.retryDelayMs).toBe(0);
        });
    });

    describe('getMultiple', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(makePageResponse([mockAssignment]));
        });

        it('makes exactly one HTTP call when there is a single page', async () => {
            await categoryAssignments.getMultiple();

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('targets the category-assignments endpoint', async () => {
            await categoryAssignments.getMultiple();

            expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/category-assignments$/u);
        });

        it('sends the access token as X-Auth-Token', async () => {
            await categoryAssignments.getMultiple();

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await categoryAssignments.getMultiple();

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('returns the collected data array', async () => {
            const result = await categoryAssignments.getMultiple();

            assertOk(result);
            expect(result.data).toStrictEqual([mockAssignment]);
        });

        it('appends product_id:in to the query string when provided', async () => {
            await categoryAssignments.getMultiple({ 'product_id:in': 42 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('product_id:in')).toBe('42');
        });

        it('appends category_id:in to the query string when provided', async () => {
            await categoryAssignments.getMultiple({ 'category_id:in': 10 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('category_id:in')).toBe('10');
        });

        it('does not duplicate user-supplied page and limit in the query string', async () => {
            await categoryAssignments.getMultiple({ limit: 25, page: 2 });

            const url = getCallUrl(mockTchef, 0);

            expect(url.searchParams.getAll('page')).toStrictEqual(['2']);
            expect(url.searchParams.getAll('limit')).toStrictEqual(['25']);
        });

        it('fetches a single page when total_pages is 1', async () => {
            mockTchef.mockResolvedValue(
                makePageResponse([mockAssignment, { category_id: 20, product_id: 42 }], 1, 1),
            );

            const result = await categoryAssignments.getMultiple();

            assertOk(result);
            expect(result.data).toHaveLength(2);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('fetches all pages and concatenates results when total_pages > 1', async () => {
            mockTchef
                .mockResolvedValueOnce(
                    makePageResponse([{ category_id: 10, product_id: 42 }], 1, 3),
                )
                .mockResolvedValueOnce(
                    makePageResponse([{ category_id: 20, product_id: 42 }], 2, 3),
                )
                .mockResolvedValueOnce(
                    makePageResponse([{ category_id: 30, product_id: 42 }], 3, 3),
                );

            const result = await categoryAssignments.getMultiple();

            assertOk(result);
            expect(result.data).toHaveLength(3);
            expect(mockTchef).toHaveBeenCalledTimes(3);
        });

        it('requests page=1 on first call, page=2 on second, page=3 on third', async () => {
            mockTchef
                .mockResolvedValueOnce(
                    makePageResponse([{ category_id: 10, product_id: 42 }], 1, 3),
                )
                .mockResolvedValueOnce(
                    makePageResponse([{ category_id: 20, product_id: 42 }], 2, 3),
                )
                .mockResolvedValueOnce(
                    makePageResponse([{ category_id: 30, product_id: 42 }], 3, 3),
                );

            await categoryAssignments.getMultiple();

            expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe('1');
            expect(getCallUrl(mockTchef, 1).searchParams.get('page')).toBe('2');
            expect(getCallUrl(mockTchef, 2).searchParams.get('page')).toBe('3');
        });

        it('fetches only the user-supplied page and stops', async () => {
            mockTchef.mockResolvedValueOnce(makePageResponse([mockAssignment], 2, 5));

            const result = await categoryAssignments.getMultiple({ limit: 50, page: 2 });

            assertOk(result);
            expect(result.data).toHaveLength(1);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('returns the error result immediately when a page fetch fails', async () => {
            mockTchef
                .mockResolvedValueOnce(makePageResponse([mockAssignment], 1, 3))
                .mockResolvedValueOnce({ error: 'Unauthorized', ok: false, statusCode: 401 });

            const result = await categoryAssignments.getMultiple();

            assertErr(result);
            expect(result.statusCode).toBe(401);
            expect(mockTchef).toHaveBeenCalledTimes(2);
        });

        it(`uses ${PER_PAGE_DEFAULT} as the default when no limit is provided`, async () => {
            await categoryAssignments.getMultiple();

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_DEFAULT}`);
        });

        it(`clamps limit above ${PER_PAGE_MAX} down to ${PER_PAGE_MAX}`, async () => {
            await categoryAssignments.getMultiple({ limit: PER_PAGE_MAX + 50 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MAX}`);
        });

        it(`clamps limit below ${PER_PAGE_MIN} up to ${PER_PAGE_MIN}`, async () => {
            await categoryAssignments.getMultiple({ limit: 0 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MIN}`);
        });

        it('passes through a limit within the valid range unchanged', async () => {
            await categoryAssignments.getMultiple({ limit: 100 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe('100');
        });

        it(`requests page=${DEFAULT_START_PAGE} when no page is provided`, async () => {
            await categoryAssignments.getMultiple();

            expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe(`${DEFAULT_START_PAGE}`);
        });

        it('does not serialize retries into the query string', async () => {
            await categoryAssignments.getMultiple({ retries: { repeat: 2, retryDelay: 0 } });

            const opts = getCallOptions(mockTchef, 0);

            expect(opts.retries).toBe(2);
            expect(opts.retryDelayMs).toBe(0);
            expect(getCallUrl(mockTchef, 0).search).not.toContain('retries=');
        });
    });

    describe('remove', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
        });

        it('returns a 400 error without calling the API when no filter is provided', async () => {
            const result = await categoryAssignments.remove({});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call when product_id:in is provided', async () => {
            await categoryAssignments.remove({ 'product_id:in': 42 });

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('makes exactly one HTTP call when category_id:in is provided', async () => {
            await categoryAssignments.remove({ 'category_id:in': 10 });

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the DELETE method', async () => {
            await categoryAssignments.remove({ 'product_id:in': 42 });

            expect(getCallOptions(mockTchef, 0).method).toBe('DELETE');
        });

        it('targets the category-assignments endpoint', async () => {
            await categoryAssignments.remove({ 'product_id:in': 42 });

            expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/category-assignments$/u);
        });

        it('sends the access token as X-Auth-Token', async () => {
            await categoryAssignments.remove({ 'product_id:in': 42 });

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('appends product_id:in to the query string', async () => {
            await categoryAssignments.remove({ 'product_id:in': 42 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('product_id:in')).toBe('42');
        });

        it('appends category_id:in to the query string', async () => {
            await categoryAssignments.remove({ 'category_id:in': 10 });

            expect(getCallUrl(mockTchef, 0).searchParams.get('category_id:in')).toBe('10');
        });

        it('appends both filters when both are provided', async () => {
            await categoryAssignments.remove({ 'category_id:in': 10, 'product_id:in': 42 });

            const url = getCallUrl(mockTchef, 0);

            expect(url.searchParams.get('product_id:in')).toBe('42');
            expect(url.searchParams.get('category_id:in')).toBe('10');
        });

        it('returns null data on success', async () => {
            const result = await categoryAssignments.remove({ 'product_id:in': 42 });

            assertOk(result);
            expect(result.data).toBeNull();
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({ error: 'Not Found', ok: false, statusCode: 404 });

            const result = await categoryAssignments.remove({ 'product_id:in': 42 });

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });

        it('forwards retries to the underlying HTTP call', async () => {
            await categoryAssignments.remove({
                'product_id:in': 42,
                retries: { repeat: 1, retryDelay: 0 },
            });

            const opts = getCallOptions(mockTchef, 0);

            expect(opts.retries).toBe(1);
            expect(opts.retryDelayMs).toBe(0);
        });
    });
});

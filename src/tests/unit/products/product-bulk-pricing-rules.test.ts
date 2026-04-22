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
import ProductBulkPricingRules from '@/v3Api/Products/ProductBulkPricingRules';

// oxlint-disable-next-line vitest/require-mock-type-parameters -- tchef is generic; adding type params causes a TS error in the vi.mock factory
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

const BASE_URL = 'https://api.bigcommerce.com/stores/test-hash/v3/catalog/products';

const mockRule = {
    amount: 10,
    id: 123,
    quantity_max: 10,
    quantity_min: 1,
    type: 'price' as const,
};

const mockRuleEnvelope = {
    data: { data: mockRule },
    ok: true,
};

describe('ProductBulkPricingRules class', () => {
    let bulkPricingRules: ProductBulkPricingRules;

    beforeEach(() => {
        mockTchef.mockReset();
        bulkPricingRules = new ProductBulkPricingRules('test-token', BASE_URL, {});
    });

    // oxlint-disable-next-line max-statements
    describe('create bulk pricing rule', () => {
        const minPayload = {
            amount: 10,
            quantity_max: 10,
            quantity_min: 2,
            type: 'price' as const,
        };

        beforeEach(() => {
            mockTchef.mockResolvedValue(mockRuleEnvelope);
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await bulkPricingRules.create(0, minPayload);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is negative', async () => {
            const result = await bulkPricingRules.create(-1, minPayload);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await bulkPricingRules.create(1.5, minPayload);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when amount is missing', async () => {
            const result = await bulkPricingRules.create(42, {
                quantity_max: 10,
                quantity_min: 1,
                type: 'price',
            } as never);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Missing required field: amount');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when quantity_min is missing', async () => {
            const result = await bulkPricingRules.create(42, {
                amount: 10,
                quantity_max: 10,
                type: 'price',
            } as never);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Missing required field: quantity_min');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when quantity_max is missing', async () => {
            const result = await bulkPricingRules.create(42, {
                amount: 10,
                quantity_min: 1,
                type: 'price',
            } as never);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Missing required field: quantity_max');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when type is missing', async () => {
            const result = await bulkPricingRules.create(42, {
                amount: 10,
                quantity_max: 10,
                quantity_min: 1,
            } as never);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Missing required field: type');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when quantity_min is 0', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                quantity_min: 0,
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('quantity_min must be a positive integer');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when type is fixed and quantity_min is 1', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                quantity_min: 1,
                type: 'fixed',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('quantity_min must be at least 2 for fixed type rules');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when quantity_max is negative', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                quantity_max: -1,
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe(
                'quantity_max must be a positive integer or zero (for no maximum)',
            );
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when quantity_max is less than quantity_min', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                quantity_max: 2,
                quantity_min: 5,
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe(
                'quantity_max must be greater than or equal to quantity_min, or zero for no maximum',
            );
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when type is not a valid value', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                type: 'bogus' as never,
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe("type must be one of 'price', 'percent', or 'fixed'");
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when amount is not a number or string', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                amount: true as never,
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('amount must be a number or a string');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts quantity_max of 0 as the no-maximum sentinel', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                quantity_max: 0,
            });

            assertOk(result);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('accepts type fixed with quantity_min of 2', async () => {
            const result = await bulkPricingRules.create(42, {
                ...minPayload,
                quantity_min: 2,
                type: 'fixed',
            });

            assertOk(result);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('makes exactly one HTTP call', async () => {
            await bulkPricingRules.create(42, minPayload);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the POST method', async () => {
            await bulkPricingRules.create(42, minPayload);

            expect(getCallOptions(mockTchef, 0).method).toBe('POST');
        });

        it('targets catalog/products/{productId}/bulk-pricing-rules', async () => {
            await bulkPricingRules.create(42, minPayload);

            expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/bulk-pricing-rules$/u);
        });

        it('sends X-Auth-Token header', async () => {
            await bulkPricingRules.create(42, minPayload);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Content-Type: application/json header', async () => {
            await bulkPricingRules.create(42, minPayload);

            expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBe('application/json');
        });

        it('sends Accept: application/json header', async () => {
            await bulkPricingRules.create(42, minPayload);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('serializes the payload as a JSON string in the body', async () => {
            await bulkPricingRules.create(42, minPayload);

            const { body } = getCallOptions(mockTchef, 0);

            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual(minPayload);
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await bulkPricingRules.create(42, minPayload);

            assertOk(result);
            expect(result.data).toStrictEqual(mockRule);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Unprocessable Entity',
                ok: false,
                statusCode: 422,
            });

            const result = await bulkPricingRules.create(42, minPayload);

            assertErr(result);
            expect(result.statusCode).toBe(422);
        });
    });

    describe('get one bulk pricing rule', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(mockRuleEnvelope);
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await bulkPricingRules.getOne(0, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is negative', async () => {
            const result = await bulkPricingRules.getOne(-1, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await bulkPricingRules.getOne(1.5, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is 0', async () => {
            const result = await bulkPricingRules.getOne(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid ruleId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is negative', async () => {
            const result = await bulkPricingRules.getOne(42, -1);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is a non-integer', async () => {
            const result = await bulkPricingRules.getOne(42, 1.5);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call', async () => {
            await bulkPricingRules.getOne(42, 7);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('includes productId and ruleId in the URL path', async () => {
            await bulkPricingRules.getOne(42, 7);

            expect(getCallUrl(mockTchef, 0).href).toContain(
                'catalog/products/42/bulk-pricing-rules/7',
            );
        });

        it('sends the access token as X-Auth-Token', async () => {
            await bulkPricingRules.getOne(42, 7);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await bulkPricingRules.getOne(42, 7);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('uses the GET method (or default)', async () => {
            await bulkPricingRules.getOne(42, 7);

            const { method } = getCallOptions(mockTchef, 0);

            expect([undefined, 'GET']).toContain(method);
        });

        it('appends include_fields to the URL when provided', async () => {
            await bulkPricingRules.getOne(42, 7, {
                include_fields: ['amount', 'type'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe('amount,type');
        });

        it('appends exclude_fields to the URL when provided', async () => {
            await bulkPricingRules.getOne(42, 7, {
                exclude_fields: ['quantity_max'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe(
                'quantity_max',
            );
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await bulkPricingRules.getOne(42, 7);

            assertOk(result);
            expect(result.data).toStrictEqual(mockRule);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await bulkPricingRules.getOne(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('get multiple bulk pricing rules', () => {
        describe('ID validation', () => {
            it('returns a 400 error without calling the API when productId is 0', async () => {
                const result = await bulkPricingRules.getMultiple(0);

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(result.error).toBe('Invalid productId: must be a positive integer.');
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error without calling the API when productId is negative', async () => {
                const result = await bulkPricingRules.getMultiple(-1);

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error without calling the API when productId is a non-integer', async () => {
                const result = await bulkPricingRules.getMultiple(1.5);

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });
        });

        describe('request headers', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it('sends the access token as X-Auth-Token', async () => {
                await bulkPricingRules.getMultiple(42);

                expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
            });

            it('sends Accept: application/json', async () => {
                await bulkPricingRules.getMultiple(42);

                expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
            });
        });

        describe('URL', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it('URL contains catalog/products/{productId}/bulk-pricing-rules (no trailing id)', async () => {
                await bulkPricingRules.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).href).toContain(
                    'catalog/products/42/bulk-pricing-rules',
                );
                expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/bulk-pricing-rules$/u);
            });

            it('appends include_fields to the URL when provided', async () => {
                await bulkPricingRules.getMultiple(42, {
                    include_fields: ['amount', 'type'],
                });

                expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe(
                    'amount,type',
                );
            });

            it('appends exclude_fields to the URL when provided', async () => {
                await bulkPricingRules.getMultiple(42, {
                    exclude_fields: ['quantity_max'],
                });

                expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe(
                    'quantity_max',
                );
            });

            it('does not duplicate user-supplied page and limit in the query string', async () => {
                await bulkPricingRules.getMultiple(42, { limit: 25, page: 2 });

                const url = getCallUrl(mockTchef, 0);

                expect(url.searchParams.getAll('page')).toStrictEqual(['2']);
                expect(url.searchParams.getAll('limit')).toStrictEqual(['25']);
            });
        });

        describe('pagination', () => {
            it('fetches a single page when total_pages is 1', async () => {
                mockTchef.mockResolvedValue(
                    makePageResponse([mockRule, { ...mockRule, id: 2 }], 1, 1),
                );

                const result = await bulkPricingRules.getMultiple(42);

                assertOk(result);
                expect(result.data).toHaveLength(2);
                expect(mockTchef).toHaveBeenCalledOnce();
            });

            it('fetches all pages and concatenates results when total_pages > 1', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

                const result = await bulkPricingRules.getMultiple(42);

                assertOk(result);
                expect(result.data).toHaveLength(3);
                expect(mockTchef).toHaveBeenCalledTimes(3);
            });

            it('requests page=1 on first call, page=2 on second, page=3 on third', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

                await bulkPricingRules.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe('1');
                expect(getCallUrl(mockTchef, 1).searchParams.get('page')).toBe('2');
                expect(getCallUrl(mockTchef, 2).searchParams.get('page')).toBe('3');
            });

            it('fetches only the user-supplied page and stops', async () => {
                mockTchef.mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3));

                const result = await bulkPricingRules.getMultiple(42, { limit: 50, page: 2 });

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

                const result = await bulkPricingRules.getMultiple(42);

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
                await bulkPricingRules.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(
                    `${PER_PAGE_DEFAULT}`,
                );
            });

            it(`clamps limit above ${PER_PAGE_MAX} down to ${PER_PAGE_MAX}`, async () => {
                await bulkPricingRules.getMultiple(42, { limit: PER_PAGE_MAX + 50 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MAX}`);
            });

            it(`clamps limit below ${PER_PAGE_MIN} up to ${PER_PAGE_MIN}`, async () => {
                await bulkPricingRules.getMultiple(42, { limit: 0 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MIN}`);
            });

            it('passes through a limit within the valid range unchanged', async () => {
                await bulkPricingRules.getMultiple(42, { limit: 100 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe('100');
            });

            it(`requests page=${DEFAULT_START_PAGE} when no page is provided`, async () => {
                await bulkPricingRules.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe(
                    `${DEFAULT_START_PAGE}`,
                );
            });
        });
    });

    describe('update bulk pricing rule', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(mockRuleEnvelope);
        });

        it('accepts a sparse payload without applying create defaults', async () => {
            const payload = { type: 'fixed' } as const;

            const result = await bulkPricingRules.update(42, 7, payload);

            assertOk(result);
            expect(result.data).toStrictEqual(mockRule);
            expect(mockTchef).toHaveBeenCalledOnce();
            expect(getCallOptions(mockTchef, 0).body).toBe(JSON.stringify(payload));
        });

        it('returns a 400 error without calling the API when an invalid field is present', async () => {
            const result = await bulkPricingRules.update(42, 7, {
                type: 'bogus',
            } as never);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe("type must be one of 'price', 'percent', or 'fixed'");
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await bulkPricingRules.update(0, 7, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is negative', async () => {
            const result = await bulkPricingRules.update(-1, 7, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await bulkPricingRules.update(1.5, 7, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is 0', async () => {
            const result = await bulkPricingRules.update(42, 0, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid ruleId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is negative', async () => {
            const result = await bulkPricingRules.update(42, -1, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is a non-integer', async () => {
            const result = await bulkPricingRules.update(42, 1.5, {});

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('accepts an empty partial payload without error', async () => {
            const result = await bulkPricingRules.update(42, 7, {});

            assertOk(result);
            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('returns a 400 error when quantity_min is 0', async () => {
            const result = await bulkPricingRules.update(42, 7, { quantity_min: 0 });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('quantity_min must be a positive integer');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when type is fixed and quantity_min is 1', async () => {
            const result = await bulkPricingRules.update(42, 7, {
                quantity_min: 1,
                type: 'fixed',
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('quantity_min must be at least 2 for fixed type rules');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when quantity_max is negative', async () => {
            const result = await bulkPricingRules.update(42, 7, { quantity_max: -1 });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe(
                'quantity_max must be a positive integer or zero (for no maximum)',
            );
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when quantity_max is less than quantity_min', async () => {
            const result = await bulkPricingRules.update(42, 7, {
                quantity_max: 2,
                quantity_min: 5,
            });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe(
                'quantity_max must be greater than or equal to quantity_min, or zero for no maximum',
            );
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error when amount is not a number or string', async () => {
            const result = await bulkPricingRules.update(42, 7, { amount: true as never });

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('amount must be a number or a string');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('uses the PUT method', async () => {
            await bulkPricingRules.update(42, 7, {});

            expect(getCallOptions(mockTchef, 0).method).toBe('PUT');
        });

        it('includes productId and ruleId in the URL path', async () => {
            await bulkPricingRules.update(42, 7, {});

            expect(getCallUrl(mockTchef, 0).href).toContain(
                'catalog/products/42/bulk-pricing-rules/7',
            );
        });

        it('sends X-Auth-Token header', async () => {
            await bulkPricingRules.update(42, 7, {});

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Content-Type: application/json header', async () => {
            await bulkPricingRules.update(42, 7, {});

            expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBe('application/json');
        });

        it('sends Accept: application/json header', async () => {
            await bulkPricingRules.update(42, 7, {});

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('serializes the payload as a JSON string in the body', async () => {
            const payload = { amount: '5.00' };

            await bulkPricingRules.update(42, 7, payload);

            const { body } = getCallOptions(mockTchef, 0);

            expect(body).toBeTypeOf('string');
            expect(JSON.parse(body as string)).toStrictEqual(payload);
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await bulkPricingRules.update(42, 7, {});

            assertOk(result);
            expect(result.data).toStrictEqual(mockRule);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await bulkPricingRules.update(42, 99_999, {});

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('remove bulk pricing rule', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await bulkPricingRules.remove(0, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await bulkPricingRules.remove(1.5, 7);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is 0', async () => {
            const result = await bulkPricingRules.remove(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid ruleId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when ruleId is a non-integer', async () => {
            const result = await bulkPricingRules.remove(42, 1.5);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call', async () => {
            await bulkPricingRules.remove(42, 7);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the DELETE method', async () => {
            await bulkPricingRules.remove(42, 7);

            expect(getCallOptions(mockTchef, 0).method).toBe('DELETE');
        });

        it('includes productId and ruleId in the URL path', async () => {
            await bulkPricingRules.remove(42, 7);

            expect(getCallUrl(mockTchef, 0).href).toContain(
                'catalog/products/42/bulk-pricing-rules/7',
            );
        });

        it('sends the access token as X-Auth-Token', async () => {
            await bulkPricingRules.remove(42, 7);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('uses responseFormat: text to handle the empty 204 body', async () => {
            await bulkPricingRules.remove(42, 7);

            expect(getCallOptions(mockTchef, 0).responseFormat).toBe('text');
        });

        it('returns { ok: true, data: null } on success', async () => {
            const result = await bulkPricingRules.remove(42, 7);

            expect(result).toStrictEqual({ data: null, ok: true });
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await bulkPricingRules.remove(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });
});

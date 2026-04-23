// oxlint-disable max-lines-per-function

import { assertErr, assertOk, makePageResponse } from '@/tests/unit/helpers.ts';
import ProductsV3 from '@/v3Api/Products/Products';

import type { StandardSchemaV1 } from '@/types/api-types.ts';

// oxlint-disable-next-line vitest/require-mock-type-parameters -- tchef is generic; adding type params causes a TS error in the vi.mock factory
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

/**
 * Builds a StandardSchemaV1 that always succeeds.
 * @returns {StandardSchemaV1} A passing schema.
 */
function makePassingSchema(): StandardSchemaV1 {
    return {
        '~standard': {
            validate: (value) => ({ value }),
            vendor: 'test',
            version: 1,
        },
    };
}

/**
 * Builds a StandardSchemaV1 that always fails with the given message.
 * @param message - The failure message.
 * @returns {StandardSchemaV1} A failing schema.
 */
function makeFailingSchema(message = 'invalid data'): StandardSchemaV1 {
    return {
        '~standard': {
            validate: () => ({ issues: [{ message }] }),
            vendor: 'test',
            version: 1,
        },
    };
}

/**
 * Builds a StandardSchemaV1 that fails only on the nth call (1-based).
 * @param n - The call number on which to fail.
 * @param message - The failure message.
 * @returns {StandardSchemaV1} A schema that fails on the nth invocation.
 */
function makeFailingOnNthCallSchema(n: number, message = 'invalid item'): StandardSchemaV1 {
    let calls = 0;
    return {
        '~standard': {
            validate: (value) => {
                calls += 1;
                if (calls === n) {
                    return { issues: [{ message }] };
                }
                return { value };
            },
            vendor: 'test',
            version: 1,
        },
    };
}

describe('schema validation', () => {
    let products: ProductsV3;

    beforeEach(() => {
        mockTchef.mockReset();
        products = new ProductsV3('https://api.bigcommerce.com/stores/test-hash/v3/', 'test-token');
    });

    describe('getOne — schema option', () => {
        const productData = { id: 1, name: 'Widget' };

        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: { data: productData }, ok: true });
        });

        it('returns data when a passing schema is provided', async () => {
            const result = await products.getOne(1, { schema: makePassingSchema() });

            assertOk(result);
            expect(result.data).toStrictEqual(productData);
        });

        it('returns a 422 error when a failing schema is provided', async () => {
            const result = await products.getOne(1, { schema: makeFailingSchema('bad field') });

            assertErr(result);
            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Schema validation failed: bad field');
        });

        it('still makes exactly one HTTP call even when schema fails', async () => {
            await products.getOne(1, { schema: makeFailingSchema() });

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('returns data unchanged when no schema is provided', async () => {
            const result = await products.getOne(1);

            assertOk(result);
            expect(result.data).toStrictEqual(productData);
        });
    });

    describe('getMultiple — schema option', () => {
        const items = [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' },
        ];

        it('returns all items when a passing schema is provided', async () => {
            mockTchef.mockResolvedValue(makePageResponse(items));

            const result = await products.getMultiple({ schema: makePassingSchema() });

            assertOk(result);
            expect(result.data).toHaveLength(3);
        });

        it('returns a 422 error immediately when schema fails on the first item', async () => {
            mockTchef.mockResolvedValue(makePageResponse(items));

            const result = await products.getMultiple({ schema: makeFailingSchema('bad item') });

            assertErr(result);
            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Schema validation failed: bad item');
        });

        it('returns a 422 error when schema fails on a later item in the same page', async () => {
            mockTchef.mockResolvedValue(makePageResponse(items));

            const result = await products.getMultiple({
                schema: makeFailingOnNthCallSchema(2, 'second item invalid'),
            });

            assertErr(result);
            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Schema validation failed: second item invalid');
        });

        it('does not fetch subsequent pages when schema fails on page 1', async () => {
            const [first, second] = items;
            assert(first, 'Expected at least two items in the test data');
            assert(second, 'Expected at least two items in the test data');

            // Page 1 returns 2 items, page 2 would return more.
            mockTchef.mockResolvedValue(makePageResponse([first, second], 1, 2));

            await products.getMultiple({ schema: makeFailingSchema() });

            // Should have stopped after page 1 — only one HTTP call.
            expect(mockTchef).toHaveBeenCalledOnce();
        });
    });

    describe('create — schema option', () => {
        const createdProduct = { id: 99, name: 'New Product', type: 'physical', weight: 1 };

        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: { data: createdProduct }, ok: true });
        });

        it('returns created data when a passing schema is provided', async () => {
            const result = await products.create(
                { name: 'New Product', price: 10, type: 'physical', weight: 1 },
                { schema: makePassingSchema() },
            );

            assertOk(result);
            expect(result.data).toStrictEqual(createdProduct);
        });

        it('returns a 422 error when a failing schema is provided', async () => {
            const result = await products.create(
                { name: 'New Product', price: 10, type: 'physical', weight: 1 },
                { schema: makeFailingSchema('unexpected field') },
            );

            assertErr(result);
            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Schema validation failed: unexpected field');
        });
    });

    describe('update — schema option', () => {
        const updatedProduct = { id: 1, name: 'Updated Widget', type: 'physical', weight: 2 };

        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: { data: updatedProduct }, ok: true });
        });

        it('returns updated data when a passing schema is provided', async () => {
            const result = await products.update(
                1,
                { name: 'Updated Widget' },
                { schema: makePassingSchema() },
            );

            assertOk(result);
            expect(result.data).toStrictEqual(updatedProduct);
        });

        it('returns a 422 error when a failing schema is provided', async () => {
            const result = await products.update(
                1,
                { name: 'Updated Widget' },
                { schema: makeFailingSchema('wrong shape') },
            );

            assertErr(result);
            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Schema validation failed: wrong shape');
        });
    });

    describe('async schema support', () => {
        it('awaits an async schema and returns data when it passes', async () => {
            mockTchef.mockResolvedValue({ data: { data: { id: 1, name: 'Widget' } }, ok: true });

            const asyncPassingSchema: StandardSchemaV1 = {
                '~standard': {
                    validate: (value) => Promise.resolve({ value }),
                    vendor: 'test',
                    version: 1,
                },
            };

            const result = await products.getOne(1, { schema: asyncPassingSchema });

            assertOk(result);
            expect(result.data).toStrictEqual({ id: 1, name: 'Widget' });
        });

        it('awaits an async schema and returns 422 when it fails', async () => {
            mockTchef.mockResolvedValue({ data: { data: { id: 1 } }, ok: true });

            const asyncFailingSchema: StandardSchemaV1 = {
                '~standard': {
                    validate: () => Promise.resolve({ issues: [{ message: 'async fail' }] }),
                    vendor: 'test',
                    version: 1,
                },
            };

            const result = await products.getOne(1, { schema: asyncFailingSchema });

            assertErr(result);
            expect(result.statusCode).toBe(422);
            expect(result.error).toBe('Schema validation failed: async fail');
        });
    });
});

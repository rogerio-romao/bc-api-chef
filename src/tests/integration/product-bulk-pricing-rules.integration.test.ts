/**
 * Integration tests — hit the real BigCommerce API.
 *
 * Run with: pnpm test:integration
 * Requires a valid .env file with STORE_HASH and ACCESS_TOKEN.
 *
 * These tests are intentionally NOT run in CI. They verify that bulk pricing rule CRUD
 * works end-to-end against the real API, including auth headers, URL construction,
 * and field narrowing — things unit tests with mocked HTTP cannot confirm.
 *
 * Each run uses a timestamp-derived quantity range to avoid collisions with prior
 * failed runs or concurrent executions (BigCommerce rejects overlapping ranges).
 */

import BcApiChef from '@/BcApiChef.ts';
import { ACCESS_TOKEN, STORE_HASH } from '@/config.ts';
import { assertErr, assertOk } from '@/tests/unit/helpers.ts';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// [Sample] Smith Journal 13 at the BC dev sandbox store
const TEST_PRODUCT_ID = 111;

// oxlint-disable-next-line max-lines-per-function
describe.runIf(hasCredentials)('ProductBulkPricingRules API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);
    const createdIds: number[] = [];

    // Derive a non-overlapping quantity range from the current timestamp.
    // BC rejects rules with overlapping quantity_min/quantity_max ranges on the same product.
    // Combine timestamp with random offset to reduce collision likelihood
    const base = (Date.now() % 900) * 10 + Math.floor(Math.random() * 10) + 2;
    const TEST_QUANTITY_MIN = base;
    const TEST_QUANTITY_MAX = base + 8;

    afterAll(async () => {
        for (const id of createdIds) {
            await client
                .v3()
                .products()
                .bulkPricingRules()
                .remove(TEST_PRODUCT_ID, id)
                .catch(() => {
                    // noop: ignore errors for already-deleted rules
                });
        }
    });

    describe('create', () => {
        it('creates a bulk pricing rule with the minimum required payload', async () => {
            const result = await client.v3().products().bulkPricingRules().create(TEST_PRODUCT_ID, {
                amount: 5,
                quantity_max: TEST_QUANTITY_MAX,
                quantity_min: TEST_QUANTITY_MIN,
                type: 'price',
            });

            assertOk(result);
            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.quantity_min).toBe(TEST_QUANTITY_MIN);
            expect(result.data.quantity_max).toBe(TEST_QUANTITY_MAX);
            expect(result.data.type).toBe('price');

            createdIds.push(result.data.id);
        });
    });

    describe('getOne', () => {
        it('fetches the created rule by id and returns correct fields', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a rule ID from the create test');

            const result = await client
                .v3()
                .products()
                .bulkPricingRules()
                .getOne(TEST_PRODUCT_ID, id);

            assertOk(result);
            expect(result.data.id).toBe(id);
            expect(result.data.quantity_min).toBe(TEST_QUANTITY_MIN);
            expect(result.data.quantity_max).toBe(TEST_QUANTITY_MAX);
        });

        it('returns only the requested fields when include_fields is provided', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a rule ID from the create test');

            const result = await client
                .v3()
                .products()
                .bulkPricingRules()
                .getOne(TEST_PRODUCT_ID, id, {
                    include_fields: ['amount'] as const,
                });

            assertOk(result);
            expect(result.data.amount).toBeDefined();
            // @ts-expect-error quantity_max is not in the narrowed type
            expect(result.data.quantity_max).toBeUndefined();
        });
    });

    describe('getMultiple', () => {
        it('returns rules for the product including the created one', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a rule ID from the create test');

            const result = await client
                .v3()
                .products()
                .bulkPricingRules()
                .getMultiple(TEST_PRODUCT_ID);

            assertOk(result);
            expect(result.data.length).toBeGreaterThanOrEqual(1);

            const ids = result.data.map((r) => r.id);

            expect(ids).toContain(id);
        });

        it('returns at most one item per page when limit=1 and page=1', async () => {
            const result = await client
                .v3()
                .products()
                .bulkPricingRules()
                .getMultiple(TEST_PRODUCT_ID, { limit: 1, page: 1 });

            assertOk(result);
            expect(result.data.length).toBeLessThanOrEqual(1);
        });
    });

    describe('update', () => {
        it('updates the amount of the created rule and returns the updated resource', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a rule ID from the create test');

            const result = await client
                .v3()
                .products()
                .bulkPricingRules()
                .update(TEST_PRODUCT_ID, id, { amount: 7 });

            assertOk(result);
            expect(result.data.id).toBe(id);
            // BC may return amount as a string — compare numerically
            expect(Number(result.data.amount)).toBe(7);
        });
    });

    describe('remove', () => {
        it('deletes the created rule and a subsequent getOne returns not-found', async () => {
            const id = createdIds.pop();
            assert(id, 'Expected a rule ID from the create test');

            const deleteResult = await client
                .v3()
                .products()
                .bulkPricingRules()
                .remove(TEST_PRODUCT_ID, id);

            assertOk(deleteResult);
            expect(deleteResult.data).toBeNull();

            // Confirm the rule is truly gone server-side
            const fetchResult = await client
                .v3()
                .products()
                .bulkPricingRules()
                .getOne(TEST_PRODUCT_ID, id);

            assertErr(fetchResult);
        });
    });
});

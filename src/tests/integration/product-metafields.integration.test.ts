/**
 * Integration tests — hit the real BigCommerce API.
 *
 * Run with: pnpm test:integration
 * Requires a valid .env file with STORE_HASH and ACCESS_TOKEN.
 *
 * These tests are intentionally NOT run in CI. They verify that metafield CRUD
 * works end-to-end against the real API, including auth headers, URL construction,
 * and pagination — things unit tests with mocked HTTP cannot confirm.
 *
 * All metafields created here are scoped to a unique namespace derived from
 * `Date.now()` so concurrent runs don't interfere with each other.
 */

import BcApiChef from '@/BcApiChef.ts';
import { ACCESS_TOKEN, STORE_HASH } from '@/config.ts';
import { assertOk } from '@/tests/unit/helpers.ts';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// [Sample] Smith Journal 13 at the BC dev sandbox store
const TEST_PRODUCT_ID = 111;

// oxlint-disable-next-line max-lines-per-function
describe.runIf(hasCredentials)('ProductMetafields API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);
    const createdIds: number[] = [];
    const suffix = Date.now();
    const TEST_NAMESPACE = `bc-api-chef-test-${suffix.toString()}`;

    afterAll(async () => {
        for (const id of createdIds) {
            await client
                .v3()
                .products()
                .metafields()
                .remove(TEST_PRODUCT_ID, id)
                .catch(() => {
                    // noop: ignore errors for already-deleted metafields
                });
        }
    });

    describe('createMetafield', () => {
        it('creates the first metafield with the minimum required payload', async () => {
            const result = await client
                .v3()
                .products()
                .metafields()
                .create(TEST_PRODUCT_ID, {
                    key: `key-1-${suffix.toString()}`,
                    namespace: TEST_NAMESPACE,
                    permission_set: 'write',
                    value: 'value-1',
                });

            assertOk(result);
            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.namespace).toBe(TEST_NAMESPACE);
            expect(result.data.value).toBe('value-1');
            expect(result.data.resource_type).toBe('product');
            expect(result.data.resource_id).toBe(TEST_PRODUCT_ID);

            createdIds.push(result.data.id);
        });

        it('creates a second metafield so getMetafields has multiple rows', async () => {
            const result = await client
                .v3()
                .products()
                .metafields()
                .create(TEST_PRODUCT_ID, {
                    description: 'integration test description',
                    key: `key-2-${suffix.toString()}`,
                    namespace: TEST_NAMESPACE,
                    permission_set: 'write',
                    value: 'value-2',
                });

            assertOk(result);
            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.key).toBe(`key-2-${suffix.toString()}`);

            createdIds.push(result.data.id);
        });
    });

    describe('getMetafield', () => {
        it('fetches the first created metafield by id and returns correct fields', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a metafield ID from the createMetafield test');

            const result = await client.v3().products().metafields().getOne(TEST_PRODUCT_ID, id);

            assertOk(result);
            expect(result.data.id).toBe(id);
            expect(result.data.namespace).toBe(TEST_NAMESPACE);
            expect(result.data.value).toBe('value-1');
        });

        it('returns only the requested fields when include_fields is provided', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a metafield ID from the createMetafield test');

            const result = await client
                .v3()
                .products()
                .metafields()
                .getOne(TEST_PRODUCT_ID, id, {
                    include_fields: ['key', 'value'],
                });

            assertOk(result);
            // @ts-expect-error key is present at runtime but the narrowed type only has key+value
            expect(result.data.namespace).toBeUndefined();
            expect(result.data.key).toBeTypeOf('string');
            expect(result.data.value).toBeTypeOf('string');
        });
    });

    describe('getMetafields', () => {
        it('returns all metafields for the product including both created ones', async () => {
            const result = await client
                .v3()
                .products()
                .metafields()
                .getMultiple(TEST_PRODUCT_ID, { namespace: TEST_NAMESPACE });

            assertOk(result);
            expect(result.data.length).toBeGreaterThanOrEqual(2);

            const ids = result.data.map((m) => m.id);

            expect(ids).toContain(createdIds[0]);
            expect(ids).toContain(createdIds[1]);
        });
    });

    describe('updateMetafield', () => {
        it('updates the value of the first metafield and returns the updated resource', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a metafield ID from the createMetafield test');

            const result = await client
                .v3()
                .products()
                .metafields()
                .update(TEST_PRODUCT_ID, id, { value: 'value-1-updated' });

            assertOk(result);
            expect(result.data.id).toBe(id);
            expect(result.data.value).toBe('value-1-updated');
        });
    });

    describe('deleteMetafield', () => {
        it('deletes the second metafield and a subsequent getMetafield returns not-found', async () => {
            const id = createdIds.pop();
            assert(id, 'Expected a metafield ID from the createMetafield test');

            const deleteResult = await client
                .v3()
                .products()
                .metafields()
                .remove(TEST_PRODUCT_ID, id);

            assertOk(deleteResult);
            expect(deleteResult.data).toBeNull();

            // Confirm the metafield is truly gone server-side
            const fetchResult = await client
                .v3()
                .products()
                .metafields()
                .getOne(TEST_PRODUCT_ID, id);

            expect(fetchResult.ok).toBe(false);
        });
    });
});

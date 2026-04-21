/**
 * Integration tests — hit the real BigCommerce API.
 *
 * Run with: pnpm test:integration
 * Requires a valid .env file with STORE_HASH and ACCESS_TOKEN.
 *
 * These tests verify the custom field CRUD flow end-to-end against the real API,
 * including auth headers, URL construction, pagination, and field narrowing.
 */

import BcApiChef from '@/BcApiChef.ts';
import { ACCESS_TOKEN, STORE_HASH } from '@/config.ts';
import { assertOk } from '@/tests/unit/helpers.ts';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// [Sample] Smith Journal 13 at the BC dev sandbox store
const TEST_PRODUCT_ID = 111;

// oxlint-disable-next-line max-lines-per-function
describe.runIf(hasCredentials)('ProductCustomFields API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);
    const createdIds: number[] = [];
    const suffix = Date.now();
    const TEST_NAME_PREFIX = `bc-api-chef-test-${suffix.toString()}`;

    afterAll(async () => {
        for (const id of createdIds) {
            await client
                .v3()
                .products()
                .customFields()
                .remove(TEST_PRODUCT_ID, id)
                .catch(() => {
                    // noop: ignore errors for already-deleted custom fields
                });
        }
    });

    describe('create', () => {
        it('creates the first custom field with the minimum required payload', async () => {
            const result = await client
                .v3()
                .products()
                .customFields()
                .create(TEST_PRODUCT_ID, {
                    name: `${TEST_NAME_PREFIX}-name-1`,
                    value: 'value-1',
                });

            assertOk(result);
            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.name).toBe(`${TEST_NAME_PREFIX}-name-1`);
            expect(result.data.value).toBe('value-1');

            createdIds.push(result.data.id);
        });

        it('creates a second custom field so getMultiple has multiple rows', async () => {
            const result = await client
                .v3()
                .products()
                .customFields()
                .create(TEST_PRODUCT_ID, {
                    name: `${TEST_NAME_PREFIX}-name-2`,
                    value: 'value-2',
                });

            assertOk(result);
            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.name).toBe(`${TEST_NAME_PREFIX}-name-2`);

            createdIds.push(result.data.id);
        });
    });

    describe('getOne', () => {
        it('fetches the first created custom field by id and returns correct fields', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a custom field ID from the create test');

            const result = await client.v3().products().customFields().getOne(TEST_PRODUCT_ID, id);

            assertOk(result);
            expect(result.data.id).toBe(id);
            expect(result.data.name).toBe(`${TEST_NAME_PREFIX}-name-1`);
            expect(result.data.value).toBe('value-1');
        });

        it('returns only the requested fields when include_fields is provided', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a custom field ID from the create test');

            const result = await client
                .v3()
                .products()
                .customFields()
                .getOne(TEST_PRODUCT_ID, id, {
                    include_fields: ['name'],
                });

            assertOk(result);
            // @ts-expect-error value is not in the narrowed type
            expect(result.data.value).toBeUndefined();
            expect(result.data.id).toBe(id);
            expect(result.data.name).toBe(`${TEST_NAME_PREFIX}-name-1`);
        });
    });

    describe('getMultiple', () => {
        it('returns custom fields for the product including both created ones', async () => {
            const result = await client.v3().products().customFields().getMultiple(TEST_PRODUCT_ID);

            assertOk(result);
            expect(result.data.length).toBeGreaterThanOrEqual(2);

            const first = result.data.find((field) => field.id === createdIds[0]);
            const second = result.data.find((field) => field.id === createdIds[1]);

            expect(first).toBeDefined();
            expect(second).toBeDefined();
        });
    });

    describe('update', () => {
        it('updates the value of the first custom field and returns the updated resource', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a custom field ID from the create test');

            const result = await client
                .v3()
                .products()
                .customFields()
                .update(TEST_PRODUCT_ID, id, { value: 'value-1-updated' });

            assertOk(result);
            expect(result.data.id).toBe(id);
            expect(result.data.value).toBe('value-1-updated');
        });
    });

    describe('remove', () => {
        it('deletes the second custom field and a subsequent getOne returns not-found', async () => {
            const id = createdIds.pop();
            assert(id, 'Expected a custom field ID from the create test');

            const deleteResult = await client
                .v3()
                .products()
                .customFields()
                .remove(TEST_PRODUCT_ID, id);

            assertOk(deleteResult);
            expect(deleteResult.data).toBeNull();

            const fetchResult = await client
                .v3()
                .products()
                .customFields()
                .getOne(TEST_PRODUCT_ID, id);

            expect(fetchResult.ok).toBe(false);
        });
    });
});

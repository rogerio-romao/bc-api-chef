// oxlint-disable vitest/no-conditional-in-test -- need to use an array.find in some tests to verify results, which requires conditionals. Can be refactored later if we want to avoid this.

/**
 * Integration tests — hit the real BigCommerce API.
 *
 * Run with: pnpm test:integration
 * Requires a valid .env file with STORE_HASH and ACCESS_TOKEN.
 *
 * These tests verify the channel assignment CRUD flow end-to-end against the
 * real API, including auth headers, URL construction, filter params, and the
 * bulk-upsert PUT semantics of the upsert method.
 */

import BcApiChef from '@/BcApiChef.ts';
import { ACCESS_TOKEN, STORE_HASH } from '@/config.ts';
import { assertOk } from '@/tests/unit/helpers.ts';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// [Sample] Smith Journal 13 at the BC dev sandbox store
const TEST_PRODUCT_ID = 111;
// BC default storefront channel — present on every store
const TEST_CHANNEL_ID = 1;

// oxlint-disable-next-line max-lines-per-function
describe.runIf(hasCredentials)('ProductChannelAssignments API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);

    describe('upsert', () => {
        it('creates a channel assignment via bulk upsert (PUT) and returns null (204 No Content)', async () => {
            const result = await client
                .v3()
                .products()
                .channelAssignments()
                .upsert([{ channel_id: TEST_CHANNEL_ID, product_id: TEST_PRODUCT_ID }]);

            assertOk(result);
            expect(result.data).toBeNull();
        });

        it('is idempotent — calling upsert again with the same data does not error', async () => {
            const result = await client
                .v3()
                .products()
                .channelAssignments()
                .upsert([{ channel_id: TEST_CHANNEL_ID, product_id: TEST_PRODUCT_ID }]);

            assertOk(result);
            expect(result.data).toBeNull();
        });
    });

    describe('getMultiple', () => {
        it('returns assignments filtered by product_id:in', async () => {
            const result = await client
                .v3()
                .products()
                .channelAssignments()
                .getMultiple({ 'product_id:in': TEST_PRODUCT_ID });

            assertOk(result);

            const match = result.data.find(
                (a) => a.product_id === TEST_PRODUCT_ID && a.channel_id === TEST_CHANNEL_ID,
            );

            expect(match).toBeDefined();
        });

        it('returns assignments filtered by channel_id:in', async () => {
            const result = await client
                .v3()
                .products()
                .channelAssignments()
                .getMultiple({ 'channel_id:in': TEST_CHANNEL_ID });

            assertOk(result);

            const match = result.data.find(
                (a) => a.product_id === TEST_PRODUCT_ID && a.channel_id === TEST_CHANNEL_ID,
            );

            expect(match).toBeDefined();
        });

        it('returns an empty array when no assignments match the filter', async () => {
            const result = await client
                .v3()
                .products()
                .channelAssignments()
                .getMultiple({ 'product_id:in': 999_999_999 });

            assertOk(result);
            expect(result.data).toStrictEqual([]);
        });
    });
});

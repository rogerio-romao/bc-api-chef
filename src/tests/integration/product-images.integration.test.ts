/**
 * Integration tests — hit the real BigCommerce API.
 *
 * Run with: pnpm test:integration
 * Requires a valid .env file with STORE_HASH and ACCESS_TOKEN.
 *
 * These tests are intentionally NOT run in CI. They verify that image CRUD
 * works end-to-end against the real API, including auth headers, URL construction,
 * and response unwrapping — things unit tests with mocked HTTP cannot confirm.
 *
 * All images created here use a unique description derived from Date.now()
 * so concurrent runs can identify their own resources.
 */

import BcApiChef from '@/BcApiChef.ts';
import { ACCESS_TOKEN, STORE_HASH } from '@/config.ts';
import { assertOk } from '@/tests/unit/helpers.ts';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// [Sample] Smith Journal 13 at the BC dev sandbox store
const TEST_PRODUCT_ID = 111;

// A small, stable public image used for all create/update calls
const TEST_IMAGE_URL = 'https://placehold.co/400/png';

// oxlint-disable-next-line max-lines-per-function
describe.runIf(hasCredentials)('ProductImages API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);
    const createdIds: number[] = [];
    const suffix = Date.now();
    const TEST_DESCRIPTION = `bc-api-chef-test-${suffix.toString()}`;

    afterAll(async () => {
        for (const id of createdIds) {
            await client
                .v3()
                .products()
                .images()
                .deleteImage(TEST_PRODUCT_ID, id)
                .catch(() => {
                    // noop: ignore errors for already-deleted images
                });
        }
    });

    describe('createImage', () => {
        it('creates an image via image_url with minimum payload', async () => {
            const result = await client.v3().products().images().createImage(TEST_PRODUCT_ID, {
                description: TEST_DESCRIPTION,
                image_url: TEST_IMAGE_URL,
            });

            assertOk(result);
            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.product_id).toBe(TEST_PRODUCT_ID);
            expect(result.data.description).toBe(TEST_DESCRIPTION);

            createdIds.push(result.data.id);
        });
    });

    describe('getImage', () => {
        it('fetches the created image by id and returns correct fields', async () => {
            const id = createdIds[0];
            assert(id, 'Expected an image ID from the createImage test');

            const result = await client.v3().products().images().getImage(TEST_PRODUCT_ID, id);

            assertOk(result);
            expect(result.data.id).toBe(id);
            expect(result.data.product_id).toBe(TEST_PRODUCT_ID);
            expect(result.data.description).toBe(TEST_DESCRIPTION);
        });

        it('returns only the requested fields when include_fields is provided', async () => {
            const id = createdIds[0];
            assert(id, 'Expected an image ID from the createImage test');

            const result = await client
                .v3()
                .products()
                .images()
                .getImage(TEST_PRODUCT_ID, id, {
                    include_fields: ['is_thumbnail', 'sort_order'],
                });

            assertOk(result);
            // @ts-expect-error description is not in the narrowed type
            expect(result.data.description).toBeUndefined();
            expectTypeOf(result.data.is_thumbnail).toBeBoolean();
            expectTypeOf(result.data.sort_order).toBeNumber();
        });
    });

    describe('getImages', () => {
        it('returns images for the product including the created one', async () => {
            const result = await client.v3().products().images().getImages(TEST_PRODUCT_ID);

            assertOk(result);
            expect(result.data.length).toBeGreaterThanOrEqual(1);

            const found = result.data.find((img) => img.description === TEST_DESCRIPTION);
            expect(found).toBeDefined();
            expect(found?.id).toBe(createdIds[0]);
        });
    });

    describe('updateImage', () => {
        it('updates the description without re-supplying the image source', async () => {
            const id = createdIds[0];
            assert(id, 'Expected an image ID from the createImage test');

            const updatedDescription = `${TEST_DESCRIPTION}-updated`;

            const result = await client
                .v3()
                .products()
                .images()
                .updateImage(TEST_PRODUCT_ID, id, { description: updatedDescription });

            assertOk(result);
            expect(result.data.id).toBe(id);
            expect(result.data.description).toBe(updatedDescription);
        });
    });

    describe('deleteImage', () => {
        it('deletes the image and a subsequent getImage returns not-found', async () => {
            const id = createdIds.at(-1);
            assert(id, 'Expected an image ID from the createImage test');

            const deleteResult = await client
                .v3()
                .products()
                .images()
                .deleteImage(TEST_PRODUCT_ID, id);

            assertOk(deleteResult);
            expect(deleteResult.data).toBeNull();

            // Remove from cleanup array only after confirmed deletion
            createdIds.pop();

            // Confirm the image is truly gone server-side
            const fetchResult = await client.v3().products().images().getImage(TEST_PRODUCT_ID, id);

            expect(fetchResult.ok).toBe(false);
        });
    });
});

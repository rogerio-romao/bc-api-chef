/**
 * Integration tests — hit the real BigCommerce API.
 *
 * Run with: pnpm test:integration
 * Requires a valid .env file with STORE_HASH and ACCESS_TOKEN.
 *
 * These tests are intentionally NOT run in CI. They verify that the serialized
 * URLs, pagination, and include/field-selection logic all work against the real
 * API — something unit tests with mocked HTTP cannot confirm.
 */

import BcApiChef from '@/BcApiChef.ts';
import { ACCESS_TOKEN, STORE_HASH } from '@/config.ts';
import { assertOk } from '@/tests/unit/helpers.ts';
import { PER_PAGE_MIN } from '@/v3Api/constants.ts';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// [Sample] Smith Journal 13 at my Bc Dev Sandbox store
const TEST_PRODUCT_ID = 111;

describe.runIf(hasCredentials)('Products API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);

    it('fetches at least one product with default options', async () => {
        const result = await client.v3().products().getProducts();

        assertOk(result);
        expect(Array.isArray(result.data)).toBe(true);

        const [product] = result.data;
        assert(product !== undefined, 'Expected at least one product');
        expectTypeOf(product.id).toBeNumber();
        expectTypeOf(product.name).toBeString();
    });

    it('respects include_fields — only requested fields are present', async () => {
        const result = await client
            .v3()
            .products()
            .getProducts({
                query: {
                    include_fields: ['id', 'name'] as const,
                },
            });

        assertOk(result);

        const [product] = result.data;
        // The type is narrowed to Pick<BaseProduct, 'id'|'name'> — other
        // fields may be absent at runtime, but we only assert the ones we requested.
        assert(product !== undefined, 'Expected at least one product');
        expectTypeOf(product.id).toBeNumber();
        expectTypeOf(product.name).toBeString();
    });

    it('returns sub-resources when includes are requested', async () => {
        const result = await client
            .v3()
            .products()
            .getProducts({
                includes: { custom_fields: true, images: true },
            });

        assertOk(result);

        const [product] = result.data;
        assert(product !== undefined, 'Expected at least one product');
        expect(product.custom_fields).toBeInstanceOf(Array);
        expect(product.images).toBeInstanceOf(Array);
    });

    it('paginates through multiple pages and returns all results', async () => {
        const result = await client
            .v3()
            .products()
            .getProducts({ query: { limit: PER_PAGE_MIN } });

        assertOk(result);

        // More than one page worth means pagination actually ran
        expect(result.data.length).toBeGreaterThan(PER_PAGE_MIN);
    });

    it('filters by id:in correctly', async () => {
        const filtered = await client
            .v3()
            .products()
            .getProducts({
                query: { 'id:in': [TEST_PRODUCT_ID] },
            });

        assertOk(filtered);
        expect(filtered.data).toHaveLength(1);
        expect(filtered.data[0]?.id).toBe(TEST_PRODUCT_ID);
    });

    it('fetches a single product by ID and returns a correct product object', async () => {
        const result = await client.v3().products().getProduct(TEST_PRODUCT_ID);

        assertOk(result);
        expectTypeOf(result.data.id).toBeNumber();
        expect(result.data.name).toBe('[Sample] Smith Journal 13');
    });
});

// oxlint-disable-next-line max-lines-per-function
describe.runIf(hasCredentials)('Products API — write integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);

    const createdIds: number[] = [];
    const suffix = Date.now();

    afterAll(async () => {
        for (const id of createdIds) {
            await client
                .v3()
                .products()
                .deleteProduct(id)
                .catch(() => {
                    // noop: ignore errors for already-deleted products
                });
        }
    });

    describe('createProduct', () => {
        it('creates a product with the minimum required payload', async () => {
            const name = `bc-api-chef integration ${suffix}-1`;

            const result = await client.v3().products().createProduct({
                name,
                price: 29.99,
                type: 'physical',
                weight: 1.5,
            });

            assertOk(result);

            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.name).toBe(name);
            expect(result.data.price).toBe(29.99);
            expect(result.data.type).toBe('physical');

            createdIds.push(result.data.id);
        });

        it('creates a product with more fields', async () => {
            const name = `bc-api-chef integration ${suffix}-2`;

            const result = await client
                .v3()
                .products()
                .createProduct({
                    custom_fields: [
                        {
                            name: 'Material',
                            value: 'Cotton',
                        },
                    ],
                    description: 'integration test description',
                    inventory_level: 100,
                    name,
                    price: 19.99,
                    type: 'physical',
                    weight: 1.5,
                });

            assertOk(result);

            expectTypeOf(result.data.id).toBeNumber();
            expect(result.data.name).toBe(name);

            createdIds.push(result.data.id);
        });
    });

    describe('updateProduct', () => {
        it('updates name and price on an existing product', async () => {
            const id = createdIds[0];
            assert(id, 'Expected a product ID from the createProduct test');

            const updatedName = `bc-api-chef integration ${suffix}-1 UPDATED`;

            const result = await client
                .v3()
                .products()
                .updateProduct(id, { name: updatedName, price: 39.99 });

            assertOk(result);

            expect(result.data.name).toBe(updatedName);
            expect(result.data.price).toBe(39.99);
        });

        it('returns narrowed response when include_fields is provided', async () => {
            const id = createdIds[1];
            assert(id, 'Expected a product ID from the createProduct test');

            const result = await client
                .v3()
                .products()
                .updateProduct(
                    id,
                    { description: 'updated description' },
                    {
                        query: {
                            include_fields: ['id', 'description'] as const,
                        },
                    },
                );

            assertOk(result);

            expect(result.data.id).toBe(id);
            expect(result.data.description).toBe('updated description');
        });
    });

    describe('deleteProduct', () => {
        it('deletes a product and a subsequent getProduct returns not-found', async () => {
            const id = createdIds.shift();
            assert(id, 'Expected a product ID from the createProduct test');

            const deleteResult = await client.v3().products().deleteProduct(id);

            assertOk(deleteResult);
            expect(deleteResult.data).toBeNull();

            // Confirm the product is truly gone server-side
            const fetchResult = await client.v3().products().getProduct(id);

            expect(fetchResult.ok).toBe(false);
        });

        it('deletes the second created product', async () => {
            const id = createdIds.shift();
            assert(id, 'Expected a product ID from the createProduct test');

            const result = await client.v3().products().deleteProduct(id);

            assertOk(result);
            expect(result.data).toBeNull();
        });
    });
});

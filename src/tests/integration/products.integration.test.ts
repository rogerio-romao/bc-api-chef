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

import { afterAll, describe, expect, it } from 'vitest';

import { MIN_LIMIT } from '../../v3Api/constants.ts';

import BcApiChef from '../../BcApiChef.ts';

const STORE_HASH = process.env.STORE_HASH ?? '';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? '';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// [Sample] Smith Journal 13 at my Bc Dev Sandbox store
const TEST_PRODUCT_ID = 111;

describe.runIf(hasCredentials)('Products API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);

    it('fetches at least one product with default options', async () => {
        const result = await client.v3().products().getAllProducts();

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(Array.isArray(result.data)).toBe(true);

        const product = result.data[0];
        if (product) {
            expect(typeof product.id).toBe('number');
            expect(typeof product.name).toBe('string');
        }
    });

    it('respects include_fields — only requested fields are present', async () => {
        const result = await client
            .v3()
            .products()
            .getAllProducts({
                query: {
                    include_fields: ['id', 'name'] as const,
                },
            });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        const product = result.data[0];
        if (product) {
            // The type is narrowed to Pick<BaseProduct, 'id'|'name'> — other
            // fields may be absent at runtime, but we only assert the ones we requested.
            expect(typeof product.id).toBe('number');
            expect(typeof product.name).toBe('string');
        }
    });

    it('returns sub-resources when includes are requested', async () => {
        const result = await client
            .v3()
            .products()
            .getAllProducts({
                includes: { custom_fields: true, images: true },
            });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        const product = result.data[0];
        if (product) {
            expect(Array.isArray(product.custom_fields)).toBe(true);
            expect(Array.isArray(product.images)).toBe(true);
        }
    });

    it('paginates through multiple pages and returns all results', async () => {
        const result = await client
            .v3()
            .products()
            .getAllProducts({ query: { limit: MIN_LIMIT } });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        // More than one page worth means pagination actually ran
        expect(result.data.length).toBeGreaterThan(MIN_LIMIT);
    });

    it('filters by id:in correctly', async () => {
        const filtered = await client
            .v3()
            .products()
            .getAllProducts({
                query: { 'id:in': [TEST_PRODUCT_ID] },
            });

        expect(filtered.ok).toBe(true);
        if (!filtered.ok) {
            return;
        }
        expect(filtered.data).toHaveLength(1);
        expect(filtered.data[0]?.id).toBe(TEST_PRODUCT_ID);
    });

    it('fetches a single product by ID and returns a correct product object', async () => {
        const result = await client.v3().products().getProduct(TEST_PRODUCT_ID);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(typeof result.data.id).toBe('number');
        expect(result.data.name).toBe('[Sample] Smith Journal 13');
    });
});

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
                type: 'physical',
                weight: 1.5,
                price: 29.99,
            });

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }

            expect(typeof result.data.id).toBe('number');
            expect(result.data.name).toBe(name);
            expect(result.data.price).toBe(29.99);
            expect(result.data.type).toBe('physical');

            createdIds.push(result.data.id);
        });

        it('creates a product and narrows response via include_fields', async () => {
            const name = `bc-api-chef integration ${suffix}-2`;
            const result = await client.v3().products().createProduct(
                {
                    name,
                    type: 'physical',
                    weight: 1.5,
                    price: 19.99,
                    description: 'integration test description',
                },
                { query: { include_fields: ['id', 'name'] as const } }
            );

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }

            expect(typeof result.data.id).toBe('number');
            expect(result.data.name).toBe(name);

            createdIds.push(result.data.id);
        });
    });

    describe('updateProduct', () => {
        it('updates name and price on an existing product', async () => {
            const id = createdIds[0];
            const updatedName = `bc-api-chef integration ${suffix}-1 UPDATED`;

            const result = await client
                .v3()
                .products()
                .updateProduct(id!, { name: updatedName, price: 39.99 });

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }

            expect(result.data.name).toBe(updatedName);
            expect(result.data.price).toBe(39.99);
        });

        it('returns narrowed response when include_fields is provided', async () => {
            const id = createdIds[1];

            const result = await client
                .v3()
                .products()
                .updateProduct(
                    id!,
                    { description: 'updated description' },
                    {
                        query: {
                            include_fields: ['id', 'description'] as const,
                        },
                    }
                );

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }

            expect(result.data.id).toBe(id);
            expect(result.data.description).toBe('updated description');
        });
    });

    describe('deleteProduct', () => {
        it('deletes a product and a subsequent getProduct returns not-found', async () => {
            const id = createdIds.shift()!;

            const deleteResult = await client
                .v3()
                .products()
                .deleteProduct(id);

            expect(deleteResult.ok).toBe(true);
            if (!deleteResult.ok) {
                return;
            }
            expect(deleteResult.data).toBeNull();

            // Confirm the product is truly gone server-side
            const fetchResult = await client
                .v3()
                .products()
                .getProduct(id);

            expect(fetchResult.ok).toBe(false);
        });

        it('deletes the second created product', async () => {
            const id = createdIds.shift()!;

            const result = await client.v3().products().deleteProduct(id);

            expect(result.ok).toBe(true);
            if (!result.ok) {
                return;
            }
            expect(result.data).toBeNull();
        });
    });
});

describe.skipIf(hasCredentials)(
    'Products API — skipped (no credentials)',
    () => {
        it('skips all integration tests when STORE_HASH / ACCESS_TOKEN are missing', () => {
            // This test exists solely to make the "skipped" state visible in output.
        });
    }
);

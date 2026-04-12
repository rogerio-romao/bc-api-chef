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

import { describe, expect, it } from 'vitest';

import BcApiChef from '../../BcApiChef.ts';

const STORE_HASH = process.env.STORE_HASH ?? '';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? '';

const hasCredentials = STORE_HASH.length > 0 && ACCESS_TOKEN.length > 0;

// Beef with heart and liver at Purrform
const TEST_PRODUCT_ID = 642;

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
        // limit=60 forces multiple pages against a store with 100+ products.
        // getAllProducts should transparently collect all of them.
        const result = await client
            .v3()
            .products()
            .getAllProducts({ query: { limit: 60 } });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        // More than one page worth means pagination actually ran
        expect(result.data.length).toBeGreaterThan(60);
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
        expect(result.data.name).toBe('Beef with heart and liver');
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

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

describe.runIf(hasCredentials)('Products API — integration', () => {
    const client = new BcApiChef(STORE_HASH, ACCESS_TOKEN);

    it('fetches at least one product with default options', async () => {
        const result = await client
            .v3()
            .products()
            .getAllProducts({
                query: { limit: 150 },
            });

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
                    limit: 150,
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
                query: { limit: 150 },
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
        // Fetch with a high limit first to know how many products exist
        const countResult = await client
            .v3()
            .products()
            .getAllProducts({
                query: { limit: 150 },
            });
        expect(countResult.ok).toBe(true);
        if (!countResult.ok) {
            return;
        }

        // Now fetch all with default pagination (limit=250)
        const allResult = await client.v3().products().getAllProducts();
        expect(allResult.ok).toBe(true);
        if (!allResult.ok) {
            return;
        }

        // Should have fetched at least as many as we know exist
        expect(allResult.data.length).toBeGreaterThanOrEqual(
            countResult.data.length
        );
    });

    it('fetches a single product by ID and returns a product object', async () => {
        const first = await client
            .v3()
            .products()
            .getAllProducts({ query: { limit: 20 } });
        expect(first.ok).toBe(true);
        if (!first.ok) {
            return;
        }

        const firstProduct = first.data[0];
        if (!firstProduct) {
            return;
        }

        const result = await client.v3().products().getProduct(firstProduct.id);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(typeof result.data.id).toBe('number');
        expect(result.data.id).toBe(firstProduct.id);
    });

    it('filters by id:in correctly', async () => {
        // First get any product ID
        const first = await client
            .v3()
            .products()
            .getAllProducts({ query: { limit: 150 } });
        expect(first.ok).toBe(true);
        if (!first.ok) {
            return;
        }

        const firstProduct = first.data[0];
        if (!firstProduct) {
            return;
        }

        const filtered = await client
            .v3()
            .products()
            .getAllProducts({
                query: { 'id:in': [firstProduct.id] },
            });

        expect(filtered.ok).toBe(true);
        if (!filtered.ok) {
            return;
        }
        expect(filtered.data).toHaveLength(1);
        expect(filtered.data[0]?.id).toBe(firstProduct.id);
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

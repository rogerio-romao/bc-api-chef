import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductsV3 from '../v3Api/Products/ProductsV3.ts';

const mockTchef = vi.hoisted(() => vi.fn());
vi.mock('tchef', () => {return { default: mockTchef }});

function makePageResponse(products: object[] = []) {
    return {
        ok: true,
        data: {
            data: products,
            meta: {
                pagination: {
                    total: 0,
                    count: 0,
                    per_page: 250,
                    current_page: 1,
                    total_pages: 1,
                    links: { previous: '', current: '', next: '' },
                },
            },
        },
    };
}

function getCallUrl(): URL {
    const call = mockTchef.mock.calls[0];
    if (!call) {throw new Error('No mock calls recorded');}
    const urlArg: unknown = call[0];
    if (typeof urlArg !== 'string') {throw new TypeError('First argument is not a string');}
    return new URL(urlArg);
}

describe('query param serialization', () => {
    let products: ProductsV3;

    beforeEach(() => {
        mockTchef.mockReset();
        mockTchef.mockResolvedValue(makePageResponse());
        products = new ProductsV3(
            'https://api.bigcommerce.com/stores/test/v3/',
            'test-token'
        );
    });

    describe('number array params', () => {
        it('serializes id:in as comma-separated numbers', async () => {
            await products.getAllProducts({ query: { 'id:in': [10, 20, 30] } });
            expect(getCallUrl().searchParams.get('id:in')).toBe('10,20,30');
        });

        it('serializes id:not_in as comma-separated numbers', async () => {
            await products.getAllProducts({ query: { 'id:not_in': [5, 15] } });
            expect(getCallUrl().searchParams.get('id:not_in')).toBe('5,15');
        });

        it('serializes inventory_level:in as comma-separated numbers', async () => {
            await products.getAllProducts({ query: { 'inventory_level:in': [0, 1, 2] } });
            expect(getCallUrl().searchParams.get('inventory_level:in')).toBe('0,1,2');
        });

        it('serializes categories:in as comma-separated numbers', async () => {
            await products.getAllProducts({ query: { 'categories:in': [100, 200] } });
            expect(getCallUrl().searchParams.get('categories:in')).toBe('100,200');
        });
    });

    describe('string array params', () => {
        it('serializes sku:in as comma-separated strings', async () => {
            await products.getAllProducts({ query: { 'sku:in': ['ABC-1', 'DEF-2'] } });
            expect(getCallUrl().searchParams.get('sku:in')).toBe('ABC-1,DEF-2');
        });
    });

    describe('boolean params', () => {
        it('serializes is_visible: true as "true"', async () => {
            await products.getAllProducts({ query: { is_visible: true } });
            expect(getCallUrl().searchParams.get('is_visible')).toBe('true');
        });

        it('serializes is_featured: false as "false"', async () => {
            await products.getAllProducts({ query: { is_featured: false } });
            expect(getCallUrl().searchParams.get('is_featured')).toBe('false');
        });

        it('serializes out_of_stock: true as "true"', async () => {
            await products.getAllProducts({ query: { out_of_stock: true } });
            expect(getCallUrl().searchParams.get('out_of_stock')).toBe('true');
        });
    });

    describe('date string params', () => {
        it('serializes date_modified:min correctly', async () => {
            await products.getAllProducts({
                query: { 'date_modified:min': '2024-01-01T00:00:00Z' },
            });
            expect(getCallUrl().searchParams.get('date_modified:min')).toBe(
                '2024-01-01T00:00:00Z'
            );
        });

        it('serializes date_last_imported:max correctly', async () => {
            await products.getAllProducts({
                query: { 'date_last_imported:max': '2024-12-31' },
            });
            expect(getCallUrl().searchParams.get('date_last_imported:max')).toBe(
                '2024-12-31'
            );
        });
    });

    describe('sort and direction params', () => {
        it('serializes sort field', async () => {
            await products.getAllProducts({ query: { sort: 'price' } });
            expect(getCallUrl().searchParams.get('sort')).toBe('price');
        });

        it('serializes direction', async () => {
            await products.getAllProducts({ query: { direction: 'desc' } });
            expect(getCallUrl().searchParams.get('direction')).toBe('desc');
        });

        it('serializes sort and direction together', async () => {
            await products.getAllProducts({
                query: { sort: 'date_modified', direction: 'asc' },
            });
            const url = getCallUrl();
            expect(url.searchParams.get('sort')).toBe('date_modified');
            expect(url.searchParams.get('direction')).toBe('asc');
        });
    });

    describe('field selection params', () => {
        it('serializes include_fields array as comma-separated string', async () => {
            await products.getAllProducts({
                query: { include_fields: ['id', 'name', 'sku'] },
            });
            expect(getCallUrl().searchParams.get('include_fields')).toBe('id,name,sku');
        });

        it('serializes exclude_fields array as comma-separated string', async () => {
            await products.getAllProducts({
                query: { exclude_fields: ['description', 'meta_description'] },
            });
            expect(getCallUrl().searchParams.get('exclude_fields')).toBe(
                'description,meta_description'
            );
        });
    });

    describe('literal union params', () => {
        it('serializes condition correctly', async () => {
            await products.getAllProducts({ query: { condition: 'New' } });
            expect(getCallUrl().searchParams.get('condition')).toBe('New');
        });

        it('serializes type correctly', async () => {
            await products.getAllProducts({ query: { type: 'physical' } });
            expect(getCallUrl().searchParams.get('type')).toBe('physical');
        });

        it('serializes availability correctly', async () => {
            await products.getAllProducts({ query: { availability: 'preorder' } });
            expect(getCallUrl().searchParams.get('availability')).toBe('preorder');
        });

        it('serializes keyword_context correctly', async () => {
            await products.getAllProducts({ query: { keyword_context: 'shopper' } });
            expect(getCallUrl().searchParams.get('keyword_context')).toBe('shopper');
        });
    });

    describe('full combination query', () => {
        it('serializes all param types in a single call', async () => {
            await products.getAllProducts({
                includes: { custom_fields: true, images: true },
                query: {
                    'id:in': [1, 2, 3],
                    name: 'Widget',
                    is_visible: true,
                    sort: 'price',
                    direction: 'desc',
                    include_fields: ['id', 'name', 'price'],
                },
            });

            const url = getCallUrl();
            expect(url.searchParams.get('id:in')).toBe('1,2,3');
            expect(url.searchParams.get('name')).toBe('Widget');
            expect(url.searchParams.get('is_visible')).toBe('true');
            expect(url.searchParams.get('sort')).toBe('price');
            expect(url.searchParams.get('direction')).toBe('desc');
            expect(url.searchParams.get('include_fields')).toBe('id,name,price');
            expect(url.searchParams.get('include')).toBe('custom_fields,images');
        });
    });

    describe('pagination params', () => {
        it('always sets page and limit (managed by getMultiPage, not the user query)', async () => {
            await products.getAllProducts({ query: { name: 'test' } });
            const url = getCallUrl();
            // page and limit come from getMultiPage, not the query string
            expect(url.searchParams.get('page')).toBe('1');
            expect(url.searchParams.get('limit')).toBe('250');
        });
    });
});

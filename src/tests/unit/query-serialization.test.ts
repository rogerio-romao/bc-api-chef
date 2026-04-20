import { getCallUrl, makePageResponse } from '@/tests/unit/helpers.ts';
import { DEFAULT_START_PAGE, PER_PAGE_DEFAULT } from '@/v3Api/constants';
import ProductsV3 from '@/v3Api/Products/Products';

const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

// oxlint-disable-next-line max-lines-per-function
describe('query param serialization', () => {
    let products: ProductsV3;

    beforeEach(() => {
        mockTchef.mockReset();
        mockTchef.mockResolvedValue(makePageResponse());
        products = new ProductsV3('https://api.bigcommerce.com/stores/test/v3/', 'test-token', {});
    });

    describe('number array params', () => {
        it('serializes id:in as comma-separated numbers', async () => {
            await products.getMultiple({ 'id:in': [10, 20, 30] });

            expect(getCallUrl(mockTchef).searchParams.get('id:in')).toBe('10,20,30');
        });

        it('serializes id:not_in as comma-separated numbers', async () => {
            await products.getMultiple({ 'id:not_in': [5, 15] });

            expect(getCallUrl(mockTchef).searchParams.get('id:not_in')).toBe('5,15');
        });

        it('serializes inventory_level:in as comma-separated numbers', async () => {
            await products.getMultiple({
                'inventory_level:in': [0, 1, 2],
            });

            expect(getCallUrl(mockTchef).searchParams.get('inventory_level:in')).toBe('0,1,2');
        });

        it('serializes categories:in as comma-separated numbers', async () => {
            await products.getMultiple({
                'categories:in': [100, 200],
            });

            expect(getCallUrl(mockTchef).searchParams.get('categories:in')).toBe('100,200');
        });
    });

    describe('string array params', () => {
        it('serializes sku:in as comma-separated strings', async () => {
            await products.getMultiple({
                'sku:in': ['ABC-1', 'DEF-2'],
            });

            expect(getCallUrl(mockTchef).searchParams.get('sku:in')).toBe('ABC-1,DEF-2');
        });
    });

    describe('boolean params', () => {
        it('serializes is_visible: true as "true"', async () => {
            await products.getMultiple({ is_visible: true });

            expect(getCallUrl(mockTchef).searchParams.get('is_visible')).toBe('true');
        });

        it('serializes is_featured: false as "false"', async () => {
            await products.getMultiple({ is_featured: false });

            expect(getCallUrl(mockTchef).searchParams.get('is_featured')).toBe('false');
        });

        it('serializes out_of_stock: true as "true"', async () => {
            await products.getMultiple({ out_of_stock: true });

            expect(getCallUrl(mockTchef).searchParams.get('out_of_stock')).toBe('true');
        });
    });

    describe('date string params', () => {
        it('serializes date_modified:min correctly', async () => {
            await products.getMultiple({
                'date_modified:min': '2024-01-01T00:00:00Z',
            });

            expect(getCallUrl(mockTchef).searchParams.get('date_modified:min')).toBe(
                '2024-01-01T00:00:00Z',
            );
        });

        it('serializes date_last_imported:max correctly', async () => {
            await products.getMultiple({
                'date_last_imported:max': '2024-12-31',
            });

            expect(getCallUrl(mockTchef).searchParams.get('date_last_imported:max')).toBe(
                '2024-12-31',
            );
        });
    });

    describe('sort and direction params', () => {
        it('serializes sort field', async () => {
            await products.getMultiple({ sort: 'price' });

            expect(getCallUrl(mockTchef).searchParams.get('sort')).toBe('price');
        });

        it('serializes direction', async () => {
            await products.getMultiple({ direction: 'desc' });

            expect(getCallUrl(mockTchef).searchParams.get('direction')).toBe('desc');
        });

        it('serializes sort and direction together', async () => {
            await products.getMultiple({
                direction: 'asc',
                sort: 'date_modified',
            });

            const url = getCallUrl(mockTchef);
            expect(url.searchParams.get('sort')).toBe('date_modified');
            expect(url.searchParams.get('direction')).toBe('asc');
        });
    });

    describe('field selection params', () => {
        it('serializes include_fields array as comma-separated string', async () => {
            await products.getMultiple({
                include_fields: ['description', 'name', 'sku'],
            });

            expect(getCallUrl(mockTchef).searchParams.get('include_fields')).toBe(
                'description,name,sku',
            );
        });

        it('serializes exclude_fields array as comma-separated string', async () => {
            await products.getMultiple({
                exclude_fields: ['description', 'meta_description'],
            });

            expect(getCallUrl(mockTchef).searchParams.get('exclude_fields')).toBe(
                'description,meta_description',
            );
        });
    });

    describe('literal union params', () => {
        it('serializes condition correctly', async () => {
            await products.getMultiple({ condition: 'New' });

            expect(getCallUrl(mockTchef).searchParams.get('condition')).toBe('New');
        });

        it('serializes type correctly', async () => {
            await products.getMultiple({ type: 'physical' });

            expect(getCallUrl(mockTchef).searchParams.get('type')).toBe('physical');
        });

        it('serializes availability correctly', async () => {
            await products.getMultiple({
                availability: 'preorder',
            });

            expect(getCallUrl(mockTchef).searchParams.get('availability')).toBe('preorder');
        });

        it('serializes keyword_context correctly', async () => {
            await products.getMultiple({
                keyword_context: 'shopper',
            });

            expect(getCallUrl(mockTchef).searchParams.get('keyword_context')).toBe('shopper');
        });
    });

    describe('full combination query', () => {
        it('serializes all param types in a single call', async () => {
            await products.getMultiple({
                direction: 'desc',
                'id:in': [1, 2, 3],
                include_fields: ['description', 'name', 'price'],
                includes: { custom_fields: true, images: true },
                is_visible: true,
                name: 'Widget',
                sort: 'price',
            });

            const url = getCallUrl(mockTchef);

            expect(url.searchParams.get('id:in')).toBe('1,2,3');
            expect(url.searchParams.get('name')).toBe('Widget');
            expect(url.searchParams.get('is_visible')).toBe('true');
            expect(url.searchParams.get('sort')).toBe('price');
            expect(url.searchParams.get('direction')).toBe('desc');
            // oxlint-disable-next-line vitest/max-expects
            expect(url.searchParams.get('include_fields')).toBe('description,name,price');
            // oxlint-disable-next-line vitest/max-expects
            expect(url.searchParams.get('include')).toBe('custom_fields,images');
        });
    });

    describe('pagination params', () => {
        it('always sets page and limit (managed by getMultiPage, not the user query)', async () => {
            await products.getMultiple({ name: 'test' });

            const url = getCallUrl(mockTchef);

            // page and limit come from getMultiPage, not the query string
            expect(url.searchParams.get('page')).toBe(DEFAULT_START_PAGE.toString());
            expect(url.searchParams.get('limit')).toBe(PER_PAGE_DEFAULT.toString());
        });
    });
});

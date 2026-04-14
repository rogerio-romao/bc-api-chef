import type {
    ApiProductQuery,
    CreateProductPayload,
    GetProductsReturnType,
    ProductIncludes,
    ProductSortField,
    SortDirection,
} from '@/types/api-types';
import type {
    BaseProduct,
    BaseProductField,
    ProductCustomField,
    ProductImage,
    ProductVariant,
} from '@/types/product-types';

vi.setConfig({ testTimeout: 1000 });

describe('BaseProductField type', () => {
    it('equals keyof BaseProduct', () => {
        expectTypeOf<BaseProductField>().toEqualTypeOf<keyof BaseProduct>();
    });
});

describe('ApiProductQuery type', () => {
    it('accepts valid BaseProductField values for include_fields', () => {
        const q: ApiProductQuery = { include_fields: ['id', 'name', 'sku'] };
        expectTypeOf(q.include_fields).toEqualTypeOf<readonly BaseProductField[] | undefined>();
    });

    it('accepts valid BaseProductField values for exclude_fields', () => {
        const q: ApiProductQuery = {
            exclude_fields: ['description', 'weight'],
        };
        expectTypeOf(q.exclude_fields).toEqualTypeOf<readonly BaseProductField[] | undefined>();
    });

    it('types id:in as number[] | undefined', () => {
        expectTypeOf<ApiProductQuery['id:in']>().toEqualTypeOf<number[] | undefined>();
    });

    it('types id:not_in as number[] | undefined', () => {
        expectTypeOf<ApiProductQuery['id:not_in']>().toEqualTypeOf<number[] | undefined>();
    });

    it('types inventory_level:in as number[] | undefined', () => {
        expectTypeOf<ApiProductQuery['inventory_level:in']>().toEqualTypeOf<number[] | undefined>();
    });

    it('types sku:in as string[] | undefined', () => {
        expectTypeOf<ApiProductQuery['sku:in']>().toEqualTypeOf<string[] | undefined>();
    });

    it('types condition as the correct literal union', () => {
        expectTypeOf<ApiProductQuery['condition']>().toEqualTypeOf<
            'New' | 'Used' | 'Refurbished' | undefined
        >();
    });

    it('types type as physical | digital | undefined', () => {
        expectTypeOf<ApiProductQuery['type']>().toEqualTypeOf<'physical' | 'digital' | undefined>();
    });

    it('types availability as the correct literal union', () => {
        expectTypeOf<ApiProductQuery['availability']>().toEqualTypeOf<
            'available' | 'disabled' | 'preorder' | undefined
        >();
    });

    it('types sort as ProductSortField | undefined', () => {
        expectTypeOf<ApiProductQuery['sort']>().toEqualTypeOf<ProductSortField | undefined>();
    });

    it('types direction as SortDirection | undefined', () => {
        expectTypeOf<ApiProductQuery['direction']>().toEqualTypeOf<SortDirection | undefined>();
    });
});

describe('ProductSortField type', () => {
    it('accepts all expected sort fields', () => {
        // Typed array assignment is a compile-time assertion — TypeScript will
        // error here if any value is not part of the union.
        const sortFields: ProductSortField[] = [
            'id',
            'name',
            'price',
            'sku',
            'date_modified',
            'date_last_imported',
            'inventory_level',
            'is_visible',
            'total_sold',
        ];
        expect(sortFields).toBeDefined();
    });

    it('is a strict union (not the loose string type)', () => {
        expectTypeOf<ProductSortField>().not.toEqualTypeOf<string>();
    });
});

describe('SortDirection type', () => {
    it('is exactly asc | desc', () => {
        expectTypeOf<SortDirection>().toEqualTypeOf<'asc' | 'desc'>();
    });
});

describe('CreateProductPayload type', () => {
    it('accepts a minimum valid payload (required fields only)', () => {
        const payload: CreateProductPayload = {
            name: 'Widget',
            price: 29.99,
            type: 'physical',
            weight: 1.5,
        };
        expect(payload).toBeDefined();
    });

    it('accepts optional fields alongside required ones', () => {
        const payload: CreateProductPayload = {
            categories: [1, 2],
            custom_fields: [{ name: 'material', value: 'steel' }],
            description: '<p>A widget</p>',
            is_visible: true,
            name: 'Widget',
            price: 29.99,
            sku: 'SKU-001',
            type: 'physical',
            weight: 1.5,
        };
        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field id', () => {
        const payload: CreateProductPayload = {
            // @ts-expect-error id is server-computed and excluded from CreateProductPayload
            id: 5,
            name: 'Widget',
            price: 29.99,
            type: 'physical',
            weight: 1.5,
        };
        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field calculated_price', () => {
        const payload: CreateProductPayload = {
            // @ts-expect-error calculated_price is server-computed and excluded from CreateProductPayload
            calculated_price: 25,
            name: 'Widget',
            price: 29.99,
            type: 'physical',
            weight: 1.5,
        };
        expect(payload).toBeDefined();
    });

    it('requires name', () => {
        // @ts-expect-error name is required
        const payload: CreateProductPayload = {
            price: 29.99,
            type: 'physical',
            weight: 1.5,
        };
        expect(payload).toBeDefined();
    });

    it('requires price', () => {
        // @ts-expect-error price is required
        const payload: CreateProductPayload = {
            name: 'Widget',
            type: 'physical',
            weight: 1.5,
        };
        expect(payload).toBeDefined();
    });
});

describe('GetProductsReturnType type', () => {
    it('returns an array of objects with core BaseProduct fields when nothing is specified', () => {
        type Result = GetProductsReturnType<Record<string, never>>;
        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('name');
        expectTypeOf<Result[number]>().toHaveProperty('sku');
        expectTypeOf<Result[number]>().toHaveProperty('price');
    });

    it('adds variants when variants include is true', () => {
        type Result = GetProductsReturnType<{ variants: true }>;
        expectTypeOf<Result[number]>().toHaveProperty('variants');
        expectTypeOf<Result[number]['variants']>().toEqualTypeOf<ProductVariant[]>();
    });

    it('adds images when images include is true', () => {
        type Result = GetProductsReturnType<{ images: true }>;
        expectTypeOf<Result[number]>().toHaveProperty('images');
        expectTypeOf<Result[number]['images']>().toEqualTypeOf<ProductImage[]>();
    });

    it('adds custom_fields when custom_fields include is true', () => {
        type Result = GetProductsReturnType<{ custom_fields: true }>;
        expectTypeOf<Result[number]>().toHaveProperty('custom_fields');
        expectTypeOf<Result[number]['custom_fields']>().toEqualTypeOf<ProductCustomField[]>();
    });

    it('does not add variants when include is false', () => {
        type Result = GetProductsReturnType<{ variants: false }>;
        expectTypeOf<Result[number]>().not.toHaveProperty('variants');
    });

    it('always has base BaseProduct fields regardless of includes', () => {
        type Result = GetProductsReturnType<ProductIncludes>;
        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('name');
        expectTypeOf<Result[number]>().toHaveProperty('sku');
    });

    it('narrows base fields to Pick when include_fields is provided', () => {
        type Result = GetProductsReturnType<Record<string, never>, readonly ['id', 'name']>;
        // Should have id and name
        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('name');
        // Should NOT have sku (not in the pick)
        expectTypeOf<Result[number]>().not.toHaveProperty('sku');
    });

    it('combines include_fields narrowing with sub-resource includes', () => {
        type Result = GetProductsReturnType<{ images: true }, readonly ['id', 'name']>;
        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('name');
        expectTypeOf<Result[number]>().toHaveProperty('images');
        expectTypeOf<Result[number]>().not.toHaveProperty('sku');
    });
});

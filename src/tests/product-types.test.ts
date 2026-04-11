import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
    ApiProductQuery,
    GetProductsReturnType,
    ProductIncludes,
    ProductSortField,
    SortDirection,
} from '../types/bigcommerce/api-types.ts';
import type {
    BaseProduct,
    BaseProductField,
    ProductCustomField,
    ProductImage,
    ProductVariant,
} from '../types/bigcommerce/product-types.ts';

describe('BaseProductField', () => {
    it('equals keyof BaseProduct', () => {
        expectTypeOf<BaseProductField>().toEqualTypeOf<keyof BaseProduct>();
    });
});

describe('ApiProductQuery', () => {
    it('accepts valid BaseProductField values for include_fields', () => {
        const q: ApiProductQuery = { include_fields: ['id', 'name', 'sku'] };
        expectTypeOf(q.include_fields).toEqualTypeOf<
            readonly BaseProductField[] | undefined
        >();
    });

    it('accepts valid BaseProductField values for exclude_fields', () => {
        const q: ApiProductQuery = { exclude_fields: ['description', 'weight'] };
        expectTypeOf(q.exclude_fields).toEqualTypeOf<
            readonly BaseProductField[] | undefined
        >();
    });

    it('types id:in as number[] | undefined', () => {
        expectTypeOf<ApiProductQuery['id:in']>().toEqualTypeOf<number[] | undefined>();
    });

    it('types id:not_in as number[] | undefined', () => {
        expectTypeOf<ApiProductQuery['id:not_in']>().toEqualTypeOf<number[] | undefined>();
    });

    it('types inventory_level:in as number[] | undefined', () => {
        expectTypeOf<ApiProductQuery['inventory_level:in']>().toEqualTypeOf<
            number[] | undefined
        >();
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
        expectTypeOf<ApiProductQuery['type']>().toEqualTypeOf<
            'physical' | 'digital' | undefined
        >();
    });

    it('types availability as the correct literal union', () => {
        expectTypeOf<ApiProductQuery['availability']>().toEqualTypeOf<
            'available' | 'disabled' | 'preorder' | undefined
        >();
    });

    it('types sort as ProductSortField | undefined', () => {
        expectTypeOf<ApiProductQuery['sort']>().toEqualTypeOf<
            ProductSortField | undefined
        >();
    });

    it('types direction as SortDirection | undefined', () => {
        expectTypeOf<ApiProductQuery['direction']>().toEqualTypeOf<
            SortDirection | undefined
        >();
    });
});

describe('ProductSortField', () => {
    it('accepts all expected sort fields', () => {
        // Typed array assignment is a compile-time assertion — TypeScript will
        // error here if any value is not part of the union.
        const sortFields: ProductSortField[] = [
            'id', 'name', 'price', 'sku',
            'date_modified', 'date_last_imported',
            'inventory_level', 'is_visible', 'total_sold',
        ];
        expect(sortFields).toBeDefined();
    });

    it('is a strict union (not the loose string type)', () => {
        expectTypeOf<ProductSortField>().not.toEqualTypeOf<string>();
    });
});

describe('SortDirection', () => {
    it('is exactly asc | desc', () => {
        expectTypeOf<SortDirection>().toEqualTypeOf<'asc' | 'desc'>();
    });
});

describe('GetProductsReturnType', () => {
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
        expectTypeOf<Result[number]['custom_fields']>().toEqualTypeOf<
            ProductCustomField[]
        >();
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
        type Result = GetProductsReturnType<
            Record<string, never>,
            readonly ['id', 'name']
        >;
        // Should have id and name
        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('name');
        // Should NOT have sku (not in the pick)
        expectTypeOf<Result[number]>().not.toHaveProperty('sku');
    });

    it('combines include_fields narrowing with sub-resource includes', () => {
        type Result = GetProductsReturnType<
            { images: true },
            readonly ['id', 'name']
        >;
        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('name');
        expectTypeOf<Result[number]>().toHaveProperty('images');
        expectTypeOf<Result[number]>().not.toHaveProperty('sku');
    });
});

import type { Prettify, SortDirection } from '@/types/api-types';
import type { ProductCustomField } from '@/types/product-custom-fields';
import type { ProductImage } from '@/types/product-images';
import type {
    ApiProductQuery,
    BaseProduct,
    BaseProductField,
    CreateProductPayload,
    IncludeExpansion,
    NoIdProductField,
    ProductSortField,
} from '@/types/product-types';
import type { ProductVariant } from '@/types/product-variants';

describe('BaseProductField type', () => {
    it('equals keyof BaseProduct', () => {
        expectTypeOf<BaseProductField>().toEqualTypeOf<keyof BaseProduct>();
    });
});

describe('ApiProductQuery type', () => {
    it('accepts NoIdProductField values for include_fields', () => {
        expectTypeOf<ApiProductQuery['include_fields']>().toEqualTypeOf<
            readonly NoIdProductField[] | undefined
        >();
    });

    it('accepts valid NoIdProductField values for exclude_fields', () => {
        expectTypeOf<ApiProductQuery['exclude_fields']>().toEqualTypeOf<
            readonly NoIdProductField[] | undefined
        >();
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

    it('does not allow include_fields and exclude_fields to be supplied together', () => {
        // @ts-expect-error include_fields and exclude_fields are mutually exclusive
        const query: ApiProductQuery = {
            exclude_fields: ['name'],
            include_fields: ['description'],
        };

        expect(query).toBeDefined();
    });
});

describe('ProductSortField type', () => {
    it('accepts all expected sort fields', () => {
        const sortFields = [
            'id',
            'name',
            'price',
            'sku',
            'date_modified',
            'date_last_imported',
            'inventory_level',
            'is_visible',
            'total_sold',
        ] as const satisfies readonly ProductSortField[];

        expectTypeOf(sortFields).toExtend<readonly ProductSortField[]>();
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
        const payload = {
            name: 'Widget',
            price: 29.99,
            type: 'physical',
            weight: 1.5,
        } satisfies CreateProductPayload;

        expectTypeOf(payload).toExtend<CreateProductPayload>();
    });

    it('accepts optional fields alongside required ones', () => {
        const payload = {
            categories: [1, 2],
            custom_fields: [{ name: 'material', value: 'steel' }],
            description: '<p>A widget</p>',
            is_visible: true,
            name: 'Widget',
            price: 29.99,
            sku: 'SKU-001',
            type: 'physical',
            weight: 1.5,
        } satisfies CreateProductPayload;

        expectTypeOf(payload).toExtend<CreateProductPayload>();
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

        // this is only here for the linter wanting at least one assertion - the test is really that the above line causes a TypeScript error
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

describe('product return type narrowing', () => {
    it('returns a plain BaseProduct when no includes are given', () => {
        type Result = Prettify<BaseProduct & IncludeExpansion<object>>;

        expectTypeOf<Result>().toEqualTypeOf<BaseProduct>();
    });

    it('adds variants when variants include is true', () => {
        type Result = Prettify<BaseProduct & IncludeExpansion<{ variants: true }>>;

        expectTypeOf<Result>().toHaveProperty('variants');
        expectTypeOf<Result['variants']>().toEqualTypeOf<ProductVariant[]>();
    });

    it('adds images when images include is true', () => {
        type Result = Prettify<BaseProduct & IncludeExpansion<{ images: true }>>;

        expectTypeOf<Result>().toHaveProperty('images');
        expectTypeOf<Result['images']>().toEqualTypeOf<ProductImage[]>();
    });

    it('adds custom_fields when custom_fields include is true', () => {
        type Result = Prettify<BaseProduct & IncludeExpansion<{ custom_fields: true }>>;

        expectTypeOf<Result>().toHaveProperty('custom_fields');
        expectTypeOf<Result['custom_fields']>().toEqualTypeOf<ProductCustomField[]>();
    });

    it('does not add variants when include is false', () => {
        type Result = Prettify<BaseProduct & IncludeExpansion<{ variants: false }>>;

        expectTypeOf<Result>().not.toHaveProperty('variants');
    });

    it('always has base BaseProduct fields alongside included sub-resources', () => {
        type Result = Prettify<BaseProduct & IncludeExpansion<{ variants: true }>>;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('name');
        expectTypeOf<Result>().toHaveProperty('sku');
        expectTypeOf<Result>().toHaveProperty('variants');
    });

    it('narrows base fields to Pick when include_fields is provided', () => {
        type Result = Prettify<Pick<BaseProduct, 'id' | 'name'> & IncludeExpansion<object>>;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('name');
        expectTypeOf<Result>().not.toHaveProperty('sku');
    });

    it('combines include_fields narrowing with sub-resource includes', () => {
        type Result = Prettify<
            Pick<BaseProduct, 'id' | 'name'> & IncludeExpansion<{ images: true }>
        >;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('name');
        expectTypeOf<Result>().toHaveProperty('images');
        expectTypeOf<Result>().not.toHaveProperty('sku');
    });

    it('removes excluded fields when exclude_fields is provided', () => {
        type Result = Prettify<
            Omit<BaseProduct, 'description' | 'weight'> & IncludeExpansion<object>
        >;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('name');
        expectTypeOf<Result>().not.toHaveProperty('description');
        expectTypeOf<Result>().not.toHaveProperty('weight');
    });

    it('combines exclude_fields narrowing with sub-resource includes', () => {
        type Result = Prettify<
            Omit<BaseProduct, 'description'> & IncludeExpansion<{ variants: true }>
        >;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('variants');
        expectTypeOf<Result>().not.toHaveProperty('description');
    });
});

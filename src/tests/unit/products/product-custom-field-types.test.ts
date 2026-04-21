import type { ApiResult } from '@/types/api-types.ts';
import type {
    NoIdProductCustomField,
    ProductCustomField,
    ProductCustomFieldField,
} from '@/types/product-custom-fields.ts';
import type ProductCustomFields from '@/v3Api/Products/ProductCustomFields.ts';

describe('ProductCustomFieldField type', () => {
    it('equals keyof Omit<ProductCustomField, "id">', () => {
        expectTypeOf<ProductCustomFieldField>().toEqualTypeOf<
            keyof Omit<ProductCustomField, 'id'>
        >();
    });
});

describe('NoIdProductCustomField type', () => {
    it('equals Omit<ProductCustomField, "id">', () => {
        expectTypeOf<NoIdProductCustomField>().toEqualTypeOf<Omit<ProductCustomField, 'id'>>();
    });

    it('does not allow server-computed field id', () => {
        const payload: NoIdProductCustomField = {
            // @ts-expect-error id is server-computed and excluded from NoIdProductCustomField
            id: 1,
            name: 'Material',
            value: 'Cotton',
        };

        expect(payload).toBeDefined();
    });

    it('requires name', () => {
        // @ts-expect-error name is required
        const payload: NoIdProductCustomField = {
            value: 'Cotton',
        };

        expect(payload).toBeDefined();
    });

    it('requires value', () => {
        // @ts-expect-error value is required
        const payload: NoIdProductCustomField = {
            name: 'Material',
        };

        expect(payload).toBeDefined();
    });
});

describe('ProductCustomFields.create return type', () => {
    type Result = Awaited<ReturnType<ProductCustomFields['create']>>;

    it('resolves to ApiResult<ProductCustomField>', () => {
        expectTypeOf<Result>().toEqualTypeOf<Awaited<ApiResult<ProductCustomField>>>();
    });
});

describe('ProductCustomFields.getMultiple return type', () => {
    it('returns full ProductCustomField[] when no field selection is provided', () => {
        type Result = Awaited<ApiResult<ProductCustomField[]>>;

        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().toHaveProperty('id');
        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().toHaveProperty('name');
        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().toHaveProperty('value');
    });

    it('narrows array items to Pick (always including id) when include_fields is provided', () => {
        type Result = Awaited<ApiResult<Pick<ProductCustomField, 'id' | 'name'>[]>>;

        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().toHaveProperty('id');
        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().toHaveProperty('name');
        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().not.toHaveProperty('value');
    });

    it('removes excluded fields from array items when exclude_fields is provided', () => {
        type Result = Awaited<ApiResult<Omit<ProductCustomField, 'value'>[]>>;

        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().toHaveProperty('id');
        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().toHaveProperty('name');
        expectTypeOf<Extract<Result, { ok: true }>['data'][number]>().not.toHaveProperty('value');
    });
});

describe('ProductCustomFields.getOne return type', () => {
    it('returns full ProductCustomField when no field selection is provided', () => {
        type Result = Awaited<ApiResult<ProductCustomField>>;

        expectTypeOf<Extract<Result, { ok: true }>['data']>().toHaveProperty('id');
        expectTypeOf<Extract<Result, { ok: true }>['data']>().toHaveProperty('name');
        expectTypeOf<Extract<Result, { ok: true }>['data']>().toHaveProperty('value');
    });

    it('narrows to Pick (always including id) when include_fields is provided', () => {
        type Result = Awaited<ApiResult<Pick<ProductCustomField, 'id' | 'name'>>>;

        expectTypeOf<Extract<Result, { ok: true }>['data']>().toHaveProperty('id');
        expectTypeOf<Extract<Result, { ok: true }>['data']>().toHaveProperty('name');
        expectTypeOf<Extract<Result, { ok: true }>['data']>().not.toHaveProperty('value');
    });

    it('removes excluded fields when exclude_fields is provided', () => {
        type Result = Awaited<ApiResult<Omit<ProductCustomField, 'value'>>>;

        expectTypeOf<Extract<Result, { ok: true }>['data']>().toHaveProperty('id');
        expectTypeOf<Extract<Result, { ok: true }>['data']>().toHaveProperty('name');
        expectTypeOf<Extract<Result, { ok: true }>['data']>().not.toHaveProperty('value');
    });
});

describe('ProductCustomFields.update return type', () => {
    type Result = Awaited<ReturnType<ProductCustomFields['update']>>;

    it('resolves to ApiResult<ProductCustomField>', () => {
        expectTypeOf<Result>().toEqualTypeOf<Awaited<ApiResult<ProductCustomField>>>();
    });
});

describe('ProductCustomFields.remove return type', () => {
    type Result = Awaited<ReturnType<ProductCustomFields['remove']>>;

    it('resolves to ApiResult<null>', () => {
        expectTypeOf<Result>().toEqualTypeOf<Awaited<ApiResult<null>>>();
    });
});

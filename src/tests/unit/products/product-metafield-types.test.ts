import type {
    ApiMetafieldQuery,
    BaseMetafieldField,
    CreateMetafieldPayload,
    GetMetafieldReturnType,
    GetMetafieldsReturnType,
    ProductMetafield,
} from '@/types/product-metafields';

describe('BaseMetafieldField type', () => {
    it('equals keyof Omit<ProductMetafield, "id">', () => {
        expectTypeOf<BaseMetafieldField>().toEqualTypeOf<keyof Omit<ProductMetafield, 'id'>>();
    });
});

describe('ApiMetafieldQuery type', () => {
    it('types include_fields as readonly BaseMetafieldField[] | undefined', () => {
        expectTypeOf<ApiMetafieldQuery['include_fields']>().toEqualTypeOf<
            readonly BaseMetafieldField[] | undefined
        >();
    });

    it('types exclude_fields as readonly BaseMetafieldField[] | undefined', () => {
        expectTypeOf<ApiMetafieldQuery['exclude_fields']>().toEqualTypeOf<
            readonly BaseMetafieldField[] | undefined
        >();
    });

    it('types key as string | undefined', () => {
        expectTypeOf<ApiMetafieldQuery['key']>().toEqualTypeOf<string | undefined>();
    });

    it('types namespace as string | undefined', () => {
        expectTypeOf<ApiMetafieldQuery['namespace']>().toEqualTypeOf<string | undefined>();
    });

    it('types resource_id:in as string | undefined', () => {
        expectTypeOf<ApiMetafieldQuery['resource_id:in']>().toEqualTypeOf<string | undefined>();
    });
});

// oxlint-disable-next-line max-lines-per-function
describe('CreateMetafieldPayload type', () => {
    it('accepts a minimum valid payload', () => {
        const payload = {
            key: 'my-key',
            namespace: 'my-namespace',
            permission_set: 'read',
            value: 'my-value',
        } satisfies CreateMetafieldPayload;

        expectTypeOf(payload).toExtend<CreateMetafieldPayload>();
    });

    it('accepts optional description and resource_type', () => {
        const payload = {
            description: 'some description',
            key: 'my-key',
            namespace: 'my-namespace',
            permission_set: 'read',
            resource_type: 'product',
            value: 'my-value',
        } satisfies CreateMetafieldPayload;

        expectTypeOf(payload).toExtend<CreateMetafieldPayload>();
    });

    it('does not allow server-computed field id', () => {
        const payload: CreateMetafieldPayload = {
            // @ts-expect-error id is server-computed and excluded from CreateMetafieldPayload
            id: 5,
            key: 'k',
            namespace: 'ns',
            permission_set: 'read',
            value: 'v',
        };

        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field date_created', () => {
        const payload: CreateMetafieldPayload = {
            // @ts-expect-error date_created is server-computed and excluded from CreateMetafieldPayload
            date_created: '2024-01-01',
            key: 'k',
            namespace: 'ns',
            permission_set: 'read',
            value: 'v',
        };

        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field owner_client_id', () => {
        const payload: CreateMetafieldPayload = {
            key: 'k',
            namespace: 'ns',
            // @ts-expect-error owner_client_id is server-computed and excluded from CreateMetafieldPayload
            owner_client_id: 'abc',
            permission_set: 'read',
            value: 'v',
        };

        expect(payload).toBeDefined();
    });

    it('requires namespace', () => {
        // @ts-expect-error namespace is required
        const payload: CreateMetafieldPayload = {
            key: 'k',
            permission_set: 'read',
            value: 'v',
        };

        expect(payload).toBeDefined();
    });

    it('requires key', () => {
        // @ts-expect-error key is required
        const payload: CreateMetafieldPayload = {
            namespace: 'ns',
            permission_set: 'read',
            value: 'v',
        };

        expect(payload).toBeDefined();
    });

    it('requires value', () => {
        // @ts-expect-error value is required
        const payload: CreateMetafieldPayload = {
            key: 'k',
            namespace: 'ns',
            permission_set: 'read',
        };

        expect(payload).toBeDefined();
    });

    it('requires permission_set', () => {
        // @ts-expect-error permission_set is required
        const payload: CreateMetafieldPayload = {
            key: 'k',
            namespace: 'ns',
            value: 'v',
        };

        expect(payload).toBeDefined();
    });
});

describe('GetMetafieldsReturnType type', () => {
    it('returns an array of full ProductMetafield when no generics are provided', () => {
        type Result = GetMetafieldsReturnType;

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('key');
        expectTypeOf<Result[number]>().toHaveProperty('value');
        expectTypeOf<Result[number]>().toHaveProperty('namespace');
        expectTypeOf<Result[number]>().toHaveProperty('description');
    });

    it('narrows to Pick when include_fields is provided', () => {
        type Result = GetMetafieldsReturnType<readonly ['key', 'value']>;

        expectTypeOf<Result[number]>().toHaveProperty('key');
        expectTypeOf<Result[number]>().toHaveProperty('value');
        expectTypeOf<Result[number]>().not.toHaveProperty('namespace');
    });

    it('removes excluded fields when exclude_fields is provided', () => {
        type Result = GetMetafieldsReturnType<undefined, readonly ['description']>;

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('key');
        expectTypeOf<Result[number]>().not.toHaveProperty('description');
    });

    it('falls back to full ProductMetafield when E is widened to the full union', () => {
        // Simulates a caller passing a variable typed as BaseMetafieldField[] (not a literal)
        type E = BaseMetafieldField[];
        type Result = GetMetafieldsReturnType<undefined, E>;

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('description');
    });
});

describe('GetMetafieldReturnType type', () => {
    it('returns full ProductMetafield when no generics are provided', () => {
        type Result = GetMetafieldReturnType;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('key');
        expectTypeOf<Result>().toHaveProperty('value');
        expectTypeOf<Result>().toHaveProperty('namespace');
    });

    it('narrows to Pick when include_fields is provided', () => {
        type Result = GetMetafieldReturnType<readonly ['key', 'value']>;

        expectTypeOf<Result>().toHaveProperty('key');
        expectTypeOf<Result>().toHaveProperty('value');
        expectTypeOf<Result>().not.toHaveProperty('namespace');
    });

    it('removes excluded fields when exclude_fields is provided', () => {
        type Result = GetMetafieldReturnType<undefined, readonly ['description']>;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('key');
        expectTypeOf<Result>().not.toHaveProperty('description');
    });
});

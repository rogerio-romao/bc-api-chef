import type {
    ApiProductImagesQuery,
    BaseProductImageField,
    GetProductImageReturnType,
    GetProductImagesReturnType,
    ProductImage,
    ProductImagePayloadItem,
} from '@/types/product-images';

describe('BaseProductImageField type', () => {
    it('equals keyof Omit<ProductImage, "id" | "product_id" | "date_modified">', () => {
        expectTypeOf<BaseProductImageField>().toEqualTypeOf<
            keyof Omit<ProductImage, 'id' | 'product_id' | 'date_modified'>
        >();
    });
});

describe('ApiProductImagesQuery type', () => {
    it('types include_fields as readonly BaseProductImageField[] | undefined', () => {
        expectTypeOf<ApiProductImagesQuery['include_fields']>().toEqualTypeOf<
            readonly BaseProductImageField[] | undefined
        >();
    });

    it('types exclude_fields as readonly BaseProductImageField[] | undefined', () => {
        expectTypeOf<ApiProductImagesQuery['exclude_fields']>().toEqualTypeOf<
            readonly BaseProductImageField[] | undefined
        >();
    });

    it('types page as number | undefined', () => {
        expectTypeOf<ApiProductImagesQuery['page']>().toEqualTypeOf<number | undefined>();
    });

    it('types limit as number | undefined', () => {
        expectTypeOf<ApiProductImagesQuery['limit']>().toEqualTypeOf<number | undefined>();
    });
});

// oxlint-disable-next-line max-lines-per-function
describe('ProductImagePayloadItem type', () => {
    it('accepts a payload with image_url and optional common fields', () => {
        const payload = {
            description: 'a photo',
            image_url: 'https://example.com/img.jpg',
            is_thumbnail: true,
            sort_order: 1,
        } satisfies ProductImagePayloadItem;

        expect(payload).toBeDefined();
    });

    it('accepts a payload with image_file and optional common fields', () => {
        const payload = {
            image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
            sort_order: 0,
        } satisfies ProductImagePayloadItem;

        expect(payload).toBeDefined();
    });

    it('does not allow both image_file and image_url together', () => {
        // @ts-expect-error image_url is `never` when image_file is present
        const payload: ProductImagePayloadItem = {
            image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
            image_url: 'https://example.com/img.jpg',
        };

        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field id', () => {
        const payload: ProductImagePayloadItem = {
            // @ts-expect-error id is server-computed and not part of the payload
            id: 1,
            image_url: 'https://example.com/img.jpg',
        };

        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field product_id', () => {
        const payload: ProductImagePayloadItem = {
            image_url: 'https://example.com/img.jpg',
            // @ts-expect-error product_id is server-computed and not part of the payload
            product_id: 42,
        };

        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field date_modified', () => {
        const payload: ProductImagePayloadItem = {
            // @ts-expect-error date_modified is server-computed and not part of the payload
            date_modified: '2024-01-01',
            image_url: 'https://example.com/img.jpg',
        };

        expect(payload).toBeDefined();
    });

    it('does not allow server-computed field url_zoom', () => {
        const payload: ProductImagePayloadItem = {
            image_url: 'https://example.com/img.jpg',
            // @ts-expect-error url_zoom is server-computed and not part of the payload
            url_zoom: 'https://cdn.example.com/zoom.jpg',
        };

        expect(payload).toBeDefined();
    });
});

describe('GetProductImageReturnType type', () => {
    it('returns full ProductImage when no generics are provided', () => {
        type Result = GetProductImageReturnType;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('is_thumbnail');
        expectTypeOf<Result>().toHaveProperty('sort_order');
        expectTypeOf<Result>().toHaveProperty('description');
        expectTypeOf<Result>().toHaveProperty('image_file');
        expectTypeOf<Result>().toHaveProperty('url_zoom');
    });

    it('narrows to Pick (always including id) when include_fields is provided', () => {
        type Result = GetProductImageReturnType<readonly ['is_thumbnail', 'sort_order']>;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('is_thumbnail');
        expectTypeOf<Result>().toHaveProperty('sort_order');
        expectTypeOf<Result>().not.toHaveProperty('description');
        expectTypeOf<Result>().not.toHaveProperty('url_zoom');
    });

    it('removes excluded fields when exclude_fields is provided', () => {
        type Result = GetProductImageReturnType<undefined, readonly ['description', 'url_zoom']>;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('is_thumbnail');
        expectTypeOf<Result>().not.toHaveProperty('description');
        expectTypeOf<Result>().not.toHaveProperty('url_zoom');
    });
});

describe('GetProductImagesReturnType type', () => {
    it('returns ProductImage[] when no generics are provided', () => {
        type Result = GetProductImagesReturnType;

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('is_thumbnail');
        expectTypeOf<Result[number]>().toHaveProperty('sort_order');
        expectTypeOf<Result[number]>().toHaveProperty('description');
        expectTypeOf<Result[number]>().toHaveProperty('image_file');
    });

    it('narrows array items to Pick (always including id) when include_fields is provided', () => {
        type Result = GetProductImagesReturnType<readonly ['is_thumbnail', 'sort_order']>;

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('is_thumbnail');
        expectTypeOf<Result[number]>().toHaveProperty('sort_order');
        expectTypeOf<Result[number]>().not.toHaveProperty('description');
    });

    it('removes excluded fields from array items when exclude_fields is provided', () => {
        type Result = GetProductImagesReturnType<undefined, readonly ['description']>;

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('is_thumbnail');
        expectTypeOf<Result[number]>().not.toHaveProperty('description');
    });

    it('returns only server-computed fields when E covers the full base union', () => {
        type E = readonly BaseProductImageField[];
        type Result = GetProductImagesReturnType<undefined, E>;

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('product_id');
        expectTypeOf<Result[number]>().toHaveProperty('date_modified');
        expectTypeOf<Result[number]>().not.toHaveProperty('description');
    });
});

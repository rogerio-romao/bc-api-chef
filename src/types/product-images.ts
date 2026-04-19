import type { BcRequestResponseMeta, FieldSelectionOptions, Prettify } from './api-types';

export interface ProductImage {
    id: number;
    product_id: number;
    is_thumbnail: boolean;
    sort_order: number;
    description: string;
    image_file: string;
    url_zoom: string;
    url_standard: string;
    url_thumbnail: string;
    url_tiny: string;
    date_modified: string;
    image_url?: string;
}

export type BaseProductImageField = keyof Omit<ProductImage, 'id' | 'product_id' | 'date_modified'>;

interface ProductImagePayloadCommon {
    is_thumbnail?: boolean;
    sort_order?: number;
    description?: string;
}

export type ProductImagePayloadItem =
    | (ProductImagePayloadCommon & { image_file: File; image_url?: never })
    | (ProductImagePayloadCommon & { image_url: string; image_file?: never });

export type ProductImagePayload = ProductImagePayloadItem[];

export interface BcGetProductImagesResponse {
    data: ProductImage[];
    meta: BcRequestResponseMeta;
}

export interface ApiImageQueryBase {
    page?: number;
    limit?: number;
}

export type ApiProductImagesQuery = ApiImageQueryBase &
    FieldSelectionOptions<BaseProductImageField>;

type ProductImageReturnBase<
    I extends readonly BaseProductImageField[] | undefined,
    E extends readonly BaseProductImageField[] | undefined,
> = I extends readonly BaseProductImageField[]
    ? Prettify<Pick<ProductImage, 'id' | I[number]>>
    : E extends readonly BaseProductImageField[]
      ? Prettify<Omit<ProductImage, E[number]>>
      : ProductImage;

export type GetProductImageReturnType<
    I extends readonly BaseProductImageField[] | undefined = undefined,
    E extends readonly BaseProductImageField[] | undefined = undefined,
> = ProductImageReturnBase<I, E>;

export type GetProductImagesReturnType<
    I extends readonly BaseProductImageField[] | undefined = undefined,
    E extends readonly BaseProductImageField[] | undefined = undefined,
> = ProductImageReturnBase<I, E>[];

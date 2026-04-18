import {
    buildQueryString,
    clampPerPageLimits,
    createResource,
    createResourceMultipart,
    deleteResource,
    fetchOne,
    fetchPaginated,
    updateResource,
    validatePositiveIntegers,
} from '@/v3Api/utils';

import type { BcApiChefOptions, BcApiChefResult, Prettify } from '@/types/api-types';
import type {
    ApiImageQueryBase,
    BaseProductImageField,
    ProductImage,
    ProductImagePayloadItem,
} from '@/types/product-images';

export default class ProductImages {
    private accessToken: string;
    private apiUrl: string;
    private options: Required<BcApiChefOptions>;

    constructor(accessToken: string, apiUrl: string, options?: BcApiChefOptions) {
        this.accessToken = accessToken;
        this.apiUrl = apiUrl;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    public async getImage<I extends readonly BaseProductImageField[]>(
        productId: number,
        imageId: number,
        query: { include_fields: I; exclude_fields?: never },
    ): Promise<BcApiChefResult<Prettify<Pick<ProductImage, 'id' | I[number]>>>>;

    public async getImage<E extends readonly BaseProductImageField[]>(
        productId: number,
        imageId: number,
        query: { include_fields?: never; exclude_fields: E },
    ): Promise<BcApiChefResult<Prettify<Omit<ProductImage, E[number]>>>>;

    public async getImage(
        productId: number,
        imageId: number,
        query?: undefined,
    ): Promise<BcApiChefResult<ProductImage>>;

    public async getImage(
        productId: number,
        imageId: number,
        query?: {
            include_fields?: readonly BaseProductImageField[];
            exclude_fields?: readonly BaseProductImageField[];
        },
    ): Promise<BcApiChefResult<ProductImage>> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return { error: idsValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const querySuffix = buildQueryString(query);
        const url = `${this.apiUrl}/${productId}/images/${imageId}${querySuffix}`;

        return await fetchOne<ProductImage>(url, this.accessToken);
    }

    public async getImages<I extends readonly BaseProductImageField[]>(
        productId: number,
        query: ApiImageQueryBase & { include_fields: I; exclude_fields?: never },
    ): Promise<BcApiChefResult<Prettify<Pick<ProductImage, 'id' | I[number]>>[]>>;

    public async getImages<E extends readonly BaseProductImageField[]>(
        productId: number,
        query: ApiImageQueryBase & { include_fields?: never; exclude_fields: E },
    ): Promise<BcApiChefResult<Prettify<Omit<ProductImage, E[number]>>[]>>;

    public async getImages(
        productId: number,
        query?: ApiImageQueryBase,
    ): Promise<BcApiChefResult<ProductImage[]>>;

    public async getImages(
        productId: number,
        query?: ApiImageQueryBase & {
            include_fields?: readonly BaseProductImageField[];
            exclude_fields?: readonly BaseProductImageField[];
        },
    ): Promise<BcApiChefResult<ProductImage[]>> {
        const idValidOrError = validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            } as BcApiChefResult<ProductImage[]>;
        }

        const querySuffix = buildQueryString(query);
        const url = `${this.apiUrl}/${productId}/images${querySuffix}`;
        const limit = clampPerPageLimits(query?.limit);

        return (await fetchPaginated<ProductImage>(
            url,
            this.accessToken,
            limit,
            query?.page,
        )) as BcApiChefResult<ProductImage[]>;
    }

    public async deleteImage(productId: number, imageId: number): Promise<BcApiChefResult<null>> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            } as BcApiChefResult<null>;
        }

        const url = `${this.apiUrl}/${productId}/images/${imageId}`;

        return await deleteResource(url, this.accessToken);
    }

    public async createImage(
        productId: number,
        imageData: ProductImagePayloadItem,
    ): Promise<BcApiChefResult<Prettify<ProductImage>>> {
        const idValidOrError = validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            } as BcApiChefResult<Prettify<ProductImage>>;
        }

        const validationError = this.validateCreateImagePayload(imageData);

        if (validationError) {
            return {
                error: validationError,
                ok: false,
                statusCode: 400,
            } as BcApiChefResult<Prettify<ProductImage>>;
        }

        const url = `${this.apiUrl}/${productId}/images`;

        if ('image_file' in imageData) {
            const formData = new FormData();
            formData.append('image_file', imageData.image_file);
            if (imageData.is_thumbnail !== undefined) {
                formData.append('is_thumbnail', String(imageData.is_thumbnail));
            }
            if (imageData.sort_order !== undefined) {
                formData.append('sort_order', String(imageData.sort_order));
            }
            if (imageData.description !== undefined) {
                formData.append('description', imageData.description);
            }
            return await createResourceMultipart<ProductImage>(url, this.accessToken, formData);
        }

        return await createResource<ProductImage, ProductImagePayloadItem>(
            url,
            this.accessToken,
            imageData,
        );
    }

    public async updateImage(
        productId: number,
        imageId: number,
        imageData: Partial<ProductImage>,
    ): Promise<BcApiChefResult<Prettify<ProductImage>>> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            } as BcApiChefResult<Prettify<ProductImage>>;
        }

        const validationError = this.validateUpdateImagePayload(imageData);

        if (validationError) {
            return {
                error: validationError,
                ok: false,
                statusCode: 400,
            } as BcApiChefResult<Prettify<ProductImage>>;
        }

        const url = `${this.apiUrl}/${productId}/images/${imageId}`;

        return await updateResource<ProductImage, Partial<ProductImage>>(
            url,
            this.accessToken,
            imageData,
        );
    }

    validateCreateImagePayload(imageData: ProductImagePayloadItem): string | null {
        if ('image_file' in imageData && 'image_url' in imageData) {
            return 'Payload cannot contain both image_file and image_url';
        }

        if (!('image_file' in imageData) && !('image_url' in imageData)) {
            return 'Payload must contain either image_file or image_url';
        }

        return this.validateSharedImageFields(imageData);
    }

    validateUpdateImagePayload(imageData: Partial<ProductImage>): string | null {
        if ('image_file' in imageData && 'image_url' in imageData) {
            return 'Payload cannot contain both image_file and image_url';
        }

        return this.validateSharedImageFields(imageData);
    }

    private validateSharedImageFields(
        imageData: ProductImagePayloadItem | Partial<ProductImage>,
    ): string | null {
        if (imageData.image_url && imageData.image_url.length > 255) {
            return 'image_url cannot exceed 255 characters';
        }

        if (
            imageData.sort_order !== undefined &&
            (imageData.sort_order < -2_147_483_648 ||
                imageData.sort_order > 2_147_483_647 ||
                !Number.isInteger(imageData.sort_order))
        ) {
            return 'sort_order must be an integer between -2,147,483,648 and 2,147,483,647';
        }

        return null;
    }
}

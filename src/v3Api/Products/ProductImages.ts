// oxlint-disable max-lines

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

import type { ApiResult, BcApiChefOptions, Prettify } from '@/types/api-types';
import type {
    ApiImageQueryBase,
    BaseProductImageField,
    ProductImage,
    ProductImagePayloadItem,
    ProductImageUpdatePayload,
} from '@/types/product-images';

/**
 * ProductImages provides methods for managing product images in the BigCommerce store.
 * It is accessible via the `images()` method on the main `Products` class.
 * All methods return a {@link ApiResult}, which is either `{ data: T; ok: true; }` on success or `{ error: string; ok: false; statusCode: number }` on failure.
 *
 * Public methods:
 * - {@link ProductImages#createImage}: Create a new product image, either by uploading a file or by providing an image URL.
 * - {@link ProductImages#getImages}: Fetch all images for a product, with pagination support.
 * - {@link ProductImages#getImage}: Fetch a single product image by ID.
 * - {@link ProductImages#updateImage}: Update an existing product image's data.
 * - {@link ProductImages#deleteImage}: Delete a product image by ID.
 */
export default class ProductImages {
    private accessToken: string;
    private apiUrl: string;
    private options: Required<BcApiChefOptions>;

    /**
     * @param accessToken BigCommerce API access token.
     * @param apiUrl Base URL for product images endpoint.
     * @param options Optional configuration for API requests, such as retries and validation.
     * @param options.validate When `true`, runtime validation runs on responses received from BigCommerce before they are returned to the caller. Defaults to `false`.
     * @param options.retries Number of times to retry a failed HTTP request before surfacing the error. Forwarded to the underlying `tchef` HTTP client. Defaults to `0` (no retries).
     * @todo Gate runtime response validation on `this.options.validate`.
     * @todo Forward `this.options.retries` to every `tchef()` call in this class.
     */
    constructor(accessToken: string, apiUrl: string, options?: BcApiChefOptions) {
        this.accessToken = accessToken;
        this.apiUrl = apiUrl;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                         PRODUCT IMAGES CRUD METHODS                        */
    /* -------------------------------------------------------------------------- */

    /* ------------------------------ CREATE IMAGE ------------------------------ */
    /**
     * Create a new product image, either by uploading a file or by providing an image URL. The payload must contain exactly one of `image_file` or `image_url`. That means sending a multipart form-data request with an `image_file` field, or a JSON request with an `image_url` field.
     * @param productId The ID of the product to create the image for.
     * @param imageData The data for the new product image, either as a file upload or an image URL, along with optional fields like `is_thumbnail`, `sort_order`, and `description`.
     * @returns {ApiResult<ProductImage>} The created product image or an error result.
     */
    public async createImage(
        productId: number,
        imageData: ProductImagePayloadItem,
    ): ApiResult<ProductImage> {
        const idValidOrError = validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            };
        }

        const validationError = this.validateCreateImagePayload(imageData);

        if (validationError) {
            return {
                error: validationError,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/images`;

        // Send a multipart/form-data request if `image_file` is present, otherwise send a JSON request.
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

    /* ------------------------------- GET IMAGES ------------------------------- */
    /**
     * Fetch all images for a product, with pagination support. There are three overloads of this method:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no query options, returning the full product images.
     *
     * @param productId The ID of the product to fetch images for.
     * @param options Query options for pagination and field selection. The pagination options are `page` and `limit`.
     * @param options.include_fields - An array of top-level product image fields to include in the response. For example, `['description', 'sort_order']` will return only the `id`, `description`, and `sort_order` fields for each product image. Mutually exclusive with `exclude_fields`.
     * @param options.exclude_fields - An array of top-level product image fields to exclude from the response. For example, `['url_standard', 'url_zoom']` will return all fields except `url_standard` and `url_zoom` for each product image. Mutually exclusive with `include_fields`.
     * @returns {ApiResult<ProductImage[]>} An array of product images or an error result.
     */
    public async getImages<I extends readonly BaseProductImageField[]>(
        productId: number,
        options: ApiImageQueryBase & { include_fields: I; exclude_fields?: never },
    ): ApiResult<Pick<ProductImage, 'id' | I[number]>[]>;

    public async getImages<E extends readonly BaseProductImageField[]>(
        productId: number,
        options: ApiImageQueryBase & { include_fields?: never; exclude_fields: E },
    ): ApiResult<Omit<ProductImage, E[number]>[]>;

    public async getImages(
        productId: number,
        options?: ApiImageQueryBase,
    ): ApiResult<ProductImage[]>;

    public async getImages(
        productId: number,
        options?: ApiImageQueryBase & {
            include_fields?: readonly BaseProductImageField[];
            exclude_fields?: readonly BaseProductImageField[];
        },
    ): ApiResult<ProductImage[]> {
        const idValidOrError = validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/images${querySuffix}`;
        const limit = clampPerPageLimits(options?.limit);

        return await fetchPaginated<ProductImage>(url, this.accessToken, limit, options?.page);
    }

    /* -------------------------------- GET IMAGE ------------------------------- */
    /**
     * Fetch a single product image by ID. There are three overloads of this method:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no options, returning the full product image.
     *
     * @param productId ID of the product the image belongs to.
     * @param imageId ID of the image to fetch.
     * @param options Optional parameters to include or exclude specific fields.
     * @param options.include_fields - An array of top-level product image fields to include in the response. For example, `['description', 'sort_order']` will return only the `id`, `description`, and `sort_order` fields for the product image. Mutually exclusive with `exclude_fields`.
     * @param options.exclude_fields - An array of top-level product image fields to exclude from the response. For example, `['url_standard', 'url_zoom']` will return all fields except `url_standard` and `url_zoom` for the product image. Mutually exclusive with `include_fields`.
     * @returns {ApiResult<ProductImage>} The requested product image or an error result.
     */
    public async getImage<I extends readonly BaseProductImageField[]>(
        productId: number,
        imageId: number,
        options: { include_fields: I; exclude_fields?: never },
    ): ApiResult<Pick<ProductImage, 'id' | I[number]>>;

    public async getImage<E extends readonly BaseProductImageField[]>(
        productId: number,
        imageId: number,
        options: { include_fields?: never; exclude_fields: E },
    ): ApiResult<Omit<ProductImage, E[number]>>;

    public async getImage(
        productId: number,
        imageId: number,
        options?: undefined,
    ): ApiResult<ProductImage>;

    public async getImage(
        productId: number,
        imageId: number,
        options?: {
            include_fields?: readonly BaseProductImageField[];
            exclude_fields?: readonly BaseProductImageField[];
        },
    ): ApiResult<ProductImage> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return { error: idsValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/images/${imageId}${querySuffix}`;

        return await fetchOne<ProductImage>(url, this.accessToken);
    }

    /* ------------------------------- UPDATE IMAGE ------------------------------ */
    /**
     * Update an existing product image's data. The payload can contain any subset of updatable fields, but cannot contain both `image_file` and `image_url`. That means sending a multipart form-data request with an optional `image_file` field, or a JSON request with an optional `image_url` field. The response will always return the full product image.
     *
     * @param productId ID of the product the image belongs to.
     * @param imageId ID of the image to update.
     * @param imageData The data to update for the product image, either as a file upload or an image URL, along with optional fields like `is_thumbnail`, `sort_order`, and `description`.
     * @returns {ApiResult<ProductImage>} The updated product image or an error result.
     */
    public async updateImage(
        productId: number,
        imageId: number,
        imageData: ProductImageUpdatePayload,
    ): ApiResult<ProductImage> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const validationError = this.validateUpdateImagePayload(imageData);

        if (validationError) {
            return {
                error: validationError,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/images/${imageId}`;

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
            return await this.updateResourceMultipart<ProductImage>(url, formData);
        }

        return await updateResource<ProductImage, ProductImageUpdatePayload>(
            url,
            this.accessToken,
            imageData,
        );
    }

    /* ------------------------------- DELETE IMAGE ------------------------------ */
    /**
     * Delete a product image by ID.
     *
     * @param productId ID of the product the image belongs to.
     * @param imageId ID of the image to delete.
     * @returns {ApiResult<null>} An empty result on success or an error result.
     */
    public async deleteImage(productId: number, imageId: number): ApiResult<null> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/images/${imageId}`;

        return await deleteResource(url, this.accessToken);
    }

    /* -------------------------------------------------------------------------- */
    /*                             VALIDATION METHODS                             */
    /* -------------------------------------------------------------------------- */

    /**
     * Validates the payload for creating a product image. Ensures that either `image_file` or `image_url` is present (but not both), and that common fields like `sort_order` are within valid ranges.
     * @param imageData The payload to validate for creating a product image.
     * @returns { string | null } A string error message if validation fails, or `null` if the payload is valid.
     */
    private validateCreateImagePayload(imageData: ProductImagePayloadItem): string | null {
        if (!('image_file' in imageData) && !('image_url' in imageData)) {
            return 'Payload must contain either image_file or image_url';
        }

        return this.validateCommonImageFields(imageData);
    }

    /**
     * Validates the payload for updating a product image. Ensures that if `image_file` or `image_url` is present, they are not both present, and that common fields like `sort_order` are within valid ranges.
     * @param imageData The payload to validate for updating a product image.
     * @returns { string | null } A string error message if validation fails, or `null` if the payload is valid.
     */
    private validateUpdateImagePayload(imageData: ProductImageUpdatePayload): string | null {
        return this.validateCommonImageFields(imageData);
    }

    /**
     * Validates the fields that are common to both create and update payloads for product images. Specifically, it checks that `image_file` and `image_url` are not both present, that `image_url` does not exceed 255 characters, and that `sort_order`, if present, is an integer within the valid range for a 32-bit signed integer.
     * @param imageData The payload to validate for common product image fields.
     * @returns { string | null } A string error message if validation fails, or `null` if the payload is valid.
     */
    private validateCommonImageFields(imageData: ProductImageUpdatePayload): string | null {
        if ('image_file' in imageData && 'image_url' in imageData) {
            return 'Payload cannot contain both image_file and image_url';
        }

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

    /**
     * Sends a multipart `PUT` request for image updates that include a file upload.
     * @param url Fully-built request URL.
     * @param formData Multipart payload to send.
     * @returns {ApiResult<T>} The updated resource or an error result.
     */
    private async updateResourceMultipart<T>(url: string, formData: FormData): ApiResult<T> {
        try {
            const response = await fetch(url, {
                body: formData,
                headers: {
                    Accept: 'application/json',
                    'X-Auth-Token': this.accessToken,
                },
                method: 'PUT',
            });

            if (!response.ok) {
                return {
                    error: response.statusText || `Request failed with status ${response.status}`,
                    ok: false,
                    statusCode: response.status,
                };
            }

            const json = (await response.json()) as { data: T };

            return { data: json.data as Prettify<T>, ok: true };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network Error',
                ok: false,
                statusCode: 500,
            };
        }
    }
}

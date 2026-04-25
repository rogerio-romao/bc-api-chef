import {
    buildQueryString,
    clampPerPageLimits,
    createResource,
    createResourceMultipart,
    deleteResource,
    fetchOne,
    fetchPaginated,
    updateResource,
    updateResourceMultipart,
    validatePositiveIntegers,
} from '@/v3Api/utils';

import type { ApiResult, RetryConfig, StandardSchemaV1 } from '@/types/api-types';
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
 * - {@link ProductImages#create}: Create a new product image, either by uploading a file or by providing an image URL.
 * - {@link ProductImages#getMultiple}: Fetch all images for a product, with pagination support.
 * - {@link ProductImages#getOne}: Fetch a single product image by ID.
 * - {@link ProductImages#update}: Update an existing product image's data.
 * - {@link ProductImages#remove}: Delete a product image by ID.
 */
export default class ProductImages {
    private accessToken: string;
    private apiUrl: string;

    /**
     * @param accessToken BigCommerce API access token.
     * @param apiUrl Base URL for product images endpoint.
     */
    constructor(accessToken: string, apiUrl: string) {
        this.accessToken = accessToken;
        this.apiUrl = apiUrl;
    }

    /* -------------------------------------------------------------------------- */
    /*                         PRODUCT IMAGES CRUD METHODS                        */
    /* -------------------------------------------------------------------------- */

    /* ------------------------------ CREATE IMAGE ------------------------------ */
    /**
     * Create a new product image, either by uploading a file or by providing an image URL. The payload must contain exactly one of `image_file` or `image_url`. That means sending a multipart form-data request with an `image_file` field, or a JSON request with an `image_url` field.
     * @param productId The ID of the product to create the image for.
     * @param imageData The data for the new product image, either as a file upload or an image URL, along with optional fields like `is_thumbnail`, `sort_order`, and `description`.
     * @param options Optional parameters for the request.
     * @param options.schema - A Standard Schema to validate the API response against. If validation fails, the method will return a 422 error with details about the validation failure.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<ProductImage>} The created product image or an error result.
     */
    public async create(
        productId: number,
        imageData: ProductImagePayloadItem,
        options?: { schema?: StandardSchemaV1; retries?: RetryConfig },
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
            return await createResourceMultipart<ProductImage>(
                url,
                this.accessToken,
                formData,
                options?.schema,
                options?.retries,
            );
        }

        return await createResource(
            url,
            this.accessToken,
            imageData,
            options?.schema,
            options?.retries,
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
     * @param options.schema - A Standard Schema to validate each item in the API response against. If validation fails for any item, the method will return a 422 error with details about the validation failure. Validation is performed on each page of results as they are fetched, so if you are paginating through results and a later page contains invalid data, you will still get a 422 error without having to wait for all pages to be fetched.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<ProductImage[]>} An array of product images or an error result.
     */
    public async getMultiple<I extends readonly BaseProductImageField[]>(
        productId: number,
        options: ApiImageQueryBase & {
            include_fields: I;
            exclude_fields?: never;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<Pick<ProductImage, 'id' | I[number]>[]>;

    public async getMultiple<E extends readonly BaseProductImageField[]>(
        productId: number,
        options: ApiImageQueryBase & {
            include_fields?: never;
            exclude_fields: E;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<Omit<ProductImage, E[number]>[]>;

    public async getMultiple(
        productId: number,
        options?: ApiImageQueryBase & { schema?: StandardSchemaV1; retries?: RetryConfig },
    ): ApiResult<ProductImage[]>;

    public async getMultiple(
        productId: number,
        options?: ApiImageQueryBase & {
            include_fields?: readonly BaseProductImageField[];
            exclude_fields?: readonly BaseProductImageField[];
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
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

        const { schema, retries, ...queryOptions } = options ?? {};
        const querySuffix = buildQueryString(queryOptions);
        const url = `${this.apiUrl}/${productId}/images${querySuffix}`;
        const limit = clampPerPageLimits(queryOptions.limit);

        return await fetchPaginated<ProductImage>(
            url,
            this.accessToken,
            limit,
            queryOptions?.page,
            schema,
            retries,
        );
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
     * @param options.schema - A Standard Schema to validate the API response against. If validation fails, the method will return a 422 error with details about the validation failure.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<ProductImage>} The requested product image or an error result.
     */
    public async getOne<I extends readonly BaseProductImageField[]>(
        productId: number,
        imageId: number,
        options: {
            include_fields: I;
            exclude_fields?: never;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<Pick<ProductImage, 'id' | I[number]>>;

    public async getOne<E extends readonly BaseProductImageField[]>(
        productId: number,
        imageId: number,
        options: {
            include_fields?: never;
            exclude_fields: E;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<Omit<ProductImage, E[number]>>;

    public async getOne(
        productId: number,
        imageId: number,
        options?: { schema?: StandardSchemaV1; retries?: RetryConfig },
    ): ApiResult<ProductImage>;

    public async getOne(
        productId: number,
        imageId: number,
        options?: {
            include_fields?: readonly BaseProductImageField[];
            exclude_fields?: readonly BaseProductImageField[];
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<ProductImage> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return { error: idsValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const { schema, retries, ...queryOptions } = options ?? {};
        const querySuffix = buildQueryString(queryOptions);
        const url = `${this.apiUrl}/${productId}/images/${imageId}${querySuffix}`;

        return await fetchOne<ProductImage>(url, this.accessToken, schema, retries);
    }

    /* ------------------------------- UPDATE IMAGE ------------------------------ */
    /**
     * Update an existing product image's data. The payload can contain any subset of updatable fields, but cannot contain both `image_file` and `image_url`. That means sending a multipart form-data request with an optional `image_file` field, or a JSON request with an optional `image_url` field. The response will always return the full product image.
     *
     * @param productId ID of the product the image belongs to.
     * @param imageId ID of the image to update.
     * @param imageData The data to update for the product image, either as a file upload or an image URL, along with optional fields like `is_thumbnail`, `sort_order`, and `description`.
     * @param options Optional parameters for the request.
     * @param options.schema - A Standard Schema to validate the API response against. If validation fails, the method will return a 422 error with details about the validation failure.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<ProductImage>} The updated product image or an error result.
     */
    public async update(
        productId: number,
        imageId: number,
        imageData: ProductImageUpdatePayload,
        options?: { schema?: StandardSchemaV1; retries?: RetryConfig },
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
            return await updateResourceMultipart<ProductImage>(
                url,
                this.accessToken,
                formData,
                options?.schema,
                options?.retries,
            );
        }

        return await updateResource(
            url,
            this.accessToken,
            imageData,
            options?.schema,
            options?.retries,
        );
    }

    /* ------------------------------- DELETE IMAGE ------------------------------ */
    /**
     * Delete a product image by ID.
     *
     * @param productId ID of the product the image belongs to.
     * @param imageId ID of the image to delete.
     * @param options Optional parameters for the request.
     * @param options.retries - Optional retry configuration to automatically retry the request on transient errors.
     * @returns {ApiResult<null>} An empty result on success or an error result.
     */
    public async remove(
        productId: number,
        imageId: number,
        options?: { retries?: RetryConfig },
    ): ApiResult<null> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ imageId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/images/${imageId}`;

        return await deleteResource(url, this.accessToken, options?.retries);
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
}

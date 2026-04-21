import {
    buildQueryString,
    clampPerPageLimits,
    createResource,
    deleteResource,
    fetchOne,
    fetchPaginated,
    updateResource,
    validatePositiveIntegers,
} from '@/v3Api/utils.ts';

import type { ApiResult, BcApiChefOptions } from '@/types/api-types';
import type {
    NoIdProductCustomField,
    ProductCustomField,
    ProductCustomFieldField,
} from '@/types/product-custom-fields';

/**
 * The ProductCustomFields class provides methods to manage custom fields for products in BigCommerce.
 * It is accessed via the `customFields()` method on the main `Products` class, which provides the base URL and access token.
 * All methods return a {@link ApiResult}, which is either `{ data: T; ok: true; }` on success or `{ error: string; ok: false; statusCode: number }` on failure.
 *
 * Public methods:
 * - {@link create}: Create a new custom field for a product.
 * - {@link getMultiple}: Fetch multiple custom fields for a product, with support for pagination and field selection.
 * - {@link getOne}: Fetch a single custom field by its ID, with support for field selection.
 * - {@link update}: Update an existing custom field's data by its ID.
 * - {@link remove}: Delete a custom field by its ID.
 *
 * The class also includes private validation methods to ensure that payloads for creating and updating custom fields meet the required criteria before making API requests.
 */
export default class ProductCustomFields {
    private accessToken: string;
    private apiUrl: string;
    private options: Required<BcApiChefOptions>;

    /**
     * Creates an instance of the ProductCustomFields class.
     *
     * @param accessToken - The access token for authenticating API requests.
     * @param apiUrl - The base URL for the product custom fields API endpoints, typically in the format `${baseUrlWithVersion}/products`.
     * @param options - Optional configuration options for the API client, such as validation and retry settings.
     * @param options.validate When `true`, runtime validation runs on responses received from BigCommerce before they are returned to the caller. Defaults to `false`.
     * @param options.retries Number of times to retry a failed HTTP request before surfacing the error. Forwarded to the underlying `tchef` HTTP client. Defaults to `0` (no retries).
     * @todo Gate runtime response validation on `this.options.validate`.
     * @todo Forward `this.options.retries` to every `tchef()` call in this class.
     */
    constructor(accessToken: string, apiUrl: string, options: BcApiChefOptions = {}) {
        this.accessToken = accessToken;
        this.apiUrl = apiUrl;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                     PRODUCT CUSTOM FIELDS CRUD METHODS                     */
    /* -------------------------------------------------------------------------- */

    /* ----------------------- CREATE PRODUCT CUSTOM FIELD ---------------------- */
    /**
     * Creates a new product custom field for a given product.
     *
     * @param productId - The ID of the product to create the custom field for.
     * @param customFieldData - The data for the new custom field.
     * @returns {ApiResult<ProductCustomField>} The created product custom field, or an error if validation fails or the API request fails.
     */
    public async create(
        productId: number,
        customFieldData: NoIdProductCustomField,
    ): ApiResult<ProductCustomField> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const payloadValidationError = this.validateCreateCustomFieldPayload(customFieldData);

        if (payloadValidationError) {
            return {
                error: payloadValidationError,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/custom-fields`;

        return await createResource(url, this.accessToken, customFieldData);
    }

    /* ------------------------ GET PRODUCT CUSTOM FIELDS ----------------------- */
    /**
     * Fetches multiple product custom fields for a given product. There are three overloads for this method:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no field selection, returning the full `ProductCustomField` objects.
     *
     * @param productId - The ID of the product to fetch custom fields for.
     * @param options - Optional query parameters to specify which fields to include or exclude in the response, as well as pagination options.
     * @param options.include_fields - An array of field names to include in the response. Cannot be used with `exclude_fields`.
     * @param options.exclude_fields - An array of field names to exclude from the response. Cannot be used with `include_fields`.
     * @param options.page - The page number to fetch.
     * @param options.limit - The number of items per page.
     * @returns {ApiResult<ProductCustomField[]>} The requested product custom fields, or an error if validation fails or the API request fails.
     */
    public async getMultiple<I extends readonly ProductCustomFieldField[]>(
        productId: number,
        options?: {
            include_fields?: I;
            exclude_fields?: never;
            page?: number;
            limit?: number;
        },
    ): ApiResult<Pick<ProductCustomField, 'id' | I[number]>[]>;

    public async getMultiple<E extends readonly ProductCustomFieldField[]>(
        productId: number,
        options?: {
            include_fields?: never;
            exclude_fields?: E;
            page?: number;
            limit?: number;
        },
    ): ApiResult<Omit<ProductCustomField, E[number]>[]>;

    public async getMultiple(
        productId: number,
        options?: {
            page?: number;
            limit?: number;
        },
    ): ApiResult<ProductCustomField[]>;

    public async getMultiple(
        productId: number,
        options?: {
            include_fields?: readonly ProductCustomFieldField[];
            exclude_fields?: readonly ProductCustomFieldField[];
            page?: number;
            limit?: number;
        },
    ): ApiResult<ProductCustomField[]> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/custom-fields${querySuffix}`;
        const limit = clampPerPageLimits(options?.limit);

        return await fetchPaginated<ProductCustomField>(
            url,
            this.accessToken,
            limit,
            options?.page,
        );
    }

    /* ------------------------ GET PRODUCT CUSTOM FIELD ------------------------ */
    /**
     * Fetches a single product custom field by its ID. There are three overloads for this method:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no field selection, returning the full `ProductCustomField` object.
     *
     * @param productId - The ID of the product the custom field belongs to.
     * @param customFieldId - The ID of the custom field to fetch.
     * @param options - Optional query parameters to specify which fields to include or exclude in the response.
     * @param options.include_fields - An array of field names to include in the response. Cannot be used with `exclude_fields`.
     * @param options.exclude_fields - An array of field names to exclude from the response. Cannot be used with `include_fields`.
     * @returns {ApiResult<ProductCustomField>} The requested product custom field, or an error if validation fails or the API request fails.
     */
    public async getOne<I extends readonly ProductCustomFieldField[]>(
        productId: number,
        customFieldId: number,
        options?: {
            include_fields: I;
            exclude_fields?: never;
        },
    ): ApiResult<Pick<ProductCustomField, 'id' | I[number]>>;

    public async getOne<E extends readonly ProductCustomFieldField[]>(
        productId: number,
        customFieldId: number,
        options?: {
            include_fields?: never;
            exclude_fields: E;
        },
    ): ApiResult<Omit<ProductCustomField, E[number]>>;

    public async getOne(
        productId: number,
        customFieldId: number,
        options?: {
            include_fields?: readonly ProductCustomFieldField[];
            exclude_fields?: readonly ProductCustomFieldField[];
        },
    ): ApiResult<ProductCustomField> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ customFieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/custom-fields/${customFieldId}${querySuffix}`;

        return await fetchOne<ProductCustomField>(url, this.accessToken);
    }

    /* ----------------------- UPDATE PRODUCT CUSTOM FIELD ---------------------- */
    /**
     * Updates a product custom field by its ID.
     *
     * @param productId - The ID of the product.
     * @param customFieldId - The ID of the custom field to update.
     * @param customFieldData - The partial custom field data to update.
     * @returns {ApiResult<ProductCustomField>} The result of the update operation.
     */
    public async update(
        productId: number,
        customFieldId: number,
        customFieldData: Partial<NoIdProductCustomField>,
    ): ApiResult<ProductCustomField> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ customFieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const payloadValidationError = this.validateUpdateCustomFieldPayload(customFieldData);

        if (payloadValidationError) {
            return {
                error: payloadValidationError,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/custom-fields/${customFieldId}`;

        return await updateResource(url, this.accessToken, customFieldData);
    }

    /* ----------------------- DELETE PRODUCT CUSTOM FIELD ---------------------- */
    /**
     * Removes a product custom field by its ID.
     *
     * @param productId - The ID of the product.
     * @param customFieldId - The ID of the custom field to remove.
     * @returns {ApiResult<null>} The result of the remove operation.
     */
    public async remove(productId: number, customFieldId: number): ApiResult<null> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ customFieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/custom-fields/${customFieldId}`;

        return await deleteResource(url, this.accessToken);
    }

    /* -------------------------------------------------------------------------- */
    /*                             VALIDATION METHODS                             */
    /* -------------------------------------------------------------------------- */

    /**
     * Validates the payload for creating a product custom field. Both name and value are required, must be strings, and cannot exceed 250 characters.
     * @param customFieldData - The custom field data to validate for a create operation.
     * @returns {string | null} A string error message if validation fails, or null if the payload is valid.
     */
    private validateCreateCustomFieldPayload(
        customFieldData: NoIdProductCustomField,
    ): string | null {
        if (!customFieldData.name || !customFieldData.value) {
            return 'Both name and value are required to create a product custom field.';
        }

        if (typeof customFieldData.name !== 'string' || typeof customFieldData.value !== 'string') {
            return 'Both name and value must be strings.';
        }

        if (customFieldData.name.length > 250) {
            return 'Name cannot exceed 250 characters.';
        }

        if (customFieldData.name.length === 0) {
            return 'Name cannot be empty.';
        }

        if (customFieldData.value.length > 250) {
            return 'Value cannot exceed 250 characters.';
        }

        if (customFieldData.value.length === 0) {
            return 'Value cannot be empty.';
        }

        return null;
    }

    /**
     * Validates the payload for updating a product custom field. At least one of name or value must be provided, and if provided they must be non-empty strings not exceeding 250 characters.
     * @param customFieldData - The partial custom field data to validate for an update operation.
     * @returns {string | null} A string error message if validation fails, or null if the payload is valid.
     */
    private validateUpdateCustomFieldPayload(
        customFieldData: Partial<NoIdProductCustomField>,
    ): string | null {
        if (customFieldData.name === undefined && customFieldData.value === undefined) {
            return 'At least one of name or value must be provided to update a product custom field.';
        }

        if (customFieldData.name !== undefined) {
            if (typeof customFieldData.name !== 'string') {
                return 'Name must be a string.';
            }

            if (customFieldData.name.length > 250) {
                return 'Name cannot exceed 250 characters.';
            }

            if (customFieldData.name.length === 0) {
                return 'Name cannot be empty.';
            }
        }

        if (customFieldData.value !== undefined) {
            if (typeof customFieldData.value !== 'string') {
                return 'Value must be a string.';
            }

            if (customFieldData.value.length > 250) {
                return 'Value cannot exceed 250 characters.';
            }

            if (customFieldData.value.length === 0) {
                return 'Value cannot be empty.';
            }
        }

        return null;
    }
}

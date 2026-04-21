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
    ApiMetafieldQueryBase,
    BaseMetafieldField,
    CreateMetafieldPayload,
    ProductMetafield,
} from '@/types/product-metafields';

/**
 * ProductMetafields provides methods for managing product metafields in the BigCommerce store.
 * It is accessible via the `metafields()` method on the main `Products` class.
 * All methods return a {@link ApiResult}, which is either `{ data: T; ok: true; }` on success or `{ error: string; ok: false; statusCode: number }` on failure.
 *
 * Public methods:
 * - {@link ProductMetafields.create} — `POST` a new metafield.
 * - {@link ProductMetafields.getMultiple} — paginated list, auto-collects every page, or single page if `page` is specified.
 * - {@link ProductMetafields.getOne} — fetch a single metafield by product and metafield id.
 * - {@link ProductMetafields.update} — `PUT` an existing metafield.
 * - {@link ProductMetafields.remove} — `DELETE` a metafield by id.
 */
export default class ProductMetafields {
    private accessToken: string;
    private apiUrl: string;
    private options: Required<BcApiChefOptions>;

    /**
     * @param accessToken BigCommerce API access token, sent as `X-Auth-Token` on every request.
     * @param apiUrl Base metafields API URL, already scoped to `catalog/products/{productId}/metafields`.
     * @param options Shared client options propagated from `BcApiChef`.
     * `validate` controls runtime response validation before results are returned
     * to callers, and `retries` is reserved for retry support in downstream HTTP
     * calls.
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
    /*                       PRODUCT METAFIELDS CRUD METHODS                      */
    /* -------------------------------------------------------------------------- */

    /* ---------------------------- CREATE METAFIELD ---------------------------- */
    /**
     * Creates a new metafield for a product.
     * @param productId Product ID.
     * @param metafieldData Metafield data to create.
     * @returns {ApiResult<ProductMetafield>} The created metafield or an error result.
     */
    public async create(
        productId: number,
        metafieldData: CreateMetafieldPayload,
    ): ApiResult<ProductMetafield> {
        const idValidOrError = validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            };
        }

        const validationError = this.validateCreateMetafieldPayload(metafieldData);

        if (validationError) {
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const url = `${this.apiUrl}/${productId}/metafields`;

        return await createResource(url, this.accessToken, metafieldData);
    }

    /* ----------------------------- GET METAFIELDS ----------------------------- */
    /**
     * Fetches all metafields across every page, or a single page if `query.page` is supplied. There are three overloads:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no field options, returning the full `ProductMetafield` type.
     * @param productId Product ID.
     * @param options Query and include/exclude field options. Supply `page` to fetch a single page instead of auto-collecting every page, limit to control results per page, and the various filter/sort query params supported by the BC API.
     * @param options.include_fields When provided, only these fields are included in the returned metafield objects, alongside `id`. Cannot be used with `exclude_fields`.
     * @param options.exclude_fields When provided, these fields are excluded from the returned metafield objects. Cannot be used with `include_fields`.
     * @returns {ApiResult<ProductMetafield[]>} The collected metafields or an error result.
     */
    public async getMultiple<I extends readonly BaseMetafieldField[]>(
        productId: number,
        options: ApiMetafieldQueryBase & { include_fields: I; exclude_fields?: never },
    ): ApiResult<Pick<ProductMetafield, 'id' | I[number]>[]>;

    public async getMultiple<E extends readonly BaseMetafieldField[]>(
        productId: number,
        options: ApiMetafieldQueryBase & { include_fields?: never; exclude_fields: E },
    ): ApiResult<Omit<ProductMetafield, E[number]>[]>;

    public async getMultiple(
        productId: number,
        options?: ApiMetafieldQueryBase,
    ): ApiResult<ProductMetafield[]>;

    public async getMultiple(
        productId: number,
        options?: ApiMetafieldQueryBase & {
            include_fields?: readonly BaseMetafieldField[];
            exclude_fields?: readonly BaseMetafieldField[];
        },
    ): ApiResult<ProductMetafield[]> {
        const idValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idValidOrErrorMsg !== true) {
            return { error: idValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/metafields${querySuffix}`;
        const limit = clampPerPageLimits(options?.limit);

        return await fetchPaginated<ProductMetafield>(url, this.accessToken, limit, options?.page);
    }

    /* ------------------------------ GET METAFIELD ----------------------------- */
    /**
     * Fetches a single metafield by product and metafield ID. There are three overloads:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no field options, returning the full `ProductMetafield` type.
     *
     * @param productId Product ID.
     * @param metafieldId Metafield ID.
     * @param options Include/exclude field options. There are no other query params supported by the BC API for this endpoint.
     * @param options.include_fields When provided, only these fields are included in the returned metafield object, alongside `id`. Cannot be used with `exclude_fields`.
     * @param options.exclude_fields When provided, these fields are excluded from the returned metafield object. Cannot be used with `include_fields`.
     * @returns {ApiResult<ProductMetafield>} The metafield or an error result.
     */
    public async getOne(productId: number, metafieldId: number): ApiResult<ProductMetafield>;

    public async getOne<I extends readonly BaseMetafieldField[]>(
        productId: number,
        metafieldId: number,
        options: { include_fields: I; exclude_fields?: never },
    ): ApiResult<Pick<ProductMetafield, 'id' | I[number]>>;

    public async getOne<E extends readonly BaseMetafieldField[]>(
        productId: number,
        metafieldId: number,
        options: { include_fields?: never; exclude_fields: E },
    ): ApiResult<Omit<ProductMetafield, E[number]>>;

    public async getOne(
        productId: number,
        metafieldId: number,
        options?: {
            include_fields?: readonly BaseMetafieldField[];
            exclude_fields?: readonly BaseMetafieldField[];
        },
    ): ApiResult<ProductMetafield> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ metafieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return { error: idsValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/metafields/${metafieldId}${querySuffix}`;

        return await fetchOne<ProductMetafield>(url, this.accessToken);
    }

    /* ----------------------------- UPDATE METAFIELD ---------------------------- */
    /**
     * Updates an existing metafield by product and metafield ID.
     * @param productId Product ID.
     * @param metafieldId Metafield ID.
     * @param metafieldData Metafield data to update.
     * @returns {ApiResult<ProductMetafield>} The updated metafield or an error result.
     */
    public async update(
        productId: number,
        metafieldId: number,
        metafieldData: Partial<CreateMetafieldPayload>,
    ): ApiResult<ProductMetafield> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ metafieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const validationError = this.validateUpdateMetafieldPayload(metafieldData);

        if (validationError) {
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const url = `${this.apiUrl}/${productId}/metafields/${metafieldId}`;

        return await updateResource(url, this.accessToken, metafieldData);
    }

    /**
     * Deletes a metafield by product and metafield ID.
     * @param productId Product ID.
     * @param metafieldId Metafield ID.
     * @returns {ApiResult<null>} `null` on success or an error result.
     */
    public async remove(productId: number, metafieldId: number): ApiResult<null> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ metafieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/metafields/${metafieldId}`;

        return await deleteResource(url, this.accessToken);
    }

    /* -------------------------------------------------------------------------- */
    /*                             VALIDATION METHODS                             */
    /* -------------------------------------------------------------------------- */

    /** Validates the create payload.
     * @param payload Metafield data to validate.
     * @returns {string | null} A validation error message, or `null` when valid.
     */
    private validateCreateMetafieldPayload(payload: CreateMetafieldPayload): string | null {
        const requiredFields: (keyof CreateMetafieldPayload)[] = [
            'namespace',
            'key',
            'value',
            'permission_set',
        ];

        for (const field of requiredFields) {
            if (!payload[field]) {
                return `Missing required field, or field has an empty value: ${field}`;
            }
        }

        if (payload.key.length > 64) {
            return 'Key cannot exceed 64 characters';
        }

        if (payload.value.length > 65_535) {
            return 'Value cannot exceed 65535 characters';
        }

        if (payload.namespace.length > 64) {
            return 'Namespace cannot exceed 64 characters';
        }

        if (payload.description && payload.description.length > 255) {
            return 'Description cannot exceed 255 characters';
        }

        return null;
    }

    /** Validates the update payload.
     * @param payload Metafield data to validate.
     * @returns {string | null} A validation error message, or `null` when valid.
     */
    private validateUpdateMetafieldPayload(
        payload: Partial<CreateMetafieldPayload>,
    ): string | null {
        if (payload.key !== undefined) {
            if (payload.key.length === 0) {
                return 'Key cannot be an empty string';
            }
            if (payload.key.length > 64) {
                return 'Key cannot exceed 64 characters';
            }
        }

        if (payload.value !== undefined) {
            if (payload.value.length === 0) {
                return 'Value cannot be an empty string';
            }
            if (payload.value.length > 65_535) {
                return 'Value cannot exceed 65535 characters';
            }
        }

        if (payload.namespace !== undefined) {
            if (payload.namespace.length === 0) {
                return 'Namespace cannot be an empty string';
            }
            if (payload.namespace.length > 64) {
                return 'Namespace cannot exceed 64 characters';
            }
        }

        if (payload.description !== undefined && payload.description.length > 255) {
            return 'Description cannot exceed 255 characters';
        }

        return null;
    }
}

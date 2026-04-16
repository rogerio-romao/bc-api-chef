// oxlint-disable max-lines

import {
    buildQueryString,
    clampPerPageLimits,
    createResource,
    deleteResource,
    fetchOne,
    fetchPaginated,
    updateResource,
} from '@/v3Api/utils.ts';

import type { TchefResult } from 'tchef';

import type { BcApiChefOptions } from '@/types/api-types';
import type {
    ApiMetafieldQueryBase,
    BaseMetafieldField,
    CreateMetafieldPayload,
    GetMetafieldReturnType,
    GetMetafieldsReturnType,
    ProductMetafield,
} from '@/types/product-metafields';

/**
 * Wrapper around the BigCommerce V3 `catalog/products/{productId}/metafields` endpoint.
 *
 * Not intended to be instantiated directly by package consumers — obtain an
 * instance via `ProductsV3.metafields()`. All methods return a
 * {@link TchefResult}, so callers must check `result.ok` before using
 * `result.data`.
 *
 * Public methods:
 * - {@link ProductMetafields.getMetafield} — fetch a single metafield by product and metafield id.
 * - {@link ProductMetafields.getMetafields} — paginated list, auto-collects every page.
 * - {@link ProductMetafields.createMetafield} — `POST` a new metafield.
 * - {@link ProductMetafields.updateMetafield} — `PUT` an existing metafield.
 * - {@link ProductMetafields.deleteMetafield} — `DELETE` a metafield by id.
 *
 * The read methods are generic over `BaseMetafieldField[]` so the return type
 * is narrowed by the requested `include_fields` or `exclude_fields` query
 * params at compile time.
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

    /* ===== ProductMetafields Crud Methods ===== */

    /** Fetches a single metafield by product and metafield ID.
     * @param productId Product ID.
     * @param metafieldId Metafield ID.
     * @param query Query and include/exclude field options.
     * @returns {Promise<TchefResult<GetMetafieldReturnType<F, E>>>} The metafield or an error result.
     */
    public async getMetafield<
        F extends readonly BaseMetafieldField[] | undefined = undefined,
        E extends readonly BaseMetafieldField[] | undefined = undefined,
    >(
        productId: number,
        metafieldId: number,
        query?:
            | (Omit<ApiMetafieldQueryBase, 'include_fields' | 'exclude_fields'> & {
                  include_fields?: F;
                  exclude_fields?: never;
              })
            | (Omit<ApiMetafieldQueryBase, 'include_fields' | 'exclude_fields'> & {
                  include_fields?: never;
                  exclude_fields?: E;
              }),
    ): Promise<TchefResult<GetMetafieldReturnType<F, E>>> {
        const idsValidOrErrorMsg = this.validatePositiveIntegers({ metafieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            } as TchefResult<GetMetafieldReturnType<F, E>>;
        }

        const querySuffix = buildQueryString(query);
        const url = `${this.apiUrl}/${productId}/metafields/${metafieldId}${querySuffix}`;

        return (await fetchOne<ProductMetafield>(url, this.accessToken)) as TchefResult<
            GetMetafieldReturnType<F, E>
        >;
    }

    /** Fetches all metafields across every page, or a single page if `query.page` is supplied.
     * @param productId Product ID.
     * @param query Query and include/exclude field options.
     * @returns {Promise<TchefResult<GetMetafieldsReturnType<F, E>>>} The collected metafields or an error result.
     */
    public async getMetafields<
        F extends readonly BaseMetafieldField[] | undefined = undefined,
        E extends readonly BaseMetafieldField[] | undefined = undefined,
    >(
        productId: number,
        query?:
            | (Omit<ApiMetafieldQueryBase, 'include_fields' | 'exclude_fields'> & {
                  include_fields?: F;
                  exclude_fields?: never;
              })
            | (Omit<ApiMetafieldQueryBase, 'include_fields' | 'exclude_fields'> & {
                  include_fields?: never;
                  exclude_fields?: E;
              }),
    ): Promise<TchefResult<GetMetafieldsReturnType<F, E>>> {
        const idValidOrErrorMsg = this.validatePositiveIntegers({ productId });

        if (idValidOrErrorMsg !== true) {
            return {
                error: idValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            } as TchefResult<GetMetafieldsReturnType<F, E>>;
        }

        const querySuffix = buildQueryString(query);
        const url = `${this.apiUrl}/${productId}/metafields${querySuffix}`;
        const limit = clampPerPageLimits(query?.limit);

        return (await fetchPaginated<ProductMetafield>(
            url,
            this.accessToken,
            limit,
            query?.page,
        )) as TchefResult<GetMetafieldsReturnType<F, E>>;
    }

    /** Deletes a metafield by product and metafield ID.
     * @param productId Product ID.
     * @param metafieldId Metafield ID.
     * @returns {Promise<TchefResult<null>>} `null` on success or an error result.
     */
    public async deleteMetafield(
        productId: number,
        metafieldId: number,
    ): Promise<TchefResult<null>> {
        const idsValidOrErrorMsg = this.validatePositiveIntegers({ metafieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            } as TchefResult<null>;
        }

        const url = `${this.apiUrl}/${productId}/metafields/${metafieldId}`;

        return await deleteResource(url, this.accessToken);
    }

    /** Creates a new metafield for a product.
     * @param productId Product ID.
     * @param metafieldData Metafield data to create.
     * @returns {Promise<TchefResult<ProductMetafield>>} The created metafield or an error result.
     */
    public async createMetafield(
        productId: number,
        metafieldData: CreateMetafieldPayload,
    ): Promise<TchefResult<ProductMetafield>> {
        const idValidOrError = this.validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            } as TchefResult<ProductMetafield>;
        }

        const validationError = this.validateCreateMetafieldPayload(metafieldData);

        if (validationError) {
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const url = `${this.apiUrl}/${productId}/metafields`;

        return await createResource<ProductMetafield, CreateMetafieldPayload>(
            url,
            this.accessToken,
            metafieldData,
        );
    }

    /** Updates an existing metafield by product and metafield ID.
     * @param productId Product ID.
     * @param metafieldId Metafield ID.
     * @param metafieldData Metafield data to update.
     * @returns {Promise<TchefResult<ProductMetafield>>} The updated metafield or an error result.
     */
    public async updateMetafield(
        productId: number,
        metafieldId: number,
        metafieldData: Partial<CreateMetafieldPayload>,
    ): Promise<TchefResult<ProductMetafield>> {
        const idsValidOrErrorMsg = this.validatePositiveIntegers({ metafieldId, productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            } as TchefResult<ProductMetafield>;
        }

        const validationError = this.validateUpdateMetafieldPayload(metafieldData);

        if (validationError) {
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const url = `${this.apiUrl}/${productId}/metafields/${metafieldId}`;

        return await updateResource<ProductMetafield, Partial<CreateMetafieldPayload>>(
            url,
            this.accessToken,
            metafieldData,
        );
    }

    /// ===== Validation Methods =====

    /** Validates that an number is a positive integer.
     * @param numbers Number values to validate.
     * @returns {true | string} `true` if all numbers are valid, or an error message for the first invalid number.
     */
    private validatePositiveIntegers(numbers: Record<string, number>): true | string {
        for (const [fieldName, value] of Object.entries(numbers)) {
            if (!Number.isInteger(value) || value <= 0) {
                return `Invalid ${fieldName}: must be a positive integer.`;
            }
        }
        return true;
    }

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

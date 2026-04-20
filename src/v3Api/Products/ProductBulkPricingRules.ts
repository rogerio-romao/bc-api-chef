// oxlint-disable max-lines

import {
    buildQueryString,
    clampPerPageLimits,
    createResource,
    deleteResource,
    fetchOne,
    fetchPaginated,
    updateResource,
    validatePositiveIntegers,
} from '@/v3Api/utils';

import type { ApiResult, BcApiChefOptions } from '@/types/api-types';
import type {
    NoIdProductBulkPricingRule,
    ProductBulkPricingRule,
    ProductBulkPricingRuleField,
} from '@/types/product-bulk-pricing-rules';

/**
 * Class for managing product bulk pricing rules via the BigCommerce API.
 * It is accessed via the `bulkPricingRules()` method on the main `Products` class, which provides the base URL and access token.
 * All methods return a {@link ApiResult}, which is either `{ data: T; ok: true; }` on success or `{ error: string; ok: false; statusCode: number }` on failure.
 *
 * Public methods:
 * - {@link create} to create a new bulk pricing rule for a product.
 * - {@link getMultiple} to retrieve multiple bulk pricing rules for a product, with optional pagination and field selection.
 * - {@link getOne} to retrieve a single bulk pricing rule by its ID for a given product, with optional field selection.
 * - {@link update} to update a bulk pricing rule by its ID for a given product.
 * - {@link remove} to delete a bulk pricing rule by its ID for a given product.
 */
export default class ProductBulkPricingRules {
    private accessToken: string;
    private apiUrl: string;
    private options: Required<BcApiChefOptions>;

    /**
     * Creates an instance of the ProductBulkPricingRules class.
     * @param accessToken - The BigCommerce API access token to use for requests.
     * @param apiUrl - The base URL for product-related API endpoints, which should be provided by the parent Products class.
     * @param options - Optional configuration for API requests, such as validation and retry behavior.
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
    /*                         PRODUCT BULK PRICING RULES                         */
    /* -------------------------------------------------------------------------- */

    /* -------------------- CREATE PRODUCT BULK PRICING RULE -------------------- */
    /**
     * Creates a new bulk pricing rule for a product.
     * @param productId - The ID of the product to create the bulk pricing rule for.
     * @param ruleData - The data for the new bulk pricing rule. Must include `quantity_min`, `quantity_max`, `type`, and `amount`.
     * @returns {ApiResult<ProductBulkPricingRule>} The created bulk pricing rule, or an error if validation fails or the API request fails.
     */
    public async create(
        productId: number,
        ruleData: NoIdProductBulkPricingRule,
    ): ApiResult<ProductBulkPricingRule> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const validationError = this.validateCreateBulkPricingRulePayload(ruleData);

        if (validationError !== null) {
            return {
                error: validationError,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/bulk-pricing-rules`;

        return await createResource<ProductBulkPricingRule, NoIdProductBulkPricingRule>(
            url,
            this.accessToken,
            ruleData,
        );
    }

    /* -------------------- GET PRODUCT BULK PRICING RULES -------------------- */
    /**
     * Retrieves multiple bulk pricing rules for a product, with optional pagination and field selection. You can use `page` and `limit` query parameters for pagination.
     * There are three overloads for this method:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no field selection, returning the full `ProductBulkPricingRule` objects.
     *
     * @param productId - The ID of the product to retrieve bulk pricing rules for.
     * @param options - Optional query parameters for pagination and field selection.
     * @param options.page - The page number to retrieve (for pagination). Leave empty to get all pages.
     * @param options.limit - The number of items per page (for pagination). Leave empty to use the API default (250). Maximum is 250.
     * @param options.include_fields - An array of field names to include in the response. Cannot be used with `exclude_fields`.
     * @param options.exclude_fields - An array of field names to exclude from the response. Cannot be used with `include_fields`.
     * @returns {ApiResult<ProductBulkPricingRule[]>} An array of bulk pricing rules, or an error if validation fails or the API request fails.
     */
    public async getMultiple<I extends readonly ProductBulkPricingRuleField[]>(
        productId: number,
        options?: {
            include_fields?: I;
            exclude_fields?: never;
            page?: number;
            limit?: number;
        },
    ): ApiResult<Pick<ProductBulkPricingRule, 'id' | I[number]>[]>;

    public async getMultiple<E extends readonly ProductBulkPricingRuleField[]>(
        productId: number,
        options?: {
            include_fields?: never;
            exclude_fields?: E;
            page?: number;
            limit?: number;
        },
    ): ApiResult<Omit<ProductBulkPricingRule, E[number]>[]>;

    public async getMultiple(
        productId: number,
        options?: {
            page?: number;
            limit?: number;
        },
    ): ApiResult<ProductBulkPricingRule[]>;

    public async getMultiple(
        productId: number,
        options?: {
            include_fields?: readonly ProductBulkPricingRuleField[];
            exclude_fields?: readonly ProductBulkPricingRuleField[];
            page?: number;
            limit?: number;
        },
    ): ApiResult<ProductBulkPricingRule[]> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/bulk-pricing-rules${querySuffix}`;
        const limit = clampPerPageLimits(options?.limit);

        return await fetchPaginated<ProductBulkPricingRule>(
            url,
            this.accessToken,
            limit,
            options?.page,
        );
    }

    /* ---------------------- GET PRODUCT BULK PRICING RULE --------------------- */
    /**
     * Retrieves a single bulk pricing rule by its ID for a given product, with optional field selection. There are three overloads for this method:
     * - With `include_fields` to specify which fields to include, returning a narrowed type.
     * - With `exclude_fields` to specify which fields to exclude, returning a narrowed type.
     * - With no field selection, returning the full `ProductBulkPricingRule` object.
     *
     * @param productId - The ID of the product the bulk pricing rule belongs to.
     * @param ruleId - The ID of the bulk pricing rule to retrieve.
     * @param options - Optional query parameters for field selection.
     * @param options.include_fields - An array of field names to include in the response. Cannot be used with `exclude_fields`.
     * @param options.exclude_fields - An array of field names to exclude from the response. Cannot be used with `include_fields`.
     * @returns {ApiResult<ProductBulkPricingRule>} The requested bulk pricing rule, or an error if validation fails or the API request fails.
     */
    public async getOne<I extends readonly ProductBulkPricingRuleField[]>(
        productId: number,
        ruleId: number,
        options?: {
            include_fields?: I;
            exclude_fields?: never;
        },
    ): ApiResult<Pick<ProductBulkPricingRule, 'id' | I[number]>>;

    public async getOne<E extends readonly ProductBulkPricingRuleField[]>(
        productId: number,
        ruleId: number,
        options?: {
            include_fields?: never;
            exclude_fields?: E;
        },
    ): ApiResult<Omit<ProductBulkPricingRule, E[number]>>;

    public async getOne(
        productId: number,
        ruleId: number,
        options?: undefined,
    ): ApiResult<ProductBulkPricingRule>;

    public async getOne(
        productId: number,
        ruleId: number,
        options?: {
            include_fields?: readonly ProductBulkPricingRuleField[];
            exclude_fields?: readonly ProductBulkPricingRuleField[];
        },
    ): ApiResult<ProductBulkPricingRule> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ productId, ruleId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const querySuffix = buildQueryString(options);
        const url = `${this.apiUrl}/${productId}/bulk-pricing-rules/${ruleId}${querySuffix}`;

        return await fetchOne<ProductBulkPricingRule>(url, this.accessToken);
    }

    /* ---------------------- UPDATE PRODUCT BULK PRICING RULE --------------------- */
    /**
     * Updates a bulk pricing rule by its ID for a given product. All fields are optional in the payload, but at least one must be provided.
     *
     * @param productId - The ID of the product the bulk pricing rule belongs to.
     * @param ruleId - The ID of the bulk pricing rule to update.
     * @param ruleData - The data to update for the bulk pricing rule. All fields are optional, but at least one must be provided.
     * @returns {ApiResult<ProductBulkPricingRule>} The updated bulk pricing rule, or an error if validation fails or the API request fails.
     */
    public async update(
        productId: number,
        ruleId: number,
        ruleData: Partial<NoIdProductBulkPricingRule>,
    ): ApiResult<ProductBulkPricingRule> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ productId, ruleId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const validationError = this.validateUpdateBulkPricingRulePayload(ruleData);

        if (validationError !== null) {
            return {
                error: validationError,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/bulk-pricing-rules/${ruleId}`;

        return await updateResource<ProductBulkPricingRule, Partial<NoIdProductBulkPricingRule>>(
            url,
            this.accessToken,
            ruleData,
        );
    }

    /* ---------------------- DELETE PRODUCT BULK PRICING RULE --------------------- */
    /**
     * Deletes a bulk pricing rule by its ID for a given product.
     *
     * @param productId - The ID of the product the bulk pricing rule belongs to.
     * @param ruleId - The ID of the bulk pricing rule to delete.
     * @returns {ApiResult<null>} An empty result if deletion is successful, or an error if validation fails or the API request fails.
     */
    public async remove(productId: number, ruleId: number): ApiResult<null> {
        const idsValidOrErrorMsg = validatePositiveIntegers({ productId, ruleId });

        if (idsValidOrErrorMsg !== true) {
            return {
                error: idsValidOrErrorMsg,
                ok: false,
                statusCode: 400,
            };
        }

        const url = `${this.apiUrl}/${productId}/bulk-pricing-rules/${ruleId}`;

        return await deleteResource(url, this.accessToken);
    }

    /* -------------------------------------------------------------------------- */
    /*                             VALIDATION METHODS                             */
    /* -------------------------------------------------------------------------- */

    /**
     * Validates the payload for creating a bulk pricing rule.
     * @param payload - The payload to validate.
     * @returns {string | null} An error message if validation fails, or null if validation passes.
     */
    private validateCreateBulkPricingRulePayload(
        payload: NoIdProductBulkPricingRule,
    ): string | null {
        if (payload.amount === undefined) {
            return 'Missing required field: amount';
        }

        if (payload.quantity_min === undefined) {
            return 'Missing required field: quantity_min';
        }

        if (payload.quantity_max === undefined) {
            return 'Missing required field: quantity_max';
        }

        if (payload.type === undefined) {
            return 'Missing required field: type';
        }

        return this.validateCommonBulkPricingRuleFields(payload);
    }

    /**
     * Validates the payload for updating a bulk pricing rule. All fields are optional, but if they are provided they must be valid.
     * @param payload - The payload to validate.
     * @returns {string | null} An error message if validation fails, or null if validation passes.
     */
    private validateUpdateBulkPricingRulePayload(
        payload: Partial<NoIdProductBulkPricingRule>,
    ): string | null {
        return this.validateCommonBulkPricingRuleFields(payload);
    }

    /**
     * Validates the common fields for both creating and updating bulk pricing rules.
     * @param payload - The payload to validate.
     * @returns {string | null} An error message if validation fails, or null if validation passes.
     */
    private validateCommonBulkPricingRuleFields(
        payload: Partial<NoIdProductBulkPricingRule>,
    ): string | null {
        const { quantity_min, quantity_max, type, amount } = payload;

        if (quantity_min !== undefined && quantity_min <= 0) {
            return 'quantity_min must be a positive integer';
        }

        if (type === 'fixed' && quantity_min !== undefined && quantity_min < 2) {
            return 'quantity_min must be at least 2 for fixed type rules';
        }

        if (quantity_max !== undefined && quantity_max < 0) {
            return 'quantity_max must be a positive integer or zero (for no maximum)';
        }

        if (
            quantity_max !== undefined &&
            quantity_min !== undefined &&
            quantity_max > 0 &&
            quantity_max < quantity_min
        ) {
            return 'quantity_max must be greater than or equal to quantity_min, or zero for no maximum';
        }

        if (type !== undefined && !['price', 'percent', 'fixed'].includes(type)) {
            return "type must be one of 'price', 'percent', or 'fixed'";
        }

        if (amount !== undefined && typeof amount !== 'number' && typeof amount !== 'string') {
            return 'amount must be a number or a string';
        }

        return null;
    }
}

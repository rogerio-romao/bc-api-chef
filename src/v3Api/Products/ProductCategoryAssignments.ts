import {
    buildQueryString,
    clampPerPageLimits,
    deleteResource,
    fetchPaginated,
    updateResourceEmptyResponse,
} from '@/v3Api/utils';

import type { ApiResult, RetryConfig, StandardSchemaV1 } from '@/types/api-types';
import type { ProductCategoryAssignment } from '@/types/product-category-assignments';

/**
 * Class for managing product category assignments in the BigCommerce V3 API.
 * It is accessed via the `categoryAssignments` property of the `Products` class.
 * All methods return a {@link ApiResult}, which is either `{ data: T; ok: true; }` on success or `{ error: string; ok: false; statusCode: number }` on failure.
 *
 * Public methods:
 * - {@link upsert} to create or update product category assignments in bulk.
 * - {@link getMultiple} to retrieve multiple product category assignments with optional filtering and pagination.
 * - {@link remove} to delete product category assignments based on specified filters.
 */
export default class ProductCategoryAssignments {
    private accessToken: string;
    private apiUrl: string;

    /**
     * Creates a new `ProductCategoryAssignments` instance.
     * @param accessToken - BigCommerce API access token, forwarded to every request.
     * @param apiUrl - Base URL for the V3 API product related endpoints.
     */
    constructor(accessToken: string, apiUrl: string) {
        this.accessToken = accessToken;
        this.apiUrl = apiUrl;
    }

    /* -------------------------------------------------------------------------- */
    /*                  PRODUCT CATEGORY ASSIGNMENTS CRUD METHODS                 */
    /* -------------------------------------------------------------------------- */

    /* ------------------- CREATE PRODUCT CATEGORY ASSIGNMENTS ------------------ */
    /**
     * Creates or updates product category assignments in bulk. This method will add new category assignments and update existing ones based on the provided data. It uses the PUT method, which means that if a category assignment with the same product_id and category_id already exists, it will be updated with the new data. If it does not exist, it will be created.
     * @param categoryAssignmentData - An array of product category assignment objects to create or update. Each object must include `product_id` and `category_id`.
     * @param options - Optional parameters for the request, including retry configuration.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<null>} Null if the upsert was successful, or an error if the API request fails.
     */
    public async upsert(
        categoryAssignmentData: ProductCategoryAssignment[],
        options?: {
            retries?: RetryConfig;
        },
    ): ApiResult<null> {
        const url = `${this.apiUrl}/category-assignments`;

        // This endpoint uses PUT for bulk upsert operations and returns 204 No Content
        return await updateResourceEmptyResponse(
            url,
            this.accessToken,
            categoryAssignmentData,
            options?.retries,
        );
    }

    /* ------------------- GET MULTIPLE PRODUCT CATEGORY ASSIGNMENTS ------------------ */
    /**
     * Retrieves multiple product category assignments, with optional filtering by product_id and/or category_id. Supports pagination and schema validation.
     * @param options - Optional parameters for the request, including filtering, pagination, schema, and retry configuration.
     * @param options.page - The page number to retrieve. Defaults to 1.
     * @param options.limit - The number of items to retrieve per page. Defaults to 20, maximum is 250.
     * @param options['product_id:in'] - An array of product IDs to filter category assignments by. Only category assignments for these products will be returned.
     * @param options['category_id:in'] - An array of category IDs to filter category assignments by. Only category assignments for these categories will be returned.
     * @param options.schema - A Standard Schema to validate each item in the API response against. If validation fails for any item, the method will return a 422 error with details about the validation failure. Validation is performed on each page of results as they are fetched, so if you are paginating through results and a later page contains invalid data, you will still get a 422 error without having to wait for all pages to be fetched.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<ProductCategoryAssignment[]>} An array of product category assignments matching the specified filters, or an error if validation fails or the API request fails.
     */
    public async getMultiple(options?: {
        page?: number;
        limit?: number;
        'product_id:in'?: number;
        'category_id:in'?: number;
        schema?: StandardSchemaV1;
        retries?: RetryConfig;
    }): ApiResult<ProductCategoryAssignment[]> {
        const { schema, retries, ...queryOptions } = options ?? {};
        const querySuffix = buildQueryString(queryOptions);
        const url = `${this.apiUrl}/category-assignments${querySuffix}`;
        const limit = clampPerPageLimits(queryOptions.limit);

        return await fetchPaginated<ProductCategoryAssignment>(
            url,
            this.accessToken,
            limit,
            queryOptions.page,
            schema,
            retries,
        );
    }

    /* ------------------- DELETE PRODUCT CATEGORY ASSIGNMENTS ------------------ */
    /**
     * Deletes product category assignments based on the specified filters. You can filter by product_id and/or category_id to delete specific assignments. If both filters are provided, only assignments matching both criteria will be deleted. At least one filter must be provided to prevent accidental deletion of all category assignments.
     * @param options - Optional parameters for the request, including filtering and retry configuration.
     * @param options['product_id:in'] - An array of product IDs to filter category assignments by. Only category assignments for these products will be deleted.
     * @param options['category_id:in'] - An array of category IDs to filter category assignments by. Only category assignments for these categories will be deleted.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<null>} Null if the deletion was successful, or an error if the API request fails or if no filters were provided.
     */
    public async remove(options: {
        'product_id:in'?: number;
        'category_id:in'?: number;
        retries?: RetryConfig;
    }): ApiResult<null> {
        if (!options['product_id:in'] && !options['category_id:in']) {
            return {
                error: 'At least one of product_id:in or category_id:in must be provided to delete category assignments.',
                ok: false,
                statusCode: 400,
            };
        }
        const { retries, ...queryOptions } = options ?? {};
        const querySuffix = buildQueryString(queryOptions);
        const url = `${this.apiUrl}/category-assignments${querySuffix}`;

        return await deleteResource(url, this.accessToken, retries);
    }
}

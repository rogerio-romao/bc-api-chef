// oxlint-disable max-lines

import tchef from 'tchef';

import {
    DEFAULT_START_PAGE,
    PER_PAGE_DEFAULT,
    PER_PAGE_MAX,
    PER_PAGE_MIN,
} from '@/v3Api/constants.ts';

import type { TchefResult } from 'tchef';

import type {
    ApiProductQuery,
    BcApiChefOptions,
    BcCreateProductResponse,
    BcGetProductResponse,
    BcGetProductsResponse,
    BcUpdateProductResponse,
    CommonProductValidationPayload,
    CreateProductPayload,
    GetProductReturnType,
    GetProductsReturnType,
    ProductIncludes,
    UpdateProductPayload,
    UpdateProductReturnType,
} from '@/types/api-types';
import type { BaseProduct, BaseProductField, FullProduct } from '@/types/product-types';

/**
 * Wrapper around the BigCommerce V3 `catalog/products` endpoint.
 *
 * Not intended to be instantiated directly by package consumers — obtain an
 * instance via `BcApiChef.v3().products()`. All methods return a
 * {@link TchefResult}, so callers must check `result.ok` before using
 * `result.data`.
 *
 * Public methods:
 * - {@link ProductsV3.getAllProducts} — paginated list, auto-collects every page.
 * - {@link ProductsV3.getProduct} — fetch a single product by id.
 * - {@link ProductsV3.createProduct} — `POST` a new product.
 * - {@link ProductsV3.updateProduct} — `PUT` an existing product.
 * - {@link ProductsV3.deleteProduct} — `DELETE` a product by id.
 *
 * The read methods are generic over `ProductIncludes` and
 * `BaseProductField[]` so the return type is narrowed by the requested
 * `include` and `include_fields` query params at compile time.
 */
export default class ProductsV3 {
    private accessToken: string;
    /** The `Required` here makes typescript happy without having to check for undefined values upstream constantly, but the values are still optional at runtime */
    private options: Required<BcApiChefOptions>;
    private readonly productsApiPath = 'catalog/products';
    private productApiUrl: string;

    /**
     * @param baseUrlWithVersion - Store base URL including the `/v3` version segment.
     * @param accessToken - BigCommerce API access token, sent as `X-Auth-Token`
     * on every request.
     * @param options - Shared client options propagated from `BcApiChef`.
     * `validate` controls runtime response validation before results are returned
     * to callers, and `retries` is reserved for retry support in downstream HTTP
     * calls.
     * @param options.validate - When `true`, runtime validation runs on responses
     * received from BigCommerce before they are returned to the caller. Defaults to `false`.
     * @param options.retries  - Number of times to retry a failed HTTP request before
     * surfacing the error. Forwarded to the underlying `tchef` HTTP client.
     * Defaults to `0` (no retries).
     * @todo Gate runtime response validation on `this.options.validate`.
     * @todo Forward `this.options.retries` to every `tchef()` call in this class.
     */
    constructor(baseUrlWithVersion: string, accessToken: string, options: BcApiChefOptions = {}) {
        this.accessToken = accessToken;
        this.productApiUrl = `${baseUrlWithVersion}/${this.productsApiPath}`;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    /* ===== Product Crud Methods ===== */

    /** Creates a new product.
     * @param payload Product data to create.
     * @returns {Promise<TchefResult<BaseProduct>>} The created product or an error result.
     */
    public async createProduct(payload: CreateProductPayload): Promise<TchefResult<BaseProduct>> {
        const validationError = ProductsV3.validateCreateProductPayload(payload);
        if (validationError !== null) {
            // At least one validation error was found on the payload, meaning one of the fields is invalid as per BC docs (name too big, invalid number, etc.) — return an error result without making the API call
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const response = await tchef(`${this.productApiUrl}`, {
            body: JSON.stringify(payload),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Auth-Token': this.accessToken,
            },
            method: 'POST',
        });

        if (!response.ok) {
            // response here contains error details from the Tchef API call, so we return it directly to the caller instead of a generic error message
            return response;
        }

        const { data } = response.data as BcCreateProductResponse;
        return { data, ok: true };
    }

    /** Deletes a product by ID.
     * @param productId Product ID.
     * @returns {Promise<TchefResult<null>>} `null` on success or an error result.
     */
    public async deleteProduct(productId: number): Promise<TchefResult<null>> {
        const response = await tchef(`${this.productApiUrl}/${productId}`, {
            headers: {
                'X-Auth-Token': this.accessToken,
            },
            method: 'DELETE',
            // BigCommerce returns an empty string on successful delete, so we use 'text' to avoid JSON parsing errors
            responseFormat: 'text',
        });

        if (!response.ok) {
            return response;
        }

        return { data: null, ok: true };
    }

    /** Fetches all products across every page, or a single page if `query.page` is supplied.
     * @param options Query and include options.
     * @returns {Promise<TchefResult<GetProductsReturnType<T, F>>>} The collected products or an error result.
     */
    public async getAllProducts<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] | undefined = undefined,
        E extends readonly BaseProductField[] | undefined = undefined,
    >(options?: {
        includes?: T;
        // BC returns 409 when both include_fields and exclude_fields are supplied, so we enforce mutual exclusion at the type level.
        query?:
            | (Omit<ApiProductQuery, 'include_fields' | 'exclude_fields'> & {
                  include_fields?: F;
                  exclude_fields?: never;
              })
            | (Omit<ApiProductQuery, 'include_fields' | 'exclude_fields'> & {
                  include_fields?: never;
                  exclude_fields?: E;
              });
    }): Promise<TchefResult<GetProductsReturnType<T, F, E>>> {
        const query = options?.query as ApiProductQuery | undefined;
        const includesString = ProductsV3.generateProductIncludes(options?.includes);
        const queryString = ProductsV3.generateProductQueryString(query, includesString);
        const querySuffix = queryString ? `?${queryString}` : '';
        const url = `${this.productApiUrl}${querySuffix}`;

        return (await this.getProductsMultiPage(
            url,
            ProductsV3.clampPerPageLimits(query?.limit ?? PER_PAGE_DEFAULT),
            query?.page,
        )) as TchefResult<GetProductsReturnType<T, F, E>>;
    }

    /** Fetches a single product by ID.
     * @param productId Product ID.
     * @param options Query and include options.
     * @returns {Promise<TchefResult<GetProductReturnType<T, F>>>} The product or an error result.
     */
    public async getProduct<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] | undefined = undefined,
        E extends readonly BaseProductField[] | undefined = undefined,
    >(
        productId: number,
        options?: {
            includes?: T;
            query?:
                | (Omit<ApiProductQuery, 'include_fields' | 'exclude_fields'> & {
                      include_fields?: F;
                      exclude_fields?: never;
                  })
                | (Omit<ApiProductQuery, 'include_fields' | 'exclude_fields'> & {
                      include_fields?: never;
                      exclude_fields?: E;
                  });
        },
    ): Promise<TchefResult<GetProductReturnType<T, F, E>>> {
        const query = options?.query as ApiProductQuery | undefined;
        const includesString = ProductsV3.generateProductIncludes(options?.includes);
        const queryString = ProductsV3.generateProductQueryString(query, includesString);
        const querySuffix = queryString ? `?${queryString}` : '';
        const url = `${this.productApiUrl}/${productId}${querySuffix}`;

        return (await this.getProductById(url)) as TchefResult<GetProductReturnType<T, F, E>>;
    }

    /** Updates an existing product by ID.
     * @param productId Product ID.
     * @param payload Product data to update.
     * @param options Query and include options.
     * @returns {Promise<TchefResult<UpdateProductReturnType<T, F>>>} The updated product or an error result.
     */
    public async updateProduct<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] | undefined = undefined,
    >(
        productId: number,
        payload: UpdateProductPayload,
        options?: {
            includes?: T;
            query?: { include_fields?: F };
        },
    ): Promise<TchefResult<UpdateProductReturnType<T, F>>> {
        const validationError = ProductsV3.validateUpdateProductPayload(payload);

        if (validationError !== null) {
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const query = options?.query as ApiProductQuery | undefined;
        const includesString = ProductsV3.generateProductIncludes(options?.includes);
        const queryString = ProductsV3.generateProductQueryString(query, includesString);
        const querySuffix = queryString ? `?${queryString}` : '';

        const response = await tchef(`${this.productApiUrl}/${productId}${querySuffix}`, {
            body: JSON.stringify(payload),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Auth-Token': this.accessToken,
            },
            method: 'PUT',
        });

        if (!response.ok) {
            return response;
        }

        const { data } = response.data as BcUpdateProductResponse;
        return { data: data as UpdateProductReturnType<T, F>, ok: true };
    }

    /* ===== Private Fetching Helper Methods ===== */

    /** Fetches a single product with shared headers.
     * @param url Request URL.
     * @returns {Promise<TchefResult<FullProduct>>} The product or an error result.
     */
    private async getProductById(url: string): Promise<TchefResult<FullProduct>> {
        const response = await tchef(url, {
            headers: {
                Accept: 'application/json',
                'X-Auth-Token': this.accessToken,
            },
        });

        if (!response.ok) {
            return response;
        }
        const { data } = response.data as BcGetProductResponse;
        return { data, ok: true };
    }

    /** Fetches and merges paginated product results.
     * @param url Base request URL.
     * @param limit Page size.
     * @param singlePage Optional single page number.
     * @returns {Promise<TchefResult<FullProduct[]>>} The collected products or an error result.
     */
    private async getProductsMultiPage(
        url: string,
        limit = PER_PAGE_DEFAULT,
        singlePage?: number,
    ): Promise<TchefResult<FullProduct[]>> {
        const results: FullProduct[] = [];

        let page = singlePage ?? DEFAULT_START_PAGE;
        let totalPages = 1;

        const separator = url.includes('?') ? '&' : '?';

        do {
            const pagedUrl = `${url}${separator}page=${page}&limit=${limit}`;

            const response = await tchef(pagedUrl, {
                headers: {
                    Accept: 'application/json',
                    'X-Auth-Token': this.accessToken,
                },
            });

            if (!response.ok) {
                return response;
            }

            const { data, meta } = response.data as BcGetProductsResponse;

            results.push(...data);

            if (singlePage !== undefined) {
                return { data: results, ok: true };
            }

            totalPages = meta.pagination.total_pages;
            page += 1;
        } while (page <= totalPages);

        return { data: results, ok: true };
    }

    /* ===== Static Helper Methods ===== */

    /** Clamps page size to the supported range.
     * @param limit Requested page size.
     * @returns {number} The clamped page size.
     */
    private static clampPerPageLimits(limit: number): number {
        return Math.min(Math.max(limit, PER_PAGE_MIN), PER_PAGE_MAX);
    }

    /** Serializes include flags into the API format.
     * @param includes Include flags.
     * @returns {string} A comma-separated include string.
     */
    private static generateProductIncludes(includes: ProductIncludes | undefined): string {
        if (!includes) {
            return '';
        }

        return Object.entries(includes)
            .filter(([, value]) => value === true)
            .map(([key]) => key)
            .join(',');
    }

    /** Builds the query string for product requests.
     * @param query Query params.
     * @param includes Serialized include flags.
     * @returns {string} The query string.
     */
    private static generateProductQueryString(
        query: ApiProductQuery | undefined,
        includes: string,
    ): string {
        const params = new URLSearchParams();

        if (query) {
            for (const [key, value] of Object.entries(query)) {
                // We handle pagination params separately in getProductsMultiPage, so we skip them here to avoid conflicts. Every other param is added to the query string if it's defined.
                if (value !== undefined && key !== 'page' && key !== 'limit') {
                    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
                }
            }
        }

        if (includes) {
            params.set('include', includes);
        }

        return params.toString();
    }

    /** Validates fields shared by create and update payloads.
     * @param payload Product data to validate.
     * @returns {string | null} A validation error message, or `null` when valid.
     */
    private static validateCommonProductFields(
        payload: CommonProductValidationPayload,
    ): string | null {
        const strChecks: [string | undefined, string, number][] = [
            [payload.sku, 'sku', 255],
            [payload.product_tax_code, 'product_tax_code', 255],
            [payload.warranty, 'warranty', 65_535],
            [payload.bin_picking_number, 'bin_picking_number', 255],
            [payload.layout_file, 'layout_file', 500],
            [payload.upc, 'upc', 32],
            [payload.search_keywords, 'search_keywords', 65_535],
            [payload.availability_description, 'availability_description', 255],
            [payload.page_title, 'page_title', 255],
            [payload.meta_description, 'meta_description', 65_535],
            [payload.preorder_message, 'preorder_message', 255],
            [payload.price_hidden_label, 'price_hidden_label', 200],
        ];

        for (const [value, field, max] of strChecks) {
            if (value !== undefined && value.length > max) {
                return `${field} must not exceed ${max} characters`;
            }
        }

        const numChecks: [number | undefined, string, number, number | undefined][] = [
            [payload.width, 'width', 0, 9_999_999_999],
            [payload.depth, 'depth', 0, 9_999_999_999],
            [payload.height, 'height', 0, 9_999_999_999],
            [payload.cost_price, 'cost_price', 0, undefined],
            [payload.retail_price, 'retail_price', 0, undefined],
            [payload.sale_price, 'sale_price', 0, undefined],
            [payload.fixed_cost_shipping_price, 'fixed_cost_shipping_price', 0, undefined],
            [payload.tax_class_id, 'tax_class_id', 0, 255],
            [payload.brand_id, 'brand_id', 0, 1_000_000_000],
            [payload.inventory_level, 'inventory_level', 0, 2_147_483_647],
            [payload.inventory_warning_level, 'inventory_warning_level', 0, 2_147_483_647],
            [payload.sort_order, 'sort_order', -2_147_483_648, 2_147_483_647],
            [payload.order_quantity_minimum, 'order_quantity_minimum', 0, 1_000_000_000],
            [payload.order_quantity_maximum, 'order_quantity_maximum', 0, 1_000_000_000],
        ];

        for (const [value, field, min, max] of numChecks) {
            if (value === undefined) {
                continue;
            }

            if (value < min) {
                return `${field} must be >= ${min}`;
            }

            if (max !== undefined && value > max) {
                return `${field} must be <= ${max}`;
            }
        }

        if (payload.categories !== undefined && payload.categories.length > 1000) {
            return 'categories must not contain more than 1000 items';
        }

        if (payload.custom_fields !== undefined) {
            if (payload.custom_fields.length > 200) {
                return 'custom_fields must not contain more than 200 items';
            }

            for (const [i, cf] of payload.custom_fields.entries()) {
                if (cf.name.length === 0 || cf.name.length > 250) {
                    return `custom_fields[${i}].name must be between 1 and 250 characters`;
                }

                if (cf.value.length === 0 || cf.value.length > 250) {
                    return `custom_fields[${i}].value must be between 1 and 250 characters`;
                }
            }
        }

        return null;
    }

    /** Validates the create payload.
     * @param payload Product data to validate.
     * @returns {string | null} A validation error message, or `null` when valid.
     */
    private static validateCreateProductPayload(payload: CreateProductPayload): string | null {
        if (payload.name.length === 0) {
            return 'Product name must not be empty';
        }

        if (payload.name.length > 250) {
            return 'Product name must not exceed 250 characters';
        }

        if (payload.price < 0) {
            return 'price must be >= 0';
        }

        if (payload.weight < 0) {
            return 'weight must be >= 0';
        }

        if (payload.weight > 9_999_999_999) {
            return 'weight must be <= 9999999999';
        }

        const validationError = ProductsV3.validateCommonProductFields(payload);

        if (validationError !== null) {
            return validationError;
        }

        return null;
    }

    /** Validates the update payload.
     * @param payload Product data to validate.
     * @returns {string | null} A validation error message, or `null` when valid.
     */
    private static validateUpdateProductPayload(payload: UpdateProductPayload): string | null {
        if (payload.name !== undefined) {
            if (payload.name.length === 0) {
                return 'Product name must not be empty';
            }

            if (payload.name.length > 250) {
                return 'Product name must not exceed 250 characters';
            }
        }

        if (payload.price !== undefined && payload.price < 0) {
            return 'price must be >= 0';
        }

        if (payload.weight !== undefined) {
            if (payload.weight < 0) {
                return 'weight must be >= 0';
            }

            if (payload.weight > 9_999_999_999) {
                return 'weight must be <= 9999999999';
            }
        }

        const validationError = ProductsV3.validateCommonProductFields(payload);

        if (validationError !== null) {
            return validationError;
        }

        return null;
    }
}

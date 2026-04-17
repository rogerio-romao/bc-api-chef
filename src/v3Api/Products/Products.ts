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

import ProductImages from './ProductImages';
import ProductMetafields from './ProductMetafields';

import type { BcApiChefOptions, BcApiChefResult, Prettify } from '@/types/api-types';
import type {
    ApiProductQuery,
    ApiProductQueryBase,
    BaseProduct,
    BaseProductField,
    CommonProductValidationPayload,
    CreateProductPayload,
    FullProduct,
    IncludeExpansion,
    ProductIncludes,
    UpdateProductPayload,
} from '@/types/product-types';

/**
 * Wrapper around the BigCommerce V3 `catalog/products` endpoint.
 *
 * Not intended to be instantiated directly by package consumers — obtain an
 * instance via `BcApiChef.v3().products()`. All methods return a
 * {@link BcApiChefResult}, so callers must check `result.ok` before using
 * `result.data`.
 *
 * Public methods:
 * - {@link ProductsV3.getProducts} — paginated list, auto-collects every page, or single page if `query.page` is supplied.
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
    private apiUrl: string;

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
        this.apiUrl = `${baseUrlWithVersion}/${this.productsApiPath}`;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    /* ===== Product Crud Methods ===== */

    /** Creates a new product.
     * @param productData Product data to create.
     * @returns {Promise<BcApiChefResult<BaseProduct>>} The created product or an error result.
     */
    public async createProduct(
        productData: CreateProductPayload,
    ): Promise<BcApiChefResult<BaseProduct>> {
        const validationError = this.validateCreateProductPayload(productData);

        if (validationError !== null) {
            // At least one validation error was found on the payload, meaning one of the fields is invalid as per BC docs (name too big, invalid number, etc.) — return an error result without making the API call
            return { error: validationError, ok: false, statusCode: 400 };
        }

        return await createResource<BaseProduct, CreateProductPayload>(
            this.apiUrl,
            this.accessToken,
            productData,
        );
    }

    /** Deletes a product by ID.
     * @param productId Product ID.
     * @returns {Promise<BcApiChefResult<null>>} `null` on success or an error result.
     */
    public async deleteProduct(productId: number): Promise<BcApiChefResult<null>> {
        if (!Number.isInteger(productId) || productId <= 0) {
            return { error: 'Invalid productId', ok: false, statusCode: 400 };
        }

        const url = `${this.apiUrl}/${productId}`;

        return await deleteResource(url, this.accessToken);
    }

    /** Fetches a single product by ID.
     * @param productId Product ID.
     * @param options Query and include options — flat object. `includes` controls sub-resource expansion, remaining keys are query params sent to the API.
     * @param options.includes - Include sub-resources in the response by setting the relevant flags to `true`. For example, `{ includes: { variants: true, images: true } }` will include both variants and images in the response. Defaults to no sub-resources included.
     * @returns {Promise<BcApiChefResult>} The product or an error result.
     */
    public async getProduct<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] = readonly BaseProductField[],
    >(
        productId: number,
        options: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields: F;
            exclude_fields?: never;
        },
    ): Promise<BcApiChefResult<Prettify<Pick<BaseProduct, F[number]> & IncludeExpansion<T>>>>;

    public async getProduct<
        T extends ProductIncludes = Record<string, never>,
        E extends readonly BaseProductField[] = readonly BaseProductField[],
    >(
        productId: number,
        options: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields?: never;
            exclude_fields: E;
        },
    ): Promise<BcApiChefResult<Prettify<Omit<BaseProduct, E[number]> & IncludeExpansion<T>>>>;

    public async getProduct<T extends ProductIncludes = Record<string, never>>(
        productId: number,
        options?: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
        },
    ): Promise<BcApiChefResult<Prettify<BaseProduct & IncludeExpansion<T>>>>;

    public async getProduct(
        productId: number,
        options?: ApiProductQueryBase & {
            includes?: ProductIncludes;
            include_fields?: readonly BaseProductField[];
            exclude_fields?: readonly BaseProductField[];
        },
    ): Promise<BcApiChefResult<BaseProduct>> {
        if (!Number.isInteger(productId) || productId <= 0) {
            return { error: 'Invalid productId', ok: false, statusCode: 400 };
        }

        const { includes, ...query } = options ?? {};
        const includesString = this.generateProductIncludes(includes);
        const querySuffix = buildQueryString(query as ApiProductQuery, { include: includesString });
        const url = `${this.apiUrl}/${productId}${querySuffix}`;

        return await fetchOne<FullProduct>(url, this.accessToken);
    }

    /** Fetches all products across every page, or a single page if `page` is supplied.
     * @param options Query and include options — flat object. `includes` controls sub-resource expansion, remaining keys are query params sent to the API. Supply `page` to fetch a single page instead of auto-collecting every page.
     * @param options.includes - Include sub-resources in the response by setting the relevant flags to `true`. For example, `{ includes: { variants: true, images: true } }` will include both variants and images in the response. Defaults to no sub-resources included.
     * @returns {Promise<BcApiChefResult>} The collected products or an error result.
     */
    public async getProducts<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] = readonly BaseProductField[],
    >(
        // BC returns 409 when both include_fields and exclude_fields are supplied, so we enforce mutual exclusion at the type level.
        options: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields: F;
            exclude_fields?: never;
        },
    ): Promise<BcApiChefResult<Prettify<Pick<BaseProduct, F[number]> & IncludeExpansion<T>>[]>>;

    public async getProducts<
        T extends ProductIncludes = Record<string, never>,
        E extends readonly BaseProductField[] = readonly BaseProductField[],
    >(
        options: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields?: never;
            exclude_fields: E;
        },
    ): Promise<BcApiChefResult<Prettify<Omit<BaseProduct, E[number]> & IncludeExpansion<T>>[]>>;

    public async getProducts<T extends ProductIncludes = Record<string, never>>(
        options?: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
        },
    ): Promise<BcApiChefResult<Prettify<BaseProduct & IncludeExpansion<T>>[]>>;

    public async getProducts(
        options?: ApiProductQueryBase & {
            includes?: ProductIncludes;
            include_fields?: readonly BaseProductField[];
            exclude_fields?: readonly BaseProductField[];
        },
    ): Promise<BcApiChefResult<BaseProduct[]>> {
        const { includes, ...query } = options ?? {};
        const includesString = this.generateProductIncludes(includes);
        const querySuffix = buildQueryString(query as ApiProductQuery, { include: includesString });
        const url = `${this.apiUrl}${querySuffix}`;

        return await fetchPaginated<FullProduct>(
            url,
            this.accessToken,
            clampPerPageLimits(query?.limit),
            query?.page,
        );
    }

    /** Updates an existing product by ID.
     * @param productId Product ID.
     * @param payload Product data to update.
     * @param options Query and include options — flat object. `includes` controls sub-resource expansion, `include_fields` narrows the returned fields.
     * @param options.includes - Include sub-resources in the response by setting the relevant flags to `true`. For example, `{ includes: { variants: true, images: true } }` will include both variants and images in the response. Defaults to no sub-resources included.
     * @returns {Promise<BcApiChefResult>} The updated product or an error result.
     */
    public async updateProduct<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] = readonly BaseProductField[],
    >(
        productId: number,
        payload: UpdateProductPayload,
        options: {
            includes?: T & ProductIncludes;
            include_fields: F;
        },
    ): Promise<BcApiChefResult<Prettify<Pick<BaseProduct, F[number]> & IncludeExpansion<T>>>>;

    public async updateProduct<T extends ProductIncludes = Record<string, never>>(
        productId: number,
        payload: UpdateProductPayload,
        options?: {
            includes?: T & ProductIncludes;
        },
    ): Promise<BcApiChefResult<Prettify<BaseProduct & IncludeExpansion<T>>>>;

    public async updateProduct(
        productId: number,
        payload: UpdateProductPayload,
        options?: {
            includes?: ProductIncludes;
            include_fields?: readonly BaseProductField[];
        },
    ): Promise<BcApiChefResult<BaseProduct>> {
        const validationError = this.validateUpdateProductPayload(payload);

        if (validationError !== null) {
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const { includes, ...query } = options ?? {};
        const includesString = this.generateProductIncludes(includes);
        const querySuffix = buildQueryString(query as ApiProductQuery, { include: includesString });
        const url = `${this.apiUrl}/${productId}${querySuffix}`;

        return await updateResource<BaseProduct, UpdateProductPayload>(
            url,
            this.accessToken,
            payload,
        );
    }

    /* ===== Sub-resource Methods/Classes ===== */

    /** Returns an instance of the {@link ProductImages} class to manage product images, which are accessed via the `/catalog/products/{product_id}/images` endpoint.
     * @returns {ProductImages} An instance of the ProductImages class.
     */
    public images(): ProductImages {
        return new ProductImages(this.accessToken, this.apiUrl);
    }

    /**
     * Returns an instance of the {@link ProductMetafields} class to manage product metafields, which are accessed via the `/catalog/products/{product_id}/metafields` endpoint.
     * @returns {ProductMetafields} An instance of the ProductMetafields class.
     */
    public metafields(): ProductMetafields {
        return new ProductMetafields(this.accessToken, this.apiUrl);
    }

    /* ===== Helper Methods ===== */

    /** Serializes include flags into the API format.
     * @param includes Include flags.
     * @returns {string} A comma-separated include string.
     */
    private generateProductIncludes(includes: ProductIncludes | undefined): string {
        if (!includes) {
            return '';
        }

        return Object.entries(includes)
            .filter(([, value]) => value === true)
            .map(([key]) => key)
            .join(',');
    }

    // ===== Validation Methods ===== */

    /** Validates fields shared by create and update payloads.
     * @param payload Product data to validate.
     * @returns {string | null} A validation error message, or `null` when valid.
     */
    private validateCommonProductFields(payload: CommonProductValidationPayload): string | null {
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
    private validateCreateProductPayload(payload: CreateProductPayload): string | null {
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

        const validationError = this.validateCommonProductFields(payload);

        if (validationError !== null) {
            return validationError;
        }

        return null;
    }

    /** Validates the update payload.
     * @param payload Product data to validate.
     * @returns {string | null} A validation error message, or `null` when valid.
     */
    private validateUpdateProductPayload(payload: UpdateProductPayload): string | null {
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

        const validationError = this.validateCommonProductFields(payload);

        if (validationError !== null) {
            return validationError;
        }

        return null;
    }
}

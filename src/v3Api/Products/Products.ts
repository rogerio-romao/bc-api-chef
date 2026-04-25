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

import ProductBulkPricingRules from './ProductBulkPricingRules';
import ProductCategoryAssignments from './ProductCategoryAssignments';
import ProductCustomFields from './ProductCustomFields';
import ProductImages from './ProductImages';
import ProductMetafields from './ProductMetafields';

import type { ApiResult, RetryConfig, StandardSchemaV1 } from '@/types/api-types';
import type {
    ApiGetProductQueryBase,
    ApiProductQuery,
    ApiProductQueryBase,
    BaseProduct,
    CommonProductValidationPayload,
    CreateProductPayload,
    CreateProductReturnType,
    FullProduct,
    IncludeExpansion,
    NoIdProductField,
    NoProductIncludes,
    ProductIncludes,
    ProductWithFields,
    ProductWithoutFields,
    UpdateProductPayload,
} from '@/types/product-types';

/**
 * Wrapper around the BigCommerce V3 `catalog/products` endpoint.
 *
 * Not intended to be instantiated directly by package consumers — obtain an
 * instance via `BcApiChef.v3().products()`. All methods return a
 * {@link ApiResult}, which is either `{ data: T; ok: true; }` on success or `{ error: string; ok: false; statusCode: number }` on failure.
 *
 * Public methods:
 * - {@link ProductsV3.create} — `POST` a new product.
 * - {@link ProductsV3.getMultiple} — paginated list, auto-collects every page, or single page if `query.page` is supplied.
 * - {@link ProductsV3.getOne} — fetch a single product by id.
 * - {@link ProductsV3.update} — `PUT` an existing product.
 * - {@link ProductsV3.remove} — `DELETE` a product by id.
 */
export default class ProductsV3 {
    private accessToken: string;
    private apiUrl: string;
    private readonly productsApiPath = 'catalog/products';

    /**
     * @param baseUrlWithVersion - Store base URL including the `/v3` version segment.
     * @param accessToken - BigCommerce API access token, sent as `X-Auth-Token`
     * on every request.
     */
    constructor(baseUrlWithVersion: string, accessToken: string) {
        this.accessToken = accessToken;
        this.apiUrl = `${baseUrlWithVersion}/${this.productsApiPath}`;
    }

    /* -------------------------------------------------------------------------- */
    /*                            PRODUCT CRUD METHODS                            */
    /* -------------------------------------------------------------------------- */

    /* ----------------------------- CREATE PRODUCT ----------------------------- */
    /**
     * Creates a new product. There are two overloads of this method:
     * - The first overload accepts an `options` object with an `include_fields` property, which narrows the returned fields to those specified in the array. The return type is inferred accordingly at compile time.
     * - The second overload does not accept an `options` object, and returns the full product.
     *
     * @param productData Product data to create.
     * @param options Query options.
     * @param options.include_fields - An array of top-level product fields to include in the response. For example, `['name', 'price']` will return only the `id`, `name`, and `price` fields for the created product. Mutually exclusive with `exclude_fields`.
     * @param options.schema - A Standard Schema to validate the API response against. If validation fails, the method will return a 422 error with details about the validation failure.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<BaseProduct>} The created product with only the requested fields, or an error result.
     */
    public async create<F extends readonly NoIdProductField[]>(
        productData: CreateProductPayload,
        options: { include_fields: F; schema?: StandardSchemaV1; retries?: RetryConfig },
    ): ApiResult<CreateProductReturnType<F>>;

    public async create(
        productData: CreateProductPayload,
        options?: { schema?: StandardSchemaV1; retries?: RetryConfig },
    ): ApiResult<BaseProduct>;

    public async create(
        productData: CreateProductPayload,
        options?: {
            include_fields?: readonly NoIdProductField[];
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<BaseProduct> {
        const validationError = this.validateCreateProductPayload(productData);

        if (validationError !== null) {
            // At least one validation error was found on the payload, meaning one of the fields is invalid as per BC docs (name too big, invalid number, etc.) — return an error result without making the API call
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const { schema, retries, ...queryOptions } = options ?? {};
        const querySuffix = buildQueryString(queryOptions);
        const url = `${this.apiUrl}${querySuffix}`;

        return await createResource(url, this.accessToken, productData, schema, retries);
    }

    /* ------------------------------ GET PRODUCTS ------------------------------ */
    /**
     * Fetches all products across every page, or a single page if `page` is supplied.
     * There are three overloads of this method:
     * - The first overload accepts an `options` object with an `include_fields` property, which narrows the returned fields to those specified in the array. The return type is inferred accordingly at compile time.
     * - The second overload accepts an `options` object with an `exclude_fields` property, which narrows the returned fields by excluding those specified in the array. The return type is inferred accordingly at compile time.
     * - The third overload does not accept an `options` object, and returns the full products.
     *
     * @param options Query and include options — flat object. Supply `page` to fetch a single page instead of auto-collecting every page, limit to control results per page, and the various filter/sort query params supported by the BC API.
     * @param options.includes - Include sub-resources in the response by setting the relevant flags to `true`. For example, `{ includes: { variants: true, images: true } }` will include both variants and images in the response. Defaults to no sub-resources included.
     * @param options.include_fields - An array of top-level product fields to include in the response. For example, `['name', 'price']` will return only the `id`, `name`, and `price` fields for each product. Mutually exclusive with `exclude_fields`.
     * @param options.exclude_fields - An array of top-level product fields to exclude from the response. For example, `['description', 'weight']` will return all fields except `description` and `weight` for each product. Mutually exclusive with `include_fields`.
     * @param options.schema - A Standard Schema to validate each item in the API response against. If validation fails for any item, the method will return a 422 error with details about the validation failure. Validation is performed on each page of results as they are fetched, so if you are paginating through results and a later page contains invalid data, you will still get a 422 error without having to wait for all pages to be fetched.
     * @param options.retries - Configuration for retrying any individual page request in case of transient errors.
     * @returns {ApiResult<BaseProduct[]>} The collected products or an error result.
     */
    public async getMultiple<
        T extends ProductIncludes = NoProductIncludes,
        F extends readonly NoIdProductField[] = readonly NoIdProductField[],
    >(
        // BC returns 409 when both include_fields and exclude_fields are supplied, so we enforce mutual exclusion at the type level.
        options: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields: F;
            exclude_fields?: never;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<ProductWithFields<F, T>[]>;

    public async getMultiple<
        T extends ProductIncludes = NoProductIncludes,
        E extends readonly NoIdProductField[] = readonly NoIdProductField[],
    >(
        options: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields?: never;
            exclude_fields: E;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<ProductWithoutFields<E, T>[]>;

    public async getMultiple<T extends ProductIncludes = NoProductIncludes>(
        options?: ApiProductQueryBase & {
            includes?: T & ProductIncludes;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<(BaseProduct & IncludeExpansion<T>)[]>;

    public async getMultiple(
        options?: ApiProductQueryBase & {
            includes?: ProductIncludes;
            include_fields?: readonly NoIdProductField[];
            exclude_fields?: readonly NoIdProductField[];
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<BaseProduct[]> {
        const { includes, schema, retries, ...query } = options ?? {};
        const includesString = this.generateProductIncludes(includes);
        const querySuffix = buildQueryString(query as ApiProductQuery, { include: includesString });
        const url = `${this.apiUrl}${querySuffix}`;

        return await fetchPaginated<FullProduct>(
            url,
            this.accessToken,
            clampPerPageLimits(query?.limit),
            query?.page,
            schema,
            retries,
        );
    }

    /* ------------------------------ GET PRODUCT ------------------------------ */
    /**
     * Fetches a single product by ID. There are three overloads of this method:
     * - The first overload accepts an `options` object with an `include_fields` property, which narrows the returned fields to those specified in the array. The return type is inferred accordingly at compile time.
     * - The second overload accepts an `options` object with an `exclude_fields` property, which narrows the returned fields by excluding those specified in the array. The return type is inferred accordingly at compile time.
     * - The third overload does not accept an `options` object, and returns the full product.
     *
     * @param productId Product ID.
     * @param options Include and exclude options — flat object. There are no other query params supported by this endpoint.
     * @param options.includes - Include sub-resources in the response by setting the relevant flags to `true`. For example, `{ includes: { variants: true, images: true } }` will include both variants and images in the response. Defaults to no sub-resources included.
     * @param options.include_fields - An array of top-level product fields to include in the response. For example, `['name', 'price']` will return only the `id`, `name`, and `price` fields for the product. Mutually exclusive with `exclude_fields`.
     * @param options.exclude_fields - An array of top-level product fields to exclude from the response. For example, `['description', 'weight']` will return all fields except `description` and `weight` for the product. Mutually exclusive with `include_fields`.
     * @param options.schema - A Standard Schema to validate the API response against. If validation fails, the method will return a 422 error with details about the validation failure.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<BaseProduct>} The product or an error result.
     */
    public async getOne<
        T extends ProductIncludes = NoProductIncludes,
        F extends readonly NoIdProductField[] = readonly NoIdProductField[],
    >(
        productId: number,
        options: ApiGetProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields: F;
            exclude_fields?: never;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<ProductWithFields<F, T>>;

    public async getOne<
        T extends ProductIncludes = NoProductIncludes,
        E extends readonly NoIdProductField[] = readonly NoIdProductField[],
    >(
        productId: number,
        options: ApiGetProductQueryBase & {
            includes?: T & ProductIncludes;
            include_fields?: never;
            exclude_fields: E;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<ProductWithoutFields<E, T>>;

    public async getOne<T extends ProductIncludes = NoProductIncludes>(
        productId: number,
        options?: ApiGetProductQueryBase & {
            includes?: T & ProductIncludes;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<BaseProduct & IncludeExpansion<T>>;

    public async getOne(
        productId: number,
        options?: ApiProductQueryBase & {
            includes?: ProductIncludes;
            include_fields?: readonly NoIdProductField[];
            exclude_fields?: readonly NoIdProductField[];
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<BaseProduct> {
        const idValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idValidOrErrorMsg !== true) {
            return { error: idValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const { includes, schema, retries, ...query } = options ?? {};
        const includesString = this.generateProductIncludes(includes);
        const querySuffix = buildQueryString(query as ApiProductQuery, { include: includesString });
        const url = `${this.apiUrl}/${productId}${querySuffix}`;

        return await fetchOne<FullProduct>(url, this.accessToken, schema, retries);
    }

    /* ------------------------------ UPDATE PRODUCT ------------------------------ */
    /**
     * Updates an existing product by ID. There are two overloads of this method:
     * - The first overload accepts an `options` object `includes`, to add sub-resources like variants or images, and with an `include_fields` property, which narrows the returned fields to those specified in the array. The return type is inferred accordingly at compile time.
     * - The second overload accepts an `options` object with an `includes` property but without `include_fields`, and returns the full product with the included sub-resources.
     *
     * @param productId Product ID.
     * @param payload Product data to update.
     * @param options Query and include options — flat object.
     * @param options.includes - Include sub-resources in the response by setting the relevant flags to `true`. For example, `{ includes: { variants: true, images: true } }` will include both variants and images in the response. Defaults to no sub-resources included.
     * @param options.include_fields - An array of top-level product fields to include in the response. For example, `['name', 'price']` will return only the `id`, `name`, and `price` fields for the product. Ignored if not supplied, in which case all fields are returned.
     * @param options.schema - A Standard Schema to validate the API response against. If validation fails, the method will return a 422 error with details about the validation failure.
     * @param options.retries - Configuration for retrying the request in case of transient errors.
     * @returns {ApiResult<BaseProduct>} The updated product or an error result.
     */
    public async update<
        T extends ProductIncludes = NoProductIncludes,
        F extends readonly NoIdProductField[] = readonly NoIdProductField[],
    >(
        productId: number,
        payload: UpdateProductPayload,
        options: {
            includes?: T & ProductIncludes;
            include_fields: F;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<ProductWithFields<F, T>>;

    public async update<T extends ProductIncludes = NoProductIncludes>(
        productId: number,
        payload: UpdateProductPayload,
        options?: {
            includes?: T & ProductIncludes;
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<BaseProduct & IncludeExpansion<T>>;

    public async update(
        productId: number,
        payload: UpdateProductPayload,
        options?: {
            includes?: ProductIncludes;
            include_fields?: readonly NoIdProductField[];
            schema?: StandardSchemaV1;
            retries?: RetryConfig;
        },
    ): ApiResult<BaseProduct> {
        const idValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idValidOrErrorMsg !== true) {
            return { error: idValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const validationError = this.validateUpdateProductPayload(payload);

        if (validationError !== null) {
            return { error: validationError, ok: false, statusCode: 400 };
        }

        const { includes, schema, retries, ...query } = options ?? {};
        const includesString = this.generateProductIncludes(includes);
        const querySuffix = buildQueryString(query as ApiProductQuery, { include: includesString });
        const url = `${this.apiUrl}/${productId}${querySuffix}`;

        return await updateResource(url, this.accessToken, payload, schema, retries);
    }

    /* ------------------------------ DELETE PRODUCT ------------------------------ */
    /**
     * Deletes a product by ID.
     * @param productId Product ID.
     * @param options Optional parameters.
     * @param options.retries - Optional retry configuration to automatically retry the request on transient errors.
     * @returns {ApiResult<null>} `null` on success or an error result.
     */
    public async remove(productId: number, options?: { retries?: RetryConfig }): ApiResult<null> {
        const idValidOrErrorMsg = validatePositiveIntegers({ productId });

        if (idValidOrErrorMsg !== true) {
            return { error: idValidOrErrorMsg, ok: false, statusCode: 400 };
        }

        const url = `${this.apiUrl}/${productId}`;

        return await deleteResource(url, this.accessToken, options?.retries);
    }

    /* -------------------------------------------------------------------------- */
    /*                       SUB_RESOURCE METHODS / CLASSES                       */
    /* -------------------------------------------------------------------------- */

    /**
     * Returns an instance of the {@link ProductBulkPricingRules} class to manage product bulk pricing rules, which are accessed via the `/catalog/products/{product_id}/bulk-pricing-rules` endpoint.
     * @returns {ProductBulkPricingRules} An instance of the ProductBulkPricingRules class.
     */
    public bulkPricingRules(): ProductBulkPricingRules {
        return new ProductBulkPricingRules(this.accessToken, this.apiUrl);
    }

    /**
     * Returns an instance of the {@link ProductCategoryAssignments} class to manage product category assignments, which are accessed via the `/catalog/products/{product_id}/categories` endpoint.
     * @returns {ProductCategoryAssignments} An instance of the ProductCategoryAssignments class.
     */
    public categoryAssignments(): ProductCategoryAssignments {
        return new ProductCategoryAssignments(this.accessToken, this.apiUrl);
    }

    /**
     * Returns an instance of the {@link ProductCustomFields} class to manage product custom fields, which are accessed via the `/catalog/products/{product_id}/custom-fields` endpoint.
     * @returns {ProductCustomFields} An instance of the ProductCustomFields class.
     */
    public customFields(): ProductCustomFields {
        return new ProductCustomFields(this.accessToken, this.apiUrl);
    }

    /**
     * Returns an instance of the {@link ProductImages} class to manage product images, which are accessed via the `/catalog/products/{product_id}/images` endpoint.
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

    /* -------------------------------------------------------------------------- */
    /*                                HELPER METHODS                              */
    /* -------------------------------------------------------------------------- */

    /**
     * Serializes include flags into the API format.
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

    /* -------------------------------------------------------------------------- */
    /*                            VALIDATION METHODS                              */
    /* -------------------------------------------------------------------------- */

    /**
     * Validates fields shared by create and update payloads.
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

    /**
     * Validates the create payload.
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

    /**
     * Validates the update payload.
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

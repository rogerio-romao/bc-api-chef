import tchef, { type TchefResult } from 'tchef';

import type {
    ApiProductQuery,
    BcCreateProductResponse,
    BcGetProductResponse,
    BcGetProductsResponse,
    CreateProductPayload,
    CreateProductReturnType,
    GetProductReturnType,
    GetProductsReturnType,
    ProductIncludes,
} from '../../types/bigcommerce/api-types.ts';
import type { BaseProductField } from '../../types/bigcommerce/product-types.ts';
import {
    DEFAULT_LIMIT,
    DEFAULT_START_PAGE,
    MAX_LIMIT,
    MIN_LIMIT,
} from '../constants.ts';

export default class ProductsV3 {
    private readonly baseEndpoint = 'catalog/products';
    private baseUrlWithVersion: string;
    private accessToken: string;
    private validate: boolean;
    private retries: number;

    constructor(
        baseUrlWithVersion: string,
        accessToken: string,
        validate = false,
        retries = 0
    ) {
        this.baseUrlWithVersion = baseUrlWithVersion;
        this.accessToken = accessToken;
        this.validate = validate;
        this.retries = retries;
    }

    public async deleteProduct(productId: number): Promise<TchefResult<null>> {
        const endpoint = `${this.baseEndpoint}/${productId}`;
        const res = await tchef(`${this.baseUrlWithVersion}/${endpoint}`, {
            method: 'DELETE',
            headers: {
                'X-Auth-Token': this.accessToken,
            },
            responseFormat: 'text', // BigCommerce returns an empty string on successful delete, so we use 'text' to avoid JSON parsing errors
        });

        if (!res.ok) {
            return res;
        }

        return { ok: true, data: null };
    }

    public async getAllProducts<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] | undefined = undefined,
    >(options?: {
        includes?: T;
        query?: Omit<ApiProductQuery, 'include_fields'> & {
            include_fields?: F;
        };
    }): Promise<TchefResult<GetProductsReturnType<T, F>>> {
        const query = options?.query as ApiProductQuery | undefined;
        const includesString = this.generateIncludes(options?.includes);
        const queryString = this.generateQueryString(query, includesString);
        return (await this.getMultiPage(
            this.baseEndpoint,
            queryString,
            query?.page ?? DEFAULT_START_PAGE,
            this.clampLimit(query?.limit ?? DEFAULT_LIMIT)
        )) as TchefResult<GetProductsReturnType<T, F>>;
    }

    public async getProduct<
        T extends ProductIncludes = Record<string, never>,
        F extends readonly BaseProductField[] | undefined = undefined,
    >(
        id: number,
        options?: {
            includes?: T;
            query?: Omit<ApiProductQuery, 'include_fields'> & {
                include_fields?: F;
            };
        }
    ): Promise<TchefResult<GetProductReturnType<T, F>>> {
        const query = options?.query as ApiProductQuery | undefined;
        const includesString = this.generateIncludes(options?.includes);
        const queryString = this.generateQueryString(query, includesString);
        const querySuffix = queryString ? `?${queryString}` : '';
        const endpoint = `${this.baseEndpoint}/${id}${querySuffix}`;

        return (await this.get(endpoint)) as TchefResult<
            GetProductReturnType<T, F>
        >;
    }

    public async createProduct<
        F extends readonly BaseProductField[] | undefined = undefined,
    >(
        payload: CreateProductPayload,
        options?: {
            query?: { include_fields?: F };
        }
    ): Promise<TchefResult<CreateProductReturnType<F>>> {
        const validationError = this.validateCreatePayload(payload);
        if (validationError !== null) {
            return { ok: false, error: validationError, statusCode: 400 };
        }

        const query = options?.query as ApiProductQuery | undefined;
        const queryString = this.generateQueryString(query, '');
        const querySuffix = queryString ? `?${queryString}` : '';
        const endpoint = `${this.baseEndpoint}${querySuffix}`;

        const res = await tchef(`${this.baseUrlWithVersion}/${endpoint}`, {
            method: 'POST',
            headers: {
                'X-Auth-Token': this.accessToken,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            return res;
        }

        const { data } = res.data as BcCreateProductResponse;
        return { ok: true, data: data as CreateProductReturnType<F> };
    }

    public async get(endpoint: string): Promise<TchefResult<unknown>> {
        const res = await tchef(`${this.baseUrlWithVersion}/${endpoint}`, {
            headers: {
                'X-Auth-Token': this.accessToken,
                Accept: 'application/json',
            },
        });
        if (!res.ok) {
            return res;
        }
        const { data } = res.data as BcGetProductResponse;
        return { ok: true, data };
    }

    public async getMultiPage(
        endpoint: string,
        queryString: string,
        initialPage = DEFAULT_START_PAGE,
        limit = DEFAULT_LIMIT
    ): Promise<TchefResult<unknown[]>> {
        const results: unknown[] = [];

        let page = initialPage;
        let totalPages = 1;

        do {
            const querySuffix = queryString ? `&${queryString}` : '';
            const url = `${this.baseUrlWithVersion}/${endpoint}?page=${page}&limit=${limit}${querySuffix}`;

            const res = await tchef(url, {
                headers: {
                    'X-Auth-Token': this.accessToken,
                    Accept: 'application/json',
                },
            });

            if (!res.ok) {
                return res;
            }

            const { data, meta } = res.data as BcGetProductsResponse;

            results.push(...data);
            totalPages = meta.pagination.total_pages;
            page += 1;
        } while (page <= totalPages);

        return { ok: true, data: results };
    }

    private clampLimit(limit: number): number {
        return Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
    }

    private generateIncludes(includes: ProductIncludes | undefined): string {
        if (!includes) {
            return '';
        }

        return Object.entries(includes)
            .filter(([, value]) => value === true)
            .map(([key]) => key)
            .join(',');
    }

    private generateQueryString(
        query: ApiProductQuery | undefined,
        includes: string
    ): string {
        const params = new URLSearchParams();

        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined && key !== 'page' && key !== 'limit') {
                    params.set(
                        key,
                        Array.isArray(value) ? value.join(',') : String(value)
                    );
                }
            }
        }

        if (includes) {
            params.set('include', includes);
        }

        return params.toString();
    }

    private validateCreatePayload(payload: CreateProductPayload): string | null {
        // name (required, minLength 1, maxLength 250)
        if (payload.name.length === 0) {return 'Product name must not be empty';}
        if (payload.name.length > 250) {return 'Product name must not exceed 250 characters';}

        // price (required, minimum 0)
        if (payload.price < 0) {return 'price must be >= 0';}

        // weight (required, minimum 0, maximum 9999999999)
        if (payload.weight < 0) {return 'weight must be >= 0';}
        if (payload.weight > 9999999999) {return 'weight must be <= 9999999999';}

        // optional string fields with maxLength
        const strChecks: Array<[string | undefined, string, number]> = [
            [payload.sku, 'sku', 255],
            [payload.product_tax_code, 'product_tax_code', 255],
            [payload.warranty, 'warranty', 65535],
            [payload.bin_picking_number, 'bin_picking_number', 255],
            [payload.layout_file, 'layout_file', 500],
            [payload.upc, 'upc', 32],
            [payload.search_keywords, 'search_keywords', 65535],
            [payload.availability_description, 'availability_description', 255],
            [payload.page_title, 'page_title', 255],
            [payload.meta_description, 'meta_description', 65535],
            [payload.preorder_message, 'preorder_message', 255],
            [payload.price_hidden_label, 'price_hidden_label', 200],
        ];
        for (const [value, field, max] of strChecks) {
            if (value !== undefined && value.length > max) {
                return `${field} must not exceed ${max} characters`;
            }
        }

        // optional number fields with min and/or max
        const numChecks: Array<[number | undefined, string, number, number | undefined]> = [
            [payload.width,                    'width',                    0,           9999999999],
            [payload.depth,                    'depth',                    0,           9999999999],
            [payload.height,                   'height',                   0,           9999999999],
            [payload.cost_price,               'cost_price',               0,           undefined],
            [payload.retail_price,             'retail_price',             0,           undefined],
            [payload.sale_price,               'sale_price',               0,           undefined],
            [payload.fixed_cost_shipping_price,'fixed_cost_shipping_price',0,           undefined],
            [payload.tax_class_id,             'tax_class_id',             0,           255],
            [payload.brand_id,                 'brand_id',                 0,           1_000_000_000],
            [payload.inventory_level,          'inventory_level',          0,           2_147_483_647],
            [payload.inventory_warning_level,  'inventory_warning_level',  0,           2_147_483_647],
            [payload.sort_order,               'sort_order',               -2_147_483_648, 2_147_483_647],
            [payload.order_quantity_minimum,   'order_quantity_minimum',   0,           1_000_000_000],
            [payload.order_quantity_maximum,   'order_quantity_maximum',   0,           1_000_000_000],
        ];
        for (const [value, field, min, max] of numChecks) {
            if (value === undefined) {continue;}
            if (value < min) {return `${field} must be >= ${min}`;}
            if (max !== undefined && value > max) {return `${field} must be <= ${max}`;}
        }

        // array length constraints
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
}

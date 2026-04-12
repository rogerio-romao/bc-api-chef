import tchef, { type TchefResult } from 'tchef';

import type {
    ApiProductQuery,
    BcGetProductsResponse,
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
            'catalog/products',
            queryString,
            query?.page ?? DEFAULT_START_PAGE,
            this.clampLimit(query?.limit ?? DEFAULT_LIMIT)
        )) as TchefResult<GetProductsReturnType<T, F>>;
    }

    public async get(endpoint: string): Promise<TchefResult<unknown>> {
        return await tchef(`${this.baseUrlWithVersion}/${endpoint}`, {
            headers: {
                'X-Auth-Token': this.accessToken,
                Accept: 'application/json',
            },
        });
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
            const url = `${this.baseUrlWithVersion}/${endpoint}?page=${page}&limit=${limit}${
                queryString ? `&${queryString}` : ''
            }`;

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
}

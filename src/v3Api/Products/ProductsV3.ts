import tchef from 'tchef';

import type { TchefResult } from 'tchef/dist/src/types';
import type {
    ApiProductQuery,
    BcGetProductsResponse,
    GetProductsOptions,
    GetProductsReturnType,
    ProductIncludes,
} from '../../types/bigcommerce/api-types';
import type { FullProduct } from '../../types/bigcommerce/product-types';

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

    public async getAllProducts<T extends ProductIncludes>(options: {
        includes: T;
        query: ApiProductQuery;
    }): Promise<TchefResult<GetProductsReturnType<T>[]>> {
        const includesString = this.generateIncludes(options.includes);
        const queryString = this.generateQueryString(
            options.query,
            includesString
        );
        return (await this.getMultiPage(
            'catalog/products',
            queryString
        )) as TchefResult<GetProductsReturnType<T>[]>;
    }

    public async get(endpoint: string): Promise<TchefResult<unknown>> {
        return await tchef(`${this.baseUrlWithVersion}${endpoint}`, {
            headers: {
                'X-Auth-Token': this.accessToken,
            },
        });
    }

    public async getMultiPage(
        endpoint: string,
        queryString: string
    ): Promise<TchefResult<FullProduct[]>> {
        const results: FullProduct[] = [];

        let page = 1;
        const limit = 250;
        let totalPages = 1;

        const url =
            `${this.baseUrlWithVersion}${endpoint}?page=${page}&limit=${limit}` +
            (queryString ? `&${queryString}` : '');

        do {
            const res = await tchef(url, {
                headers: {
                    'X-Auth-Token': this.accessToken,
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

    private generateIncludes(includes: GetProductsOptions['includes']): string {
        if (!includes) {
            return '';
        }

        let includeString = '';

        for (const key in includes) {
            includeString += `${key},`;
        }

        return includeString.slice(0, -1);
    }

    private generateQueryString(
        query: GetProductsOptions['query'],
        includes: string
    ): string {
        if (!query) {
            return '';
        }

        const fromQuery = Object.entries(query)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        return includes ? `${fromQuery}&include=${includes}` : fromQuery;
    }
}

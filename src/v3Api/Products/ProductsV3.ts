import tchef from 'tchef';

import type { TchefResult } from 'tchef/dist/src/types';
import type { ApiProductQuery } from '../../types/bigcommerce/api-types';
import type { BaseProduct } from '../../types/bigcommerce/product-types';

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

    public async getAllProducts(
        query: ApiProductQuery = {}
    ): Promise<TchefResult<BaseProduct[]>> {
        return await this.getMultiPage('catalog/products');
    }

    public async get(endpoint: string): Promise<TchefResult<unknown>> {
        return await tchef(`${this.baseUrlWithVersion}${endpoint}`, {
            headers: {
                'X-Auth-Token': this.accessToken,
            },
        });
    }

    public async getMultiPage(
        endpoint: string
    ): Promise<TchefResult<BaseProduct[]>> {
        const results: BaseProduct[] = [];

        let page = 1;
        const limit = 250;
        let totalPages = 1;

        do {
            const res = await tchef(
                `${this.baseUrlWithVersion}${endpoint}?page=${page}&limit=${limit}`,
                {
                    headers: {
                        'X-Auth-Token': this.accessToken,
                    },
                }
            );
            if (!res.ok) {
                return res;
            }

            const { data, meta } = res.data as {
                data: BaseProduct[];
                meta: { pagination: { total_pages: number } };
            };

            results.push(...data);
            totalPages = meta.pagination.total_pages;
            page += 1;
        } while (page <= totalPages);

        return { ok: true, data: results };
    }
}

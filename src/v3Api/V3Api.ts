import ProductsV3 from './Products/Products.ts';

import type { BcApiChefOptions } from '@/types/api-types';

/**
 * Fluent builder for BigCommerce's `/v3` API namespace.
 *
 * Not intended to be instantiated directly by package consumers — use
 * {@link BcApiChef.v3} to obtain a correctly-configured instance. Each call
 * to a sub-resource method (currently only {@link V3Api.products}) returns a
 * fresh endpoint wrapper sharing the same access token, base URL, and
 * forwarded options.
 *
 * Scope today: `catalog/products` only. The class is structured to scale to
 * additional V3 endpoint families (brands, categories, customers, etc.) as
 * the package grows.
 */
export default class V3Api {
    private version = 'v3';
    private baseUrl: string;
    private accessToken: string;
    private options: Required<BcApiChefOptions>;
    private baseUrlWithVersion: string;

    /**
     * @param baseUrl     - Store base URL (`https://api.bigcommerce.com/stores/{hash}`),
     *                      without the API version segment.
     * @param accessToken - BigCommerce API access token, forwarded to every request.
     * @param options     - Shared client options propagated from `BcApiChef`.
     *                      `validate` controls client-side payload validation on
     *                      mutating requests and `retries` is reserved for retry
     *                      support in downstream HTTP calls.
     *
     * @todo `validate` is not yet honoured by `ProductsV3` (validators always run).
     * @todo `retries` is not yet forwarded to `tchef()` by `ProductsV3`.
     */
    constructor(baseUrl: string, accessToken: string, options: BcApiChefOptions = {}) {
        this.baseUrl = baseUrl;
        this.accessToken = accessToken;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
        this.baseUrlWithVersion = `${this.baseUrl}/${this.version}`;
    }

    public products(): ProductsV3 {
        return new ProductsV3(this.baseUrlWithVersion, this.accessToken, this.options);
    }
}

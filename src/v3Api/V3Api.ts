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
    private accessToken: string;
    private baseUrl: string;
    private baseUrlWithVersion: string;
    /** The `Required` here makes typescript happy without having to check for undefined values upstream constantly, but the values are still optional at runtime */
    private options: Required<BcApiChefOptions>;
    private readonly version = 'v3';

    /**
     * @param baseUrl - Store base URL (`https://api.bigcommerce.com/stores/{hash}`),
     * without the API version segment.
     * @param accessToken - BigCommerce API access token, forwarded to every request.
     * @param options - Shared client options propagated from `BcApiChef`.
     * `validate` controls runtime response validation before results are returned
     * to callers, and `retries` is reserved for retry support in downstream HTTP
     * calls.
     * @param options.validate - When `true`, runtime validation runs on responses
     * received from BigCommerce before they are returned to the caller.
     * Defaults to `false`.
     * @param options.retries  - Number of times to retry a failed HTTP request before
     * surfacing the error. Forwarded to the underlying `tchef` HTTP client.
     * Defaults to `0` (no retries).
     * @todo `validate` is not yet honoured by `ProductsV3`.
     * @todo `retries` is not yet forwarded to `tchef()` by `ProductsV3`.
     */
    constructor(baseUrl: string, accessToken: string, options: BcApiChefOptions = {}) {
        this.accessToken = accessToken;
        this.baseUrl = baseUrl;
        this.baseUrlWithVersion = `${this.baseUrl}/${this.version}`;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    /**
     * Creates the Products V3 endpoint wrapper for this client.
     * Each call returns a fresh {@link ProductsV3} instance that shares the same
     * base URL, access token, and client options.
     * @returns {ProductsV3} A new `ProductsV3` instance for catalog product operations.
     */
    public products(): ProductsV3 {
        return new ProductsV3(this.baseUrlWithVersion, this.accessToken, this.options);
    }
}

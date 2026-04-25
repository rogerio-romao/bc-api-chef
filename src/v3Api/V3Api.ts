import ProductsV3 from './Products/Products.ts';

/**
 * Fluent builder for BigCommerce's `/v3` API namespace.
 *
 * Not intended to be instantiated directly by package consumers — use
 * {@link BcApiChef.v3} to obtain a correctly-configured instance. Each call
 * to a sub-resource method (currently only {@link V3Api.products}) returns a
 * fresh endpoint wrapper sharing the same access token and base URL.
 *
 * Scope today: `catalog/products` only. The class is structured to scale to
 * additional V3 endpoint families (brands, categories, customers, etc.) as
 * the package grows.
 */
export default class V3Api {
    private accessToken: string;
    private baseUrl: string;
    private baseUrlWithVersion: string;
    private readonly version = 'v3';

    /**
     * @param baseUrl - Store base URL (`https://api.bigcommerce.com/stores/{hash}`),
     * without the API version segment.
     * @param accessToken - BigCommerce API access token, forwarded to every request.
     */
    constructor(baseUrl: string, accessToken: string) {
        this.accessToken = accessToken;
        this.baseUrl = baseUrl;
        this.baseUrlWithVersion = `${this.baseUrl}/${this.version}`;
    }

    /**
     * Creates the Products V3 endpoint wrapper for this client.
     * Each call returns a fresh {@link ProductsV3} instance that shares the same
     * base URL and access token.
     * @returns {ProductsV3} A new `ProductsV3` instance for catalog product operations.
     */
    public products(): ProductsV3 {
        return new ProductsV3(this.baseUrlWithVersion, this.accessToken);
    }
}

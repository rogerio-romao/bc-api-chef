import V3Api from './v3Api/V3Api.ts';

const BC_API_BASE_URL = 'https://api.bigcommerce.com/stores';

/**
 * Type-safe fluent client for the BigCommerce REST API.
 *
 * `BcApiChef` is the public entry point for the package. It binds an access
 * token and store hash once, then exposes a fluent builder chain that narrows
 * down to a specific API version and endpoint family:
 * ```ts
 * import { BcApiChef } from 'bc-api-chef';
 *
 * const bc = new BcApiChef(storeHash, accessToken);
 * const result = await bc.v3().products().getOne(42);
 * if (result.ok) {
 *   console.log(result.data);
 * }
 * ```
 * Currently exposes the V3 API namespace via {@link BcApiChef.v3}. Each call
 * to `.v3()` returns a fresh `V3Api` instance bound to the same access token
 * and base URL.
 */
export default class BcApiChef {
    private accessToken: string;
    private baseUrl: string;

    /**
     * Creates a new `BcApiChef` client bound to a specific BigCommerce store.
     * The client is a fluent builder: call `.v3().products()` to reach the
     * catalog/products endpoint.
     * @param storeHash   - BigCommerce store hash (the `{store_hash}` segment in
     * `https://api.bigcommerce.com/stores/{store_hash}`).
     * @param accessToken - BigCommerce API access token, sent as the `X-Auth-Token`
     * header on every request.
     */
    constructor(storeHash: string, accessToken: string) {
        this.accessToken = accessToken;
        this.baseUrl = `${BC_API_BASE_URL}/${storeHash}`;
    }

    /**
     * Creates a fluent entry point for BigCommerce's V3 API namespace.
     * Each call returns a fresh {@link V3Api} instance that shares the same
     * base URL, access token, and client options.
     * @returns {V3Api} A new `V3Api` instance bound to this client configuration.
     */
    public v3(): V3Api {
        return new V3Api(this.baseUrl, this.accessToken);
    }
}

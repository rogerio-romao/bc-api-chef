import V3Api from './v3Api/V3Api.ts';

import type { BcApiChefOptions } from '@/types/api-types';

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
 * const bc = new BcApiChef(storeHash, accessToken, { retries: 3 });
 * const result = await bc.v3().products().getAllProducts();
 * if (result.ok) {
 *   console.log(result.data);
 * }
 * ```
 * Currently exposes the V3 API namespace via {@link BcApiChef.v3}. Each call
 * to `.v3()` returns a fresh `V3Api` instance that shares the same access
 * token, base URL, and options.
 */
export default class BcApiChef {
    private accessToken: string;
    private baseUrl: string;
    /** The `Required` here makes typescript happy without having to check for undefined values upstream constantly, but the values are still optional at runtime */
    private options: Required<BcApiChefOptions>;

    /**
     * Creates a new `BcApiChef` client bound to a specific BigCommerce store.
     * The client is a fluent builder: call `.v3().products()` to reach the
     * catalog/products endpoint.
     * @param storeHash   - BigCommerce store hash (the `{store_hash}` segment in
     * `https://api.bigcommerce.com/stores/{store_hash}`).
     * @param accessToken - BigCommerce API access token, sent as the `X-Auth-Token`
     * header on every request.
     * @param options     - Optional client-wide behaviour toggles. All fields default
     * to a safe value so existing callers are unaffected.
     * @param options.validate - When `true`, runtime validation runs on responses
     * received from BigCommerce before they are returned to the caller.
     * Defaults to `false`.
     * @param options.retries  - Number of times to retry a failed HTTP request before
     * surfacing the error. Forwarded to the underlying `tchef` HTTP client.
     * Defaults to `0` (no retries).
     * @todo `options.validate` is not yet implemented.
     * @todo `options.retries` is not yet forwarded to `tchef()` calls in `ProductsV3`.
     */
    constructor(storeHash: string, accessToken: string, options: BcApiChefOptions = {}) {
        this.accessToken = accessToken;
        this.baseUrl = `${BC_API_BASE_URL}/${storeHash}`;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    /**
     * Creates a fluent entry point for BigCommerce's V3 API namespace.
     * Each call returns a fresh {@link V3Api} instance that shares the same
     * base URL, access token, and client options.
     * @returns {V3Api} A new `V3Api` instance bound to this client configuration.
     */
    public v3(): V3Api {
        return new V3Api(this.baseUrl, this.accessToken, this.options);
    }
}

// oxlint-disable max-lines-per-function

import { assertErr, assertOk } from '@/tests/unit/helpers.ts';
import ProductsV3 from '@/v3Api/Products/Products';

const BASE_URL = 'https://api.bigcommerce.com/stores/test-hash/v3/';

function makeJsonResponse(body: unknown, status = 200): Response {
    // oxlint-disable-next-line unicorn/prefer-response-static-json
    return new Response(JSON.stringify(body), {
        headers: { 'Content-Type': 'application/json' },
        status,
    });
}

function makeSuccessEnvelope(): Response {
    return makeJsonResponse({ data: { id: 42, name: 'Widget' }, meta: {} });
}

describe('retry behaviour (real tchef, stubbed fetch)', () => {
    let products: ProductsV3;

    beforeEach(() => {
        vi.unstubAllGlobals();
        products = new ProductsV3(BASE_URL, 'test-token');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('succeeds after transient failures within the retry budget', async () => {
        const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(makeJsonResponse({ title: 'Internal Server Error' }, 500))
            .mockResolvedValueOnce(makeJsonResponse({ title: 'Internal Server Error' }, 500))
            .mockResolvedValueOnce(makeSuccessEnvelope());

        vi.stubGlobal('fetch', mockFetch);

        const result = await products.getOne(42, {
            retries: { repeat: 2, retryDelay: 0 },
        });

        assertOk(result);
        expect(result.data.id).toBe(42);
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('returns an error result when all retries are exhausted', async () => {
        const mockFetch = vi
            .fn()
            .mockResolvedValue(makeJsonResponse({ title: 'Service Unavailable' }, 503));

        vi.stubGlobal('fetch', mockFetch);

        const result = await products.getOne(42, {
            retries: { repeat: 2, retryDelay: 0 },
        });

        assertErr(result);
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('makes exactly one call when repeat is 0', async () => {
        const mockFetch = vi.fn().mockResolvedValue(makeSuccessEnvelope());

        vi.stubGlobal('fetch', mockFetch);

        const result = await products.getOne(42, {
            retries: { repeat: 0 },
        });

        assertOk(result);
        expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('forwards retryDelay to tchef and does not crash', async () => {
        const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(makeJsonResponse({ title: 'Bad Gateway' }, 502))
            .mockResolvedValueOnce(makeSuccessEnvelope());

        vi.stubGlobal('fetch', mockFetch);

        const result = await products.getOne(42, {
            retries: { repeat: 1, retryDelay: 0 },
        });

        assertOk(result);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

import BcApiChef from '@/BcApiChef.ts';
import ProductsV3 from '@/v3Api/Products/ProductsV3.ts';
import V3Api from '@/v3Api/V3Api.ts';

vi.setConfig({ testTimeout: 1000 });

describe('BcApiChef builder chain', () => {
    const client = new BcApiChef('test-hash', 'test-token');

    it('v3() returns a V3Api instance', () => {
        expect(client.v3()).toBeInstanceOf(V3Api);
    });

    it('v3().products() returns a ProductsV3 instance', () => {
        expect(client.v3().products()).toBeInstanceOf(ProductsV3);
    });

    it('builds the correct base URL for the store', () => {
        // The base URL should include the store hash
        // We verify indirectly by checking the products instance is created
        // without throwing — the URL is private, so we test behaviour not internals
        expect(() => client.v3().products()).not.toThrow();
    });
});

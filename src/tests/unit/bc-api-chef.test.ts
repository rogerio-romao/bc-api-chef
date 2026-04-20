import BcApiChef from '@/BcApiChef.ts';
import ProductsV3 from '@/v3Api/Products/Products';
import V3Api from '@/v3Api/V3Api.ts';

import { getCallUrl, makePageResponse } from './helpers';

const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

describe('BcApiChef builder chain', () => {
    const client = new BcApiChef('test-hash', 'test-token');

    beforeEach(() => {
        mockTchef.mockReset();
        mockTchef.mockResolvedValue(makePageResponse());
    });

    it('v3() returns a V3Api instance', () => {
        expect(client.v3()).toBeInstanceOf(V3Api);
    });

    it('v3().products() returns a ProductsV3 instance', () => {
        expect(client.v3().products()).toBeInstanceOf(ProductsV3);
    });

    it('builds the correct base URL for the store', async () => {
        await client.v3().products().getMultiple();

        expect(mockTchef).toHaveBeenCalledOnce();
        expect(getCallUrl(mockTchef).origin).toBe('https://api.bigcommerce.com');
        expect(getCallUrl(mockTchef).pathname).toBe('/stores/test-hash/v3/catalog/products');
    });
});

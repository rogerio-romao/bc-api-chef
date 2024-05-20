import ProductsV3 from './Products/ProductsV3.ts';

export default class V3Api {
    private version = 'v3';
    private baseUrl: string;
    private accessToken: string;
    private validate: boolean;
    private retries: number;
    private baseUrlWithVersion: string;

    constructor(
        baseUrl: string,
        accessToken: string,
        validate = false,
        retries = 0
    ) {
        this.baseUrl = baseUrl;
        this.accessToken = accessToken;
        this.validate = validate;
        this.retries = retries;
        this.baseUrlWithVersion = `${this.baseUrl}${this.version}/`;
    }

    public products(): ProductsV3 {
        return new ProductsV3(
            this.baseUrlWithVersion,
            this.accessToken,
            this.validate,
            this.retries
        );
    }
}

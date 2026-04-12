import V3Api from './v3Api/V3Api.ts';

const BC_API_BASE_URL = 'https://api.bigcommerce.com/stores';

export default class BcApiChef {
    private baseUrl: string;
    private accessToken: string;
    private validate: boolean;
    private retries: number;

    constructor(
        storeHash: string,
        accessToken: string,
        validate = false,
        retries = 0
    ) {
        this.baseUrl = `${BC_API_BASE_URL}/${storeHash}`;
        this.accessToken = accessToken;
        this.validate = validate;
        this.retries = retries;
    }

    public v3(): V3Api {
        return new V3Api(
            this.baseUrl,
            this.accessToken,
            this.validate,
            this.retries
        );
    }
}

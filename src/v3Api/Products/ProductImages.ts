import {
    buildQueryString,
    clampPerPageLimits,
    fetchPaginated,
    validatePositiveIntegers,
} from '@/v3Api/utils';

import type { BcApiChefOptions, BcApiChefResult, Prettify } from '@/types/api-types';
import type {
    ApiImageQueryBase,
    BaseProductImageField,
    ProductImage,
} from '@/types/product-images';

export default class ProductImages {
    private accessToken: string;
    private apiUrl: string;
    private options: Required<BcApiChefOptions>;

    constructor(accessToken: string, apiUrl: string, options?: BcApiChefOptions) {
        this.accessToken = accessToken;
        this.apiUrl = apiUrl;
        this.options = {
            retries: 0,
            validate: false,
            ...options,
        };
    }

    public async getImages<I extends readonly BaseProductImageField[]>(
        productId: number,
        query: ApiImageQueryBase & { include_fields: I; exclude_fields?: never },
    ): Promise<BcApiChefResult<Prettify<Pick<ProductImage, 'id' | I[number]>>[]>>;

    public async getImages<E extends readonly BaseProductImageField[]>(
        productId: number,
        query: ApiImageQueryBase & { include_fields?: never; exclude_fields: E },
    ): Promise<BcApiChefResult<Prettify<Omit<ProductImage, E[number]>>[]>>;

    public async getImages(
        productId: number,
        query?: ApiImageQueryBase,
    ): Promise<BcApiChefResult<ProductImage[]>>;

    public async getImages(
        productId: number,
        query?: ApiImageQueryBase & {
            include_fields?: readonly BaseProductImageField[];
            exclude_fields?: readonly BaseProductImageField[];
        },
    ): Promise<BcApiChefResult<ProductImage[]>> {
        const idValidOrError = validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            } as BcApiChefResult<ProductImage[]>;
        }

        const querySuffix = buildQueryString(query);
        const url = `${this.apiUrl}/${productId}/images${querySuffix}`;
        const limit = clampPerPageLimits(query?.limit);

        return (await fetchPaginated<ProductImage>(
            url,
            this.accessToken,
            limit,
            query?.page,
        )) as BcApiChefResult<ProductImage[]>;
    }
}

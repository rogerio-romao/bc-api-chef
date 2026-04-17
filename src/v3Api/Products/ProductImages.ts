import {
    buildQueryString,
    clampPerPageLimits,
    fetchPaginated,
    validatePositiveIntegers,
} from '@/v3Api/utils';

import type { TchefResult } from 'tchef';

import type { BcApiChefOptions } from '@/types/api-types';
import type {
    ApiImageQueryBase,
    BaseProductImageField,
    GetProductImagesReturnType,
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

    public async getImages<
        I extends readonly BaseProductImageField[] | undefined = undefined,
        E extends readonly BaseProductImageField[] | undefined = undefined,
    >(
        productId: number,
        query?:
            | (ApiImageQueryBase & { include_fields?: I; exclude_fields?: never })
            | (ApiImageQueryBase & { include_fields?: never; exclude_fields?: E }),
    ): Promise<TchefResult<GetProductImagesReturnType<I, E>>> {
        const idValidOrError = validatePositiveIntegers({ productId });

        if (idValidOrError !== true) {
            return {
                error: idValidOrError,
                ok: false,
                statusCode: 400,
            } as TchefResult<GetProductImagesReturnType<I, E>>;
        }

        const querySuffix = buildQueryString(query);
        const url = `${this.apiUrl}/${productId}/images${querySuffix}`;
        const limit = clampPerPageLimits(query?.limit);

        return (await fetchPaginated<ProductImage>(
            url,
            this.accessToken,
            limit,
            query?.page,
        )) as TchefResult<GetProductImagesReturnType<I, E>>;
    }
}

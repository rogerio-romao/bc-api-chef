import type { BaseProductWithIncludes, FullProduct } from './product-types';

export interface ApiProductQuery {
    id?: number;
    'id:in'?: string;
    'id:not_in'?: string;
    name?: string;
}

export interface ProductIncludes {
    variants?: boolean;
    images?: boolean;
    custom_fields?: boolean;
    bulk_pricing_rules?: boolean;
    primary_image?: boolean;
    modifiers?: boolean;
    options?: boolean;
    videos?: boolean;
}

export type GetProductsReturnType<T extends ProductIncludes> = Array<
    BaseProductWithIncludes<T>
>;

export interface GetProductsOptions {
    includes?: ProductIncludes;
    query?: ApiProductQuery;
}

export interface BcGetProductsResponse {
    data: FullProduct[];
    meta: {
        pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
            links: {
                previous: string;
                current: string;
                next: string;
            };
        };
    };
}

import type { BaseProductWithIncludes, FullProduct } from './product-types';

export interface ApiProductQuery {
    id?: number;
    'id:in'?: string;
    'id:not_in'?: string;
    include_fields?: string;
    exclude_fields?: string;
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

export interface ApiOptions {
    includes?: ProductIncludes;
    query?: ApiProductQuery;
}

type PickFields<T, K extends keyof T> = {
    [P in K]: T[P];
};

type ExcludeFields<T, K extends keyof T> = Omit<T, K>;

type ParseFields<F extends string> = F extends `${infer Head},${infer Tail}`
    ? Head | ParseFields<Tail>
    : F;

type ApplyQueryOptions<T, Q extends ApiOptions['query']> = Q extends {
    include_fields: string;
}
    ? Pick<T, Extract<ParseFields<Q['include_fields']>, keyof T>>
    : Q extends { exclude_fields: string }
    ? Omit<T, Extract<ParseFields<Q['exclude_fields']>, keyof T>>
    : T;

export type GetProductsReturnType<T extends ProductIncludes> = Array<
    BaseProductWithIncludes<T>
>;

// export type GetProductsReturnType<
//     T extends ProductIncludes,
//     Q extends ApiOptions['query']
// > = Array<ApplyQueryOptions<BaseProductWithIncludes<T>, Q>>;

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

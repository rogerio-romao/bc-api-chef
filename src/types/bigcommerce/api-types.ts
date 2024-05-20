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

export interface GetProductsOptions {
    includes?: ProductIncludes;
    query?: ApiProductQuery;
}

import type {
    BaseProduct,
    BaseProductField,
    FullProduct,
    ProductBulkPricingRule,
    ProductCustomField,
    ProductImage,
    ProductModifier,
    ProductOption,
    ProductVariant,
    ProductVideo,
} from './product-types';

export interface BcApiChefOptions {
    validate?: boolean;
    retries?: number;
}

export interface GetProductsOptions {
    includes?: ProductIncludes;
    query?: ApiProductQuery;
}

export type ProductBulkPricingRulesPayload = Omit<ProductBulkPricingRule, 'id'>[];

export type ProductImagePayload = {
    image_file?: string;
    image_url?: string;
    is_thumbnail?: boolean;
    sort_order?: number;
    description?: string;
}[];

export type ProductVideoPayload = Omit<ProductVideo, 'id' | 'product_id' | 'length'>[];

/**
 * Defines which sub-resources to include in product responses. Each key corresponds to an optional sub-resource array on the response product type.
 * Note: include_fields (which controls which base product fields are returned) is intentionally not modelled here.
 */
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

/** Expands included sub-resources onto the base product type. */
export type IncludeExpansion<T extends ProductIncludes> = (T['variants'] extends true
    ? { variants: ProductVariant[] }
    : object) &
    (T['images'] extends true ? { images: ProductImage[] } : object) &
    (T['custom_fields'] extends true ? { custom_fields: ProductCustomField[] } : object) &
    (T['bulk_pricing_rules'] extends true
        ? { bulk_pricing_rules: ProductBulkPricingRule[] }
        : object) &
    (T['primary_image'] extends true ? { primary_image: ProductImage } : object) &
    (T['modifiers'] extends true ? { modifiers: ProductModifier[] } : object) &
    (T['options'] extends true ? { options: ProductOption[] } : object) &
    (T['videos'] extends true ? { videos: ProductVideo[] } : object);

/**
 * Applies Omit<BaseProduct, E[number]> for exclude_fields, with a guard that
 * falls back to BaseProduct when inference widens E to the full field union
 * (e.g. when a variable typed as BaseProductField[] is passed instead of a
 * literal array).
 */
type ExcludeProductFields<E extends readonly BaseProductField[]> =
    BaseProductField extends E[number] ? BaseProduct : Omit<BaseProduct, E[number]>;

export type ProductSortField =
    | 'id'
    | 'name'
    | 'sku'
    | 'price'
    | 'date_modified'
    | 'date_last_imported'
    | 'inventory_level'
    | 'is_visible'
    | 'total_sold';

export type SortDirection = 'asc' | 'desc';

/**
 * Defines allowed query parameters for product listing endpoints. Each key corresponds to a supported filter or sort parameter. Some filters (e.g. `id:in`) allow multiple values.
 */
export interface ApiProductQuery {
    id?: number;
    'id:in'?: number[];
    'id:not_in'?: number[];
    'id:min'?: number;
    'id:max'?: number;
    'id:greater'?: number;
    'id:less'?: number;
    name?: string;
    'name:like'?: string;
    sku?: string;
    'sku:in'?: string[];
    upc?: string;
    price?: number;
    weight?: number;
    condition?: BaseProduct['condition'];
    brand_id?: number;
    date_modified?: string;
    'date_modified:max'?: string;
    'date_modified:min'?: string;
    date_last_imported?: string;
    'date_last_imported:max'?: string;
    'date_last_imported:min'?: string;
    is_visible?: boolean;
    is_featured?: boolean;
    is_free_shipping?: boolean;
    inventory_level?: number;
    'inventory_level:in'?: number[];
    'inventory_level:not_in'?: number[];
    'inventory_level:min'?: number;
    'inventory_level:max'?: number;
    'inventory_level:greater'?: number;
    'inventory_level:less'?: number;
    inventory_low_stock?: boolean;
    out_of_stock?: boolean;
    total_sold?: number;
    type?: BaseProduct['type'];
    categories?: number;
    'categories:in'?: number[];
    keyword?: string;
    keyword_context?: 'shopper' | 'merchant';
    status?: number;
    availability?: BaseProduct['availability'];
    include_fields?: readonly BaseProductField[];
    exclude_fields?: readonly BaseProductField[];
    sort?: ProductSortField;
    direction?: SortDirection;
    // Note: if `page` is supplied, only that page is returned. If omitted, getAllProducts walks every page until total_pages.
    page?: number;
    limit?: number;
}

/**
 * Resolves the return type of getAllProducts based on requested includes,
 * include_fields, and exclude_fields. When include_fields is provided, base
 * fields are narrowed via Pick. When exclude_fields is provided, base fields
 * are narrowed via Omit. The two are mutually exclusive — BC returns 409 when
 * both are supplied. Sub-resources from includes are always additive.
 */
export type GetProductsReturnType<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined = undefined,
    E extends readonly BaseProductField[] | undefined = undefined,
> = ((F extends readonly BaseProductField[]
    ? Pick<BaseProduct, F[number]>
    : E extends readonly BaseProductField[]
      ? ExcludeProductFields<E>
      : BaseProduct) &
    IncludeExpansion<T>)[];

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

export type GetProductReturnType<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined = undefined,
    E extends readonly BaseProductField[] | undefined = undefined,
> = (F extends readonly BaseProductField[]
    ? Pick<BaseProduct, F[number]>
    : E extends readonly BaseProductField[]
      ? ExcludeProductFields<E>
      : BaseProduct) &
    IncludeExpansion<T>;

export interface BcGetProductResponse {
    data: FullProduct;
}

type ServerComputedProductFields =
    | 'id'
    | 'calculated_price'
    | 'option_set_id'
    | 'option_set_display'
    | 'reviews_rating_sum'
    | 'reviews_count'
    | 'total_sold'
    | 'date_created'
    | 'date_modified'
    | 'date_last_imported'
    | 'view_count'
    | 'base_variant_id';

type RequiredCreateProductFields = 'name' | 'type' | 'weight' | 'price';

export type ProductCustomFieldsPayload = Omit<ProductCustomField, 'id'>[];

export type CommonProductValidationPayload = Partial<BaseProduct> & {
    custom_fields?: ProductCustomFieldsPayload;
};

/**
 * Payload for POST /v3/catalog/products.
 * Required: name, type, weight, price (per BigCommerce API spec).
 * Optional: all other creatable BaseProduct fields plus creatable
 * sub-resources (custom_fields, bulk_pricing_rules, images, videos).
 * Server-computed fields (id, calculated_price, etc.) are excluded.
 */
export type CreateProductPayload = Pick<BaseProduct, RequiredCreateProductFields> &
    Partial<Omit<BaseProduct, ServerComputedProductFields | RequiredCreateProductFields>> & {
        custom_fields?: ProductCustomFieldsPayload;
        bulk_pricing_rules?: ProductBulkPricingRulesPayload;
        images?: ProductImagePayload;
        videos?: ProductVideoPayload;
    };

export interface BcCreateProductResponse {
    data: BaseProduct;
}

/**
 * Payload for PUT /v3/catalog/products/{productId}.
 * All fields are optional. Server-computed fields are excluded.
 */
export type UpdateProductPayload = Partial<Omit<BaseProduct, ServerComputedProductFields>> & {
    custom_fields?: ProductCustomFieldsPayload;
    bulk_pricing_rules?: ProductBulkPricingRulesPayload;
    images?: ProductImagePayload;
    videos?: ProductVideoPayload;
};

export interface BcUpdateProductResponse {
    data: BaseProduct;
}

export type UpdateProductReturnType<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined = undefined,
    E extends readonly BaseProductField[] | undefined = undefined,
> = (F extends readonly BaseProductField[]
    ? Pick<BaseProduct, F[number]>
    : E extends readonly BaseProductField[]
      ? ExcludeProductFields<E>
      : BaseProduct) &
    IncludeExpansion<T>;

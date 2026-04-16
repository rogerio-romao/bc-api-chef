// oxlint-disable max-lines
import type { BcRequestResponseMeta, SortDirection } from './api-types.ts';
import type {
    ProductBulkPricingRule,
    ProductBulkPricingRulesPayload,
} from './product-bulk-pricing-rules.ts';
import type { ProductCustomField } from './product-custom-fields.ts';
import type { ProductImage, ProductImagePayload } from './product-images.ts';
import type { ProductModifier } from './product-modifiers.ts';
import type { ProductOption } from './product-options.ts';
import type { ProductVariant } from './product-variants.ts';
import type { ProductVideo, ProductVideoPayload } from './product-videos.ts';

export type BaseProductField = keyof BaseProduct;

export interface BaseProduct {
    id: number;
    name: string;
    type: 'physical' | 'digital';
    sku: string;
    description: string;
    weight: number;
    width: number;
    depth: number;
    height: number;
    price: number;
    cost_price: number;
    retail_price: number;
    sale_price: number;
    map_price: number;
    tax_class_id: number;
    product_tax_code: string;
    calculated_price: number;
    categories: number[];
    brand_id: number;
    option_set_id: number;
    option_set_display: string;
    inventory_level: number;
    inventory_warning_level: number;
    inventory_tracking: 'none' | 'product' | 'variant';
    reviews_rating_sum: number;
    reviews_count: number;
    total_sold: number;
    fixed_cost_shipping_price: number;
    is_free_shipping: boolean;
    is_visible: boolean;
    is_featured: boolean;
    related_products: number[];
    warranty: string;
    bin_picking_number: string;
    layout_file: string;
    upc: string;
    mpn: string;
    gtin: string;
    date_last_imported: string | null;
    search_keywords: string;
    availability: 'available' | 'disabled' | 'preorder';
    availability_description: string;
    gift_wrapping_options_type: 'any' | 'none' | 'list';
    gift_wrapping_options_list: number[];
    sort_order: number;
    condition: 'New' | 'Used' | 'Refurbished';
    is_condition_shown: boolean;
    order_quantity_minimum: number;
    order_quantity_maximum: number;
    page_title: string;
    meta_keywords: string[];
    meta_description: string;
    date_created: string;
    date_modified: string;
    preorder_release_date: string | null;
    preorder_message: string;
    is_preorder_only: boolean;
    is_price_hidden: boolean;
    price_hidden_label: string;
    custom_url: {
        url: string;
        is_customized: boolean;
    };
    base_variant_id: number | null;
    open_graph_type:
        | 'product'
        | 'album'
        | 'book'
        | 'drink'
        | 'food'
        | 'game'
        | 'movie'
        | 'song'
        | 'tv_show';
    open_graph_title: string;
    open_graph_description: string;
    open_graph_use_meta_description: boolean;
    open_graph_use_product_name: boolean;
    open_graph_use_image: boolean;
}

export interface FullProduct extends BaseProduct {
    variants: ProductVariant[];
    images: ProductImage[];
    custom_fields: ProductCustomField[];
    bulk_pricing_rules: ProductBulkPricingRule[];
    primary_image: ProductImage;
    modifiers: ProductModifier[];
    options: ProductOption[];
    videos: ProductVideo[];
}

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

export interface GetProductsOptions {
    includes?: ProductIncludes;
    query?: ApiProductQuery;
}

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

type ProductReturnBase<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined,
    E extends readonly BaseProductField[] | undefined,
> = (F extends readonly BaseProductField[]
    ? Pick<BaseProduct, F[number]>
    : E extends readonly BaseProductField[]
      ? ExcludeProductFields<E>
      : BaseProduct) &
    IncludeExpansion<T>;

export type GetProductReturnType<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined = undefined,
    E extends readonly BaseProductField[] | undefined = undefined,
> = ProductReturnBase<T, F, E>;

export interface BcGetProductResponse {
    data: FullProduct;
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
> = ProductReturnBase<T, F, E>[];

export interface BcGetProductsResponse {
    data: FullProduct[];
    meta: BcRequestResponseMeta;
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

export type UpdateProductReturnType<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined = undefined,
    E extends readonly BaseProductField[] | undefined = undefined,
> = ProductReturnBase<T, F, E>;

export interface BcUpdateProductResponse {
    data: BaseProduct;
}

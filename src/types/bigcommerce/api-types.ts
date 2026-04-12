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

// ---------------------------------------------------------------------------
// Includes
// ---------------------------------------------------------------------------

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
export type IncludeExpansion<T extends ProductIncludes> =
    (T['variants'] extends true ? { variants: ProductVariant[] } : object) &
        (T['images'] extends true ? { images: ProductImage[] } : object) &
        (T['custom_fields'] extends true
            ? { custom_fields: ProductCustomField[] }
            : object) &
        (T['bulk_pricing_rules'] extends true
            ? { bulk_pricing_rules: ProductBulkPricingRule[] }
            : object) &
        (T['primary_image'] extends true
            ? { primary_image: ProductImage }
            : object) &
        (T['modifiers'] extends true
            ? { modifiers: ProductModifier[] }
            : object) &
        (T['options'] extends true ? { options: ProductOption[] } : object) &
        (T['videos'] extends true ? { videos: ProductVideo[] } : object);

// ---------------------------------------------------------------------------
// Sort / direction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Query parameters for GET /v3/catalog/products
// ---------------------------------------------------------------------------

export interface ApiProductQuery {
    // --- ID filters ---
    id?: number;
    'id:in'?: number[];
    'id:not_in'?: number[];
    'id:min'?: number;
    'id:max'?: number;
    'id:greater'?: number;
    'id:less'?: number;

    // --- Name filters ---
    name?: string;
    'name:like'?: string;

    // --- SKU filters ---
    sku?: string;
    'sku:in'?: string[];

    // --- Other simple filters ---
    upc?: string;
    price?: number;
    weight?: number;
    condition?: BaseProduct['condition'];
    brand_id?: number;

    // --- Date filters ---
    date_modified?: string;
    'date_modified:max'?: string;
    'date_modified:min'?: string;
    date_last_imported?: string;
    'date_last_imported:max'?: string;
    'date_last_imported:min'?: string;

    // --- Boolean filters ---
    is_visible?: boolean;
    is_featured?: boolean;
    is_free_shipping?: boolean;

    // --- Inventory filters ---
    inventory_level?: number;
    'inventory_level:in'?: number[];
    'inventory_level:not_in'?: number[];
    'inventory_level:min'?: number;
    'inventory_level:max'?: number;
    'inventory_level:greater'?: number;
    'inventory_level:less'?: number;
    inventory_low_stock?: boolean;
    out_of_stock?: boolean;

    // --- Other filters ---
    total_sold?: number;
    type?: BaseProduct['type'];
    categories?: number;
    'categories:in'?: number[];
    keyword?: string;
    keyword_context?: 'shopper' | 'merchant';
    status?: number;
    availability?: BaseProduct['availability'];

    // --- Field selection (type-safe union of BaseProduct field names) ---
    include_fields?: readonly BaseProductField[];
    exclude_fields?: readonly BaseProductField[];

    // --- Sorting and pagination (managed by getMultiPage internally) ---
    sort?: ProductSortField;
    direction?: SortDirection;
    page?: number;
    limit?: number;
}

// ---------------------------------------------------------------------------
// Options and return types
// ---------------------------------------------------------------------------

export interface GetProductsOptions {
    includes?: ProductIncludes;
    query?: ApiProductQuery;
}

/**
 * Resolves the return type of getAllProducts based on requested includes and
 * include_fields. When include_fields is provided, the base product fields are
 * narrowed to only the requested ones via Pick. Sub-resources from includes are
 * always additive. exclude_fields is intentionally not modelled in the return
 * type (Omit with a generic array is fragile).
 */
export type GetProductsReturnType<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined = undefined,
> = Array<
    (F extends readonly BaseProductField[]
        ? Pick<BaseProduct, F[number]>
        : BaseProduct) &
        IncludeExpansion<T>
>;

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
> = (F extends readonly BaseProductField[]
    ? Pick<BaseProduct, F[number]>
    : BaseProduct) &
    IncludeExpansion<T>;

export interface BcGetProductResponse {
    data: FullProduct;
}

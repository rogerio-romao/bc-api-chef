import type { ProductBulkPricingRule } from './product-bulk-pricing-rules.ts';
import type { ProductCustomField } from './product-custom-fields.ts';
import type { ProductImage } from './product-images.ts';
import type { ProductModifier } from './product-modifiers.ts';
import type { ProductOption } from './product-options.ts';
import type { ProductVariant } from './product-variants.ts';
import type { ProductVideo } from './product-videos.ts';

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
    view_count?: number;
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

export type { ProductBulkPricingRule } from './product-bulk-pricing-rules.ts';
export type { CustomField, ProductCustomField } from './product-custom-fields.ts';
export type { ProductImage } from './product-images.ts';
export type { ProductModifier } from './product-modifiers.ts';
export type { ProductOption } from './product-options.ts';
export type { ProductVariant, VariantOption } from './product-variants.ts';
export type { ProductVideo } from './product-videos.ts';

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

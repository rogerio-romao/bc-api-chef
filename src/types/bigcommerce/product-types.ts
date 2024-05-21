import type { ProductIncludes } from './api-types';

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

export interface ProductVariant {
    id: number;
    product_id: number;
    sku: string;
    sku_id: number;
    price: number | null;
    calculated_price: number;
    sale_price: number | null;
    retail_price: number | null;
    map_price: number | null;
    weight: number | null;
    calculated_weight: number;
    width: number | null;
    height: number | null;
    depth: number | null;
    is_free_shipping: boolean;
    fixed_cost_shipping_price: number | null;
    purchasing_disabled: boolean;
    purchasing_disabled_message: string;
    image_url: string;
    cost_price: number | null;
    upc: string | null;
    mpn: string;
    gtin: string;
    inventory_level: number | null;
    inventory_warning_level: number | null;
    bin_picking_number: string | null;
    option_values: Array<{
        id: number;
        label: string;
        option_id: number;
        option_display_name: string;
    }>;
}

export interface ProductImage {
    id: number;
    product_id: number;
    is_thumbnail: boolean;
    sort_order: number;
    description: string;
    image_file: string;
    url_zoom: string;
    url_standard: string;
    url_thumbnail: string;
    url_tiny: string;
    date_modified: string;
    image_url?: string;
}

export interface ProductCustomField {
    id: number;
    name: string;
    value: string;
}

export interface ProductBulkPricingRule {
    id: number;
    quantity_min: number;
    quantity_max: number;
    type: 'price' | 'percent' | 'fixed';
    amount: number | string;
}

type ProductModifierConfig =
    | {
          type: 'checkbox';
          config: {
              checked_by_default: boolean;
              checkbox_label: string;
          };
      }
    | {
          type: 'date';
          config: {
              date_limited: boolean;
              date_limit_mode: 'range' | 'earliest' | 'latest';
              date_earliest_value: string;
              date_latest_value: string;
          };
      }
    | {
          type: 'file';
          config: {
              file_types_mode: 'all' | 'specific';
              file_types_supported: Array<'images' | 'documents' | 'other'>;
              file_types_other: string[];
              file_max_size: number;
          };
      }
    | {
          type: 'text';
          config: {
              default_value: string;
              text_characters_limited: boolean;
              text_min_length: number;
              text_max_length: number;
          };
      }
    | {
          type: 'multi_line_text';
          config: {
              default_value: string;
              text_characters_limited: boolean;
              text_min_length: number;
              text_max_length: number;
              text_lines_limited: boolean;
              text_max_lines: number;
          };
      }
    | {
          type: 'numbers_only_text';
          config: {
              default_value: string;
              number_limited: boolean;
              number_limit_mode: 'lowest' | 'highest' | 'range';
              number_lowest_value: number;
              number_highest_value: number;
              number_integers_only: boolean;
          };
      }
    | {
          type: 'product_list' | 'product_list_with_images';
          config: {
              product_list_adjusts_inventory: boolean;
              product_list_adjusts_pricing: boolean;
              product_list_shipping_calc: 'none' | 'weight' | 'package';
          };
      }
    | {
          type: 'radio_buttons' | 'dropdown' | 'swatch' | 'rectangles';
          config: never;
      };

type ProductModifierOptionValue = {
    is_default: boolean;
    label: string;
    sort_order: number;
    value_data: object | null;
    adjusters: {
        price: {
            adjuster: ('percentage' | 'relative') | null;
            adjuster_value: number;
        };
        weight: {
            adjuster: ('percentage' | 'relative') | null;
            adjuster_value: number;
        };
        image_url: string;
        purchasing_disabled: {
            status: boolean;
            message: string;
        };
    };
    id: number;
    option_id: number;
};

type ProductOptionsConfig =
    | {
          type: 'productlist' | 'productlistwithimages';
          config: {
              product_list_adjusts_inventory: boolean;
              product_list_adjusts_pricing: boolean;
              product_list_shipping_calc: 'none' | 'weight' | 'package';
          };
      }
    | {
          type: 'radio-buttons' | 'rectangles' | 'dropdown' | 'swatch';
          config: never;
      };

type ProductModifierCommonFields = {
    required: boolean;
    sort_order: number;
    display_name: string;
    id: number;
    product_id: number;
    name: string;
    option_values: ProductModifierOptionValue[];
};

export type ProductModifier = ProductModifierCommonFields &
    ProductModifierConfig;

export type ProductOptionsCommonFields = {
    id: number | null;
    product_id: number;
    display_name: string;
    sort_order: number;
    option_values: Array<{
        id: number;
        label: string;
        sort_order: number;
        is_default: boolean;
        value_data: object | null;
    }>;
};

export type ProductOption = ProductOptionsCommonFields & ProductOptionsConfig;

export interface ProductVideo {
    title: string;
    description: string;
    sort_order: number;
    type: 'youtube';
    video_id: string;
    id: number;
    product_id: number;
    length: string;
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

export type BaseProductWithIncludes<T extends ProductIncludes> = BaseProduct &
    (T['variants'] extends true ? { variants: ProductVariant[] } : never) &
    (T['images'] extends true ? { images: ProductImage[] } : never) &
    (T['custom_fields'] extends true
        ? { custom_fields: ProductCustomField[] }
        : never) &
    (T['bulk_pricing_rules'] extends true
        ? { bulk_pricing_rules: ProductBulkPricingRule[] }
        : never) &
    (T['primary_image'] extends true
        ? { primary_image: ProductImage }
        : never) &
    (T['modifiers'] extends true ? { modifiers: ProductModifier[] } : never) &
    (T['options'] extends true ? { options: ProductOption[] } : never) &
    (T['videos'] extends true ? { videos: ProductVideo[] } : never);

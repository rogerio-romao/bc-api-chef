export interface VariantOption {
    id: number;
    label: string;
    option_id: number;
    option_display_name: string;
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
    option_values: VariantOption[];
}

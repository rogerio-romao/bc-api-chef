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
      };

interface ProductOptionsCommonFields {
    id: number | null;
    product_id: number;
    display_name: string;
    sort_order: number;
    option_values: {
        id: number;
        label: string;
        sort_order: number;
        is_default: boolean;
        value_data: Record<string, unknown> | null;
    }[];
}

export type ProductOption = ProductOptionsCommonFields & ProductOptionsConfig;

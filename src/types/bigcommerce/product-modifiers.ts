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
              file_types_supported: ('images' | 'documents' | 'other')[];
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

interface ProductModifierOptionValue {
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
}

interface ProductModifierCommonFields {
    required: boolean;
    sort_order: number;
    display_name: string;
    id: number;
    product_id: number;
    name: string;
    option_values: ProductModifierOptionValue[];
}

export type ProductModifier = ProductModifierCommonFields & ProductModifierConfig;

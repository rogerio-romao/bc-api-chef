export interface ProductBulkPricingRule {
    id: number;
    quantity_min: number;
    quantity_max: number;
    type: 'price' | 'percent' | 'fixed';
    amount: number | string;
}

export type NoIdProductBulkPricingRule = Omit<ProductBulkPricingRule, 'id'>;
export type ProductBulkPricingRuleField = keyof NoIdProductBulkPricingRule;

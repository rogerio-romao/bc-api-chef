export interface ProductBulkPricingRule {
    id: number;
    quantity_min: number;
    quantity_max: number;
    type: 'price' | 'percent' | 'fixed';
    amount: number | string;
}

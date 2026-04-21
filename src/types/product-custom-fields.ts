export interface ProductCustomField {
    id: number;
    name: string;
    value: string;
}

export type NoIdProductCustomField = Omit<ProductCustomField, 'id'>;
export type ProductCustomFieldField = keyof NoIdProductCustomField;

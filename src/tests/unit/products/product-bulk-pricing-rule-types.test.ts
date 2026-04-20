import type {
    NoIdProductBulkPricingRule,
    ProductBulkPricingRule,
    ProductBulkPricingRuleField,
} from '@/types/product-bulk-pricing-rules';

describe('ProductBulkPricingRuleField type', () => {
    it('equals keyof NoIdProductBulkPricingRule', () => {
        expectTypeOf<ProductBulkPricingRuleField>().toEqualTypeOf<
            keyof NoIdProductBulkPricingRule
        >();
    });

    it('includes all non-id fields', () => {
        expectTypeOf<ProductBulkPricingRuleField>().toEqualTypeOf<
            'amount' | 'quantity_min' | 'quantity_max' | 'type'
        >();
    });
});

describe('NoIdProductBulkPricingRule type', () => {
    it('accepts a full valid payload', () => {
        const payload = {
            amount: 5,
            quantity_max: 10,
            quantity_min: 2,
            type: 'price',
        } satisfies NoIdProductBulkPricingRule;

        expect(payload).toBeDefined();
    });

    it('accepts amount as a string', () => {
        const payload = {
            amount: '5.00',
            quantity_max: 10,
            quantity_min: 2,
            type: 'price',
        } satisfies NoIdProductBulkPricingRule;

        expect(payload).toBeDefined();
    });

    it('does not allow the server-computed field id', () => {
        const payload: NoIdProductBulkPricingRule = {
            amount: 5,
            // @ts-expect-error id is server-computed and excluded from NoIdProductBulkPricingRule
            id: 1,
            quantity_max: 10,
            quantity_min: 2,
            type: 'price',
        };

        expect(payload).toBeDefined();
    });

    it('requires amount', () => {
        // @ts-expect-error amount is required
        const payload: NoIdProductBulkPricingRule = {
            quantity_max: 10,
            quantity_min: 2,
            type: 'price',
        };

        expect(payload).toBeDefined();
    });

    it('requires quantity_min', () => {
        // @ts-expect-error quantity_min is required
        const payload: NoIdProductBulkPricingRule = {
            amount: 5,
            quantity_max: 10,
            type: 'price',
        };

        expect(payload).toBeDefined();
    });

    it('requires quantity_max', () => {
        // @ts-expect-error quantity_max is required
        const payload: NoIdProductBulkPricingRule = {
            amount: 5,
            quantity_min: 2,
            type: 'price',
        };

        expect(payload).toBeDefined();
    });

    it('requires type', () => {
        // @ts-expect-error type is required
        const payload: NoIdProductBulkPricingRule = {
            amount: 5,
            quantity_max: 10,
            quantity_min: 2,
        };

        expect(payload).toBeDefined();
    });

    it('does not allow an invalid type value', () => {
        const payload: NoIdProductBulkPricingRule = {
            amount: 5,
            quantity_max: 10,
            quantity_min: 2,
            // @ts-expect-error type must be 'price' | 'percent' | 'fixed'
            type: 'bogus',
        };

        expect(payload).toBeDefined();
    });
});

describe('ProductBulkPricingRule type', () => {
    it('has all fields including id', () => {
        expectTypeOf<ProductBulkPricingRule>().toHaveProperty('id');
        expectTypeOf<ProductBulkPricingRule>().toHaveProperty('amount');
        expectTypeOf<ProductBulkPricingRule>().toHaveProperty('quantity_min');
        expectTypeOf<ProductBulkPricingRule>().toHaveProperty('quantity_max');
        expectTypeOf<ProductBulkPricingRule>().toHaveProperty('type');
    });

    it('types id as number', () => {
        expectTypeOf<ProductBulkPricingRule['id']>().toEqualTypeOf<number>();
    });

    it('types amount as number | string', () => {
        expectTypeOf<ProductBulkPricingRule['amount']>().toEqualTypeOf<number | string>();
    });

    it("types type as 'price' | 'percent' | 'fixed'", () => {
        expectTypeOf<ProductBulkPricingRule['type']>().toEqualTypeOf<
            'price' | 'percent' | 'fixed'
        >();
    });
});

// Type-level narrowing tests for getOne and getMultiple overloads.
// These exercise the overload return types through Pick/Omit narrowing directly.
describe('getOne return type narrowing', () => {
    it('returns full ProductBulkPricingRule when no options are provided', () => {
        type Result = ProductBulkPricingRule;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('amount');
        expectTypeOf<Result>().toHaveProperty('quantity_min');
        expectTypeOf<Result>().toHaveProperty('quantity_max');
        expectTypeOf<Result>().toHaveProperty('type');
    });

    it('narrows to Pick (always including id) when include_fields is provided', () => {
        type Result = Pick<ProductBulkPricingRule, 'id' | 'amount' | 'type'>;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('amount');
        expectTypeOf<Result>().toHaveProperty('type');
        expectTypeOf<Result>().not.toHaveProperty('quantity_max');
        expectTypeOf<Result>().not.toHaveProperty('quantity_min');
    });

    it('removes excluded fields when exclude_fields is provided', () => {
        type Result = Omit<ProductBulkPricingRule, 'quantity_max'>;

        expectTypeOf<Result>().toHaveProperty('id');
        expectTypeOf<Result>().toHaveProperty('amount');
        expectTypeOf<Result>().toHaveProperty('quantity_min');
        expectTypeOf<Result>().not.toHaveProperty('quantity_max');
    });
});

describe('getMultiple return type narrowing', () => {
    it('returns ProductBulkPricingRule[] when no options are provided', () => {
        type Result = ProductBulkPricingRule[];

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('amount');
        expectTypeOf<Result[number]>().toHaveProperty('quantity_min');
        expectTypeOf<Result[number]>().toHaveProperty('quantity_max');
        expectTypeOf<Result[number]>().toHaveProperty('type');
    });

    it('narrows array items to Pick (always including id) when include_fields is provided', () => {
        type Result = Pick<ProductBulkPricingRule, 'id' | 'amount' | 'type'>[];

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('amount');
        expectTypeOf<Result[number]>().toHaveProperty('type');
        expectTypeOf<Result[number]>().not.toHaveProperty('quantity_max');
    });

    it('removes excluded fields from array items when exclude_fields is provided', () => {
        type Result = Omit<ProductBulkPricingRule, 'quantity_max'>[];

        expectTypeOf<Result[number]>().toHaveProperty('id');
        expectTypeOf<Result[number]>().toHaveProperty('amount');
        expectTypeOf<Result[number]>().not.toHaveProperty('quantity_max');
    });
});

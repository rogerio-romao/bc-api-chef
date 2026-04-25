export interface RetryConfig {
    /**
     * Number of **additional** retries after the initial attempt.
     * Total network calls = `repeat + 1`.
     * Must be a positive integer; `0` disables retries (single attempt).
     */
    repeat: number;
    /**
     * Delay strategy between retries.
     *
     * - **`number`** — fixed delay in **milliseconds** (e.g. `500` waits 500 ms before each retry).
     *   Values ≤ 0 are treated as no delay.
     * - **`'exponential'`** — exponential back-off computed by tchef as `2000 × 2^(attempt + 1)` ms:
     *   - 1st retry: 4 000 ms
     *   - 2nd retry: 8 000 ms
     *   - 3rd retry: 16 000 ms … (no built-in cap)
     *
     * Omitting this field uses the tchef default of **100 ms** fixed delay.
     */
    retryDelay?: number | 'exponential';
}

export interface StandardSchemaIssue {
    readonly message: string;
    readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
}

export type StandardSchemaResult<Output> =
    | { readonly value: Output; readonly issues?: undefined }
    | { readonly issues: readonly StandardSchemaIssue[] };

export interface StandardSchemaV1<Input = unknown, Output = Input> {
    readonly '~standard': {
        readonly version: 1;
        readonly vendor: string;
        readonly validate: (
            value: unknown,
        ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
        readonly types?: {
            readonly input: Input;
            readonly output: Output;
        };
    };
}

export interface BcRequestResponseMeta {
    pagination: {
        total: number;
        count: number;
        per_page: number;
        current_page: number;
        total_pages: number;
        links: {
            previous?: string;
            current: string;
            next?: string;
        };
    };
}

export type SortDirection = 'asc' | 'desc';

export type FieldSelectionOptions<F extends string> =
    | {
          include_fields: readonly F[];
          exclude_fields?: never;
      }
    | {
          include_fields?: never;
          exclude_fields: readonly F[];
      }
    | {
          include_fields?: never;
          exclude_fields?: never;
      };

/** Forces TypeScript to eagerly resolve mapped/intersection types into a flat object in tooltips. Recurses into arrays and nested objects. */
export type Prettify<T> = T extends (infer U)[]
    ? Prettify<U>[]
    : T extends object
      ? { [K in keyof T]: Prettify<T[K]> } & {}
      : T;

export type ApiResult<T> = Promise<
    Prettify<{ ok: true; data: T } | { ok: false; error: string; statusCode: number }>
>;

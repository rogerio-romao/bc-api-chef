export interface BcApiChefOptions {
    validate?: boolean;
    retries?: number;
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

export type BcApiChefResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; statusCode: number };

export type ApiResult<T> = Promise<Prettify<BcApiChefResult<T>>>;

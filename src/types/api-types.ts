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

/** Forces TypeScript to eagerly resolve mapped/intersection types into a flat object in tooltips. Recurses into arrays and nested objects. */
export type Prettify<T> = T extends (infer U)[]
    ? Prettify<U>[]
    : T extends object
      ? { [K in keyof T]: Prettify<T[K]> } & {}
      : T;

export type BcApiChefResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; statusCode: number };

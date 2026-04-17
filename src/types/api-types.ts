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

/** Forces TypeScript to eagerly resolve mapped/intersection types into a flat object in tooltips. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type BcApiChefResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; statusCode: number };

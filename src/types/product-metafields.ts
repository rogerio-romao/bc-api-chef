import type { FieldSelectionOptions } from './api-types';

export type PermissionSet =
    | 'app_only'
    | 'read'
    | 'write'
    | 'read_and_sf_access'
    | 'write_and_sf_access';

export type ResourceType =
    | 'brand'
    | 'product'
    | 'variant'
    | 'category'
    | 'cart'
    | 'channel'
    | 'location'
    | 'order'
    | 'customer';

export interface ProductMetafield {
    permission_set: PermissionSet;
    namespace: string;
    key: string;
    value: string;
    description: string;
    resource_type: ResourceType;
    readonly resource_id: number;
    id: number;
    date_created: string;
    date_modified: string;
    owner_client_id: string;
}

export type BaseMetafieldField = keyof Omit<ProductMetafield, 'id'>;

export interface ApiMetafieldQueryBase {
    page?: number;
    limit?: number;
    key?: string;
    namespace?: string;
    'resource_id:in'?: string;
}

export type ApiMetafieldQuery = ApiMetafieldQueryBase & FieldSelectionOptions<BaseMetafieldField>;

/**
 * Applies Omit<ProductMetafield, E[number]> for exclude_fields, with a guard
 * that falls back to ProductMetafield when inference widens E to the full
 * field union (e.g. when a variable typed as BaseMetafieldField[] is passed
 * instead of a literal array).
 */
type ExcludeMetafieldFields<E extends readonly BaseMetafieldField[]> =
    BaseMetafieldField extends E[number] ? ProductMetafield : Omit<ProductMetafield, E[number]>;

type MetafieldReturnBase<
    I extends readonly BaseMetafieldField[] | undefined,
    E extends readonly BaseMetafieldField[] | undefined,
> = I extends readonly BaseMetafieldField[]
    ? Pick<ProductMetafield, I[number]>
    : E extends readonly BaseMetafieldField[]
      ? ExcludeMetafieldFields<E>
      : ProductMetafield;

/**
 * Resolves the return type of getMetafields based on requested include_fields
 * or exclude_fields. When include_fields is provided, fields are narrowed via
 * Pick. When exclude_fields is provided, fields are narrowed via Omit. The
 * two are mutually exclusive — BC returns 409 when both are supplied.
 */
export type GetMetafieldsReturnType<
    I extends readonly BaseMetafieldField[] | undefined = undefined,
    E extends readonly BaseMetafieldField[] | undefined = undefined,
> = MetafieldReturnBase<I, E>[];

export type GetMetafieldReturnType<
    I extends readonly BaseMetafieldField[] | undefined = undefined,
    E extends readonly BaseMetafieldField[] | undefined = undefined,
> = MetafieldReturnBase<I, E>;

export interface CreateMetafieldPayload {
    namespace: string;
    key: string;
    value: string;
    permission_set: PermissionSet;
    description?: string;
    resource_type?: ResourceType;
}

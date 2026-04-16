export interface ProductImage {
    id: number;
    product_id: number;
    is_thumbnail: boolean;
    sort_order: number;
    description: string;
    image_file: string;
    url_zoom: string;
    url_standard: string;
    url_thumbnail: string;
    url_tiny: string;
    date_modified: string;
    image_url?: string;
}

interface ProductImagePayloadCommon {
    is_thumbnail?: boolean;
    sort_order?: number;
    description?: string;
}

type ProductImagePayloadItem =
    | (ProductImagePayloadCommon & { image_file: string; image_url?: never })
    | (ProductImagePayloadCommon & { image_url: string; image_file?: never });

export type ProductImagePayload = ProductImagePayloadItem[];

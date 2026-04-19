export interface ProductVideo {
    title: string;
    description: string;
    sort_order: number;
    type: 'youtube';
    video_id: string;
    id: number;
    product_id: number;
    length: string;
}

export type ProductVideoPayload = Omit<ProductVideo, 'id' | 'product_id' | 'length'>[];

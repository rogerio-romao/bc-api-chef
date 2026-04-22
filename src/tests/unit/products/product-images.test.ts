// oxlint-disable max-lines-per-function

import {
    assertErr,
    assertOk,
    getCallHeaders,
    getCallOptions,
    getCallUrl,
    makePageResponse,
} from '@/tests/unit/helpers.ts';
import {
    DEFAULT_START_PAGE,
    PER_PAGE_DEFAULT,
    PER_PAGE_MAX,
    PER_PAGE_MIN,
} from '@/v3Api/constants.ts';
import ProductImages from '@/v3Api/Products/ProductImages';

import type { ProductImageUpdatePayload } from '@/types/product-images';

// oxlint-disable-next-line vitest/require-mock-type-parameters -- tchef is generic; adding type params causes a TS error in the vi.mock factory
const mockTchef = vi.hoisted(() => vi.fn());
vi.mock(import('tchef'), () => ({
    default: mockTchef,
}));

const BASE_URL = 'https://api.bigcommerce.com/stores/test-hash/v3/catalog/products';

const mockImage = {
    date_modified: '2024-01-01T00:00:00+00:00',
    description: 'A product image',
    id: 55,
    image_file: 'path/to/image.jpg',
    is_thumbnail: false,
    product_id: 42,
    sort_order: 0,
    url_standard: 'https://cdn.example.com/standard.jpg',
    url_thumbnail: 'https://cdn.example.com/thumbnail.jpg',
    url_tiny: 'https://cdn.example.com/tiny.jpg',
    url_zoom: 'https://cdn.example.com/zoom.jpg',
};

const mockImageEnvelope = {
    data: { data: mockImage },
    ok: true,
};

describe('ProductImages class', () => {
    let images: ProductImages;

    beforeEach(() => {
        mockTchef.mockReset();
        images = new ProductImages('test-token', BASE_URL, {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('get one image', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue(mockImageEnvelope);
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await images.getOne(0, 55);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is negative', async () => {
            const result = await images.getOne(-1, 55);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await images.getOne(1.5, 55);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when imageId is 0', async () => {
            const result = await images.getOne(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid imageId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when imageId is negative', async () => {
            const result = await images.getOne(42, -1);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid imageId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when imageId is a non-integer', async () => {
            const result = await images.getOne(42, 1.5);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid imageId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call', async () => {
            await images.getOne(42, 55);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('includes productId and imageId in the URL path', async () => {
            await images.getOne(42, 55);

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/images/55');
        });

        it('sends the access token as X-Auth-Token', async () => {
            await images.getOne(42, 55);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('sends Accept: application/json', async () => {
            await images.getOne(42, 55);

            expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
        });

        it('uses the GET method (or default)', async () => {
            await images.getOne(42, 55);

            const { method } = getCallOptions(mockTchef, 0);

            expect([undefined, 'GET']).toContain(method);
        });

        it('appends include_fields to the URL when provided', async () => {
            await images.getOne(42, 55, {
                include_fields: ['is_thumbnail', 'sort_order'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe(
                'is_thumbnail,sort_order',
            );
        });

        it('appends exclude_fields to the URL when provided', async () => {
            await images.getOne(42, 55, {
                exclude_fields: ['description'],
            });

            expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe('description');
        });

        it('unwraps the response envelope and returns data.data', async () => {
            const result = await images.getOne(42, 55);

            assertOk(result);
            expect(result.data).toStrictEqual(mockImage);
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await images.getOne(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('get multiple images', () => {
        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await images.getMultiple(0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is negative', async () => {
            const result = await images.getMultiple(-1);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await images.getMultiple(1.5);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        describe('getImages — request headers', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it('sends the access token as X-Auth-Token', async () => {
                await images.getMultiple(42);

                expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
            });

            it('sends Accept: application/json', async () => {
                await images.getMultiple(42);

                expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
            });
        });

        describe('getImages — URL', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it('URL contains catalog/products/{productId}/images (no trailing id)', async () => {
                await images.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/images');
                expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/images$/u);
            });

            it('appends include_fields to the URL when provided', async () => {
                await images.getMultiple(42, {
                    include_fields: ['is_thumbnail', 'sort_order'],
                });

                expect(getCallUrl(mockTchef, 0).searchParams.get('include_fields')).toBe(
                    'is_thumbnail,sort_order',
                );
            });

            it('appends exclude_fields to the URL when provided', async () => {
                await images.getMultiple(42, { exclude_fields: ['description'] });

                expect(getCallUrl(mockTchef, 0).searchParams.get('exclude_fields')).toBe(
                    'description',
                );
            });

            it('does not duplicate user-supplied page and limit in the query string', async () => {
                await images.getMultiple(42, { limit: 25, page: 2 });

                const url = getCallUrl(mockTchef, 0);

                expect(url.searchParams.getAll('page')).toStrictEqual(['2']);
                expect(url.searchParams.getAll('limit')).toStrictEqual(['25']);
            });
        });

        describe('getImages — pagination', () => {
            it('fetches a single page when total_pages is 1', async () => {
                mockTchef.mockResolvedValue(
                    makePageResponse([mockImage, { ...mockImage, id: 56 }], 1, 1),
                );

                const result = await images.getMultiple(42);

                assertOk(result);
                expect(result.data).toHaveLength(2);
                expect(mockTchef).toHaveBeenCalledOnce();
            });

            it('fetches all pages and concatenates results when total_pages > 1', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

                const result = await images.getMultiple(42);

                assertOk(result);
                expect(result.data).toHaveLength(3);
                expect(mockTchef).toHaveBeenCalledTimes(3);
            });

            it('requests page=1 on first call, page=2 on second, page=3 on third', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 2 }], 2, 3))
                    .mockResolvedValueOnce(makePageResponse([{ id: 3 }], 3, 3));

                await images.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe('1');
                expect(getCallUrl(mockTchef, 1).searchParams.get('page')).toBe('2');
                expect(getCallUrl(mockTchef, 2).searchParams.get('page')).toBe('3');
            });

            it('fetches only the user-supplied page and stops', async () => {
                mockTchef.mockResolvedValueOnce(makePageResponse([{ id: 56 }], 2, 3));

                const result = await images.getMultiple(42, { limit: 50, page: 2 });

                assertOk(result);
                expect(result.data).toHaveLength(1);
                expect(mockTchef).toHaveBeenCalledOnce();
                expect(getCallUrl(mockTchef, 0).searchParams.getAll('page')).toStrictEqual(['2']);
                expect(getCallUrl(mockTchef, 0).searchParams.getAll('limit')).toStrictEqual(['50']);
            });

            it('returns the error result immediately when a page fetch fails', async () => {
                mockTchef
                    .mockResolvedValueOnce(makePageResponse([{ id: 1 }], 1, 3))
                    .mockResolvedValueOnce({
                        error: 'Unauthorized',
                        ok: false,
                        statusCode: 401,
                    });

                const result = await images.getMultiple(42);

                assertErr(result);
                expect(result.statusCode).toBe(401);
                expect(mockTchef).toHaveBeenCalledTimes(2);
            });
        });

        describe('getImages — limit clamping', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(makePageResponse([], 1, 1));
            });

            it(`uses ${PER_PAGE_DEFAULT} as the default when no limit is provided`, async () => {
                await images.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(
                    `${PER_PAGE_DEFAULT}`,
                );
            });

            it(`clamps limit above ${PER_PAGE_MAX} down to ${PER_PAGE_MAX}`, async () => {
                await images.getMultiple(42, { limit: 500 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MAX}`);
            });

            it(`clamps limit below ${PER_PAGE_MIN} up to ${PER_PAGE_MIN}`, async () => {
                await images.getMultiple(42, { limit: 1 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe(`${PER_PAGE_MIN}`);
            });

            it('passes through a limit within the valid range unchanged', async () => {
                await images.getMultiple(42, { limit: 100 });

                expect(getCallUrl(mockTchef, 0).searchParams.get('limit')).toBe('100');
            });

            it(`requests page=${DEFAULT_START_PAGE} when no page is provided`, async () => {
                await images.getMultiple(42);

                expect(getCallUrl(mockTchef, 0).searchParams.get('page')).toBe(
                    `${DEFAULT_START_PAGE}`,
                );
            });
        });
    });

    describe('create image', () => {
        const mockCreatedImage = { ...mockImage, id: 99 };
        const mockCreateEnvelope = { data: { data: mockCreatedImage }, ok: true };

        describe('validation', () => {
            it('returns a 400 error without calling the API when productId is 0', async () => {
                const result = await images.create(0, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error without calling the API when productId is negative', async () => {
                const result = await images.create(-1, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error when image_url exceeds 255 characters', async () => {
                const result = await images.create(42, {
                    image_url: `https://example.com/${'a'.repeat(240)}`,
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(result.error).toBe('image_url cannot exceed 255 characters');
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error when sort_order is a non-integer', async () => {
                const result = await images.create(42, {
                    image_url: 'https://example.com/img.jpg',
                    sort_order: 1.5,
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error when sort_order exceeds the integer range', async () => {
                const result = await images.create(42, {
                    image_url: 'https://example.com/img.jpg',
                    sort_order: 2_147_483_648,
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });
        });

        describe('image_url path (JSON POST via tchef)', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(mockCreateEnvelope);
            });

            it('makes exactly one HTTP call', async () => {
                await images.create(42, { image_url: 'https://example.com/img.jpg' });

                expect(mockTchef).toHaveBeenCalledOnce();
            });

            it('includes productId in the URL path', async () => {
                await images.create(42, { image_url: 'https://example.com/img.jpg' });

                expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/images$/u);
            });

            it('sends the access token as X-Auth-Token', async () => {
                await images.create(42, { image_url: 'https://example.com/img.jpg' });

                expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
            });

            it('sends Content-Type: application/json', async () => {
                await images.create(42, { image_url: 'https://example.com/img.jpg' });

                expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBe('application/json');
            });

            it('uses the POST method', async () => {
                await images.create(42, { image_url: 'https://example.com/img.jpg' });

                expect(getCallOptions(mockTchef, 0).method).toBe('POST');
            });

            it('unwraps the response envelope and returns data.data', async () => {
                const result = await images.create(42, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertOk(result);
                expect(result.data).toStrictEqual(mockCreatedImage);
            });

            it('returns the error result immediately on failure', async () => {
                mockTchef.mockResolvedValue({
                    error: 'Internal Server Error',
                    ok: false,
                    statusCode: 500,
                });

                const result = await images.create(42, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertErr(result);
                expect(result.statusCode).toBe(500);
            });
        });

        describe('image_file path (multipart POST via tchef)', () => {
            beforeEach(() => {
                mockTchef.mockResolvedValue(mockCreateEnvelope);
            });

            it('calls tchef exactly once', async () => {
                await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                expect(mockTchef).toHaveBeenCalledOnce();
            });

            it('includes productId in the URL path', async () => {
                await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                expect(getCallUrl(mockTchef, 0).pathname).toMatch(/\/42\/images$/u);
            });

            it('uses the POST method', async () => {
                await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                expect(getCallOptions(mockTchef, 0).method).toBe('POST');
            });

            it('sends the access token as X-Auth-Token', async () => {
                await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
            });

            it('does not set Content-Type (lets the runtime set the multipart boundary)', async () => {
                await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBeUndefined();
            });

            it('sends a FormData body', async () => {
                await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                expect(getCallOptions(mockTchef, 0).body).toBeInstanceOf(FormData);
            });

            it('unwraps the response envelope and returns data.data', async () => {
                const result = await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                assertOk(result);
                expect(result.data).toStrictEqual(mockCreatedImage);
            });

            it('returns the error result immediately on failure', async () => {
                mockTchef.mockResolvedValue({
                    error: 'Unprocessable Entity',
                    ok: false,
                    statusCode: 422,
                });

                const result = await images.create(42, {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                });

                assertErr(result);
                expect(result.statusCode).toBe(422);
            });
        });
    });

    describe('delete image', () => {
        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: '', ok: true });
        });

        it('returns a 400 error without calling the API when productId is 0', async () => {
            const result = await images.remove(0, 55);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid productId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when productId is a non-integer', async () => {
            const result = await images.remove(1.5, 55);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when imageId is 0', async () => {
            const result = await images.remove(42, 0);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid imageId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('returns a 400 error without calling the API when imageId is a non-integer', async () => {
            const result = await images.remove(42, 1.5);

            assertErr(result);
            expect(result.statusCode).toBe(400);
            expect(result.error).toBe('Invalid imageId: must be a positive integer.');
            expect(mockTchef).not.toHaveBeenCalled();
        });

        it('makes exactly one HTTP call', async () => {
            await images.remove(42, 55);

            expect(mockTchef).toHaveBeenCalledOnce();
        });

        it('uses the DELETE method', async () => {
            await images.remove(42, 55);

            expect(getCallOptions(mockTchef, 0).method).toBe('DELETE');
        });

        it('includes productId and imageId in the URL path', async () => {
            await images.remove(42, 55);

            expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/images/55');
        });

        it('sends the access token as X-Auth-Token', async () => {
            await images.remove(42, 55);

            expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
        });

        it('uses responseFormat: text to handle the empty 204 body', async () => {
            await images.remove(42, 55);

            expect(getCallOptions(mockTchef, 0).responseFormat).toBe('text');
        });

        it('returns { ok: true, data: null } on success', async () => {
            const result = await images.remove(42, 55);

            expect(result).toStrictEqual({ data: null, ok: true });
        });

        it('returns the error result immediately on failure', async () => {
            mockTchef.mockResolvedValue({
                error: 'Not Found',
                ok: false,
                statusCode: 404,
            });

            const result = await images.remove(42, 99_999);

            assertErr(result);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('update image', () => {
        const mockUpdatedImage = { ...mockImage, description: 'Updated description' };

        beforeEach(() => {
            mockTchef.mockResolvedValue({ data: { data: mockUpdatedImage }, ok: true });
        });

        describe('ID validation', () => {
            it('returns a 400 error without calling the API when productId is 0', async () => {
                const result = await images.update(0, 55, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(result.error).toBe('Invalid productId: must be a positive integer.');
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error without calling the API when productId is a non-integer', async () => {
                const result = await images.update(1.5, 55, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error without calling the API when imageId is 0', async () => {
                const result = await images.update(42, 0, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(result.error).toBe('Invalid imageId: must be a positive integer.');
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error without calling the API when imageId is a non-integer', async () => {
                const result = await images.update(42, 1.5, {
                    image_url: 'https://example.com/img.jpg',
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(result.error).toBe('Invalid imageId: must be a positive integer.');
                expect(mockTchef).not.toHaveBeenCalled();
            });
        });

        describe('payload validation', () => {
            it('returns a 400 error when payload contains both image_file and image_url', async () => {
                const invalidPayload = {
                    image_file: new File(['img'], 'photo.jpg', { type: 'image/jpeg' }),
                    image_url: 'https://example.com/img.jpg',
                } as unknown as ProductImageUpdatePayload;

                const result = await images.update(42, 55, invalidPayload);

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(result.error).toBe('Payload cannot contain both image_file and image_url');
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('accepts a file upload payload and sends a multipart PUT request', async () => {
                const fetchResponse = {
                    json: vi.fn().mockResolvedValue({ data: mockUpdatedImage }),
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                } as unknown as Response;

                const fetchMock = vi.fn().mockResolvedValue(fetchResponse);

                vi.stubGlobal('fetch', fetchMock);

                const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
                const result = await images.update(42, 55, {
                    description: 'updated desc',
                    image_file: file,
                    is_thumbnail: true,
                    sort_order: 3,
                });

                expect(fetch).toHaveBeenCalledOnce();
                expect(result).toMatchObject({ data: mockUpdatedImage, ok: true });

                const [url, init] = fetchMock.mock.calls[0] as [string | URL, RequestInit?];

                expect({
                    init,
                    url: String(url),
                }).toMatchObject({
                    init: expect.objectContaining({
                        headers: expect.objectContaining({
                            Accept: 'application/json',
                            'X-Auth-Token': 'test-token',
                        }),
                        method: 'PUT',
                    }),
                    url: expect.stringContaining('catalog/products/42/images/55'),
                });

                const formData = init?.body as FormData;

                expect({
                    description: formData.get('description'),
                    imageFile: formData.get('image_file'),
                    isThumbnail: formData.get('is_thumbnail'),
                    sortOrder: formData.get('sort_order'),
                }).toMatchObject({
                    description: 'updated desc',
                    imageFile: file,
                    isThumbnail: 'true',
                    sortOrder: '3',
                });

                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('succeeds when payload contains only non-image fields', async () => {
                const result = await images.update(42, 55, { description: 'new desc' });

                assertOk(result);
                expect(mockTchef).toHaveBeenCalledOnce();
            });

            it('returns a 400 error when image_url exceeds 255 characters', async () => {
                const result = await images.update(42, 55, {
                    image_url: `https://example.com/${'a'.repeat(240)}`,
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(result.error).toBe('image_url cannot exceed 255 characters');
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error when sort_order is a non-integer', async () => {
                const result = await images.update(42, 55, {
                    image_url: 'https://example.com/img.jpg',
                    sort_order: 1.5,
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });

            it('returns a 400 error when sort_order exceeds the integer range', async () => {
                const result = await images.update(42, 55, {
                    image_url: 'https://example.com/img.jpg',
                    sort_order: 2_147_483_648,
                });

                assertErr(result);
                expect(result.statusCode).toBe(400);
                expect(mockTchef).not.toHaveBeenCalled();
            });
        });

        describe('request', () => {
            it('makes exactly one HTTP call', async () => {
                await images.update(42, 55, { description: 'updated' });

                expect(mockTchef).toHaveBeenCalledOnce();
            });

            it('uses the PUT method', async () => {
                await images.update(42, 55, { description: 'updated' });

                expect(getCallOptions(mockTchef, 0).method).toBe('PUT');
            });

            it('includes productId and imageId in the URL path', async () => {
                await images.update(42, 55, { description: 'updated' });

                expect(getCallUrl(mockTchef, 0).href).toContain('catalog/products/42/images/55');
            });

            it('sends the access token as X-Auth-Token', async () => {
                await images.update(42, 55, { description: 'updated' });

                expect(getCallHeaders(mockTchef, 0)['X-Auth-Token']).toBe('test-token');
            });

            it('sends Content-Type: application/json', async () => {
                await images.update(42, 55, { description: 'updated' });

                expect(getCallHeaders(mockTchef, 0)['Content-Type']).toBe('application/json');
            });

            it('sends Accept: application/json', async () => {
                await images.update(42, 55, { description: 'updated' });

                expect(getCallHeaders(mockTchef, 0).Accept).toBe('application/json');
            });

            it('serializes the payload as a JSON string in the body', async () => {
                const payload = { description: 'updated', sort_order: 3 };
                await images.update(42, 55, payload);

                const { body } = getCallOptions(mockTchef, 0);
                expect(body).toBeTypeOf('string');
                expect(JSON.parse(body as string)).toStrictEqual(payload);
            });

            it('unwraps the response envelope and returns data.data', async () => {
                const result = await images.update(42, 55, { description: 'updated' });

                assertOk(result);
                expect(result.data).toStrictEqual(mockUpdatedImage);
            });

            it('returns the error result immediately on failure', async () => {
                mockTchef.mockResolvedValue({
                    error: 'Not Found',
                    ok: false,
                    statusCode: 404,
                });

                const result = await images.update(42, 99_999, { description: 'updated' });

                assertErr(result);
                expect(result.statusCode).toBe(404);
            });
        });
    });
});

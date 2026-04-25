# BigCommerce API Chef 🍛

![Build Status](https://img.shields.io/github/actions/workflow/status/rogerio-romao/bc-api-chef/ci.yml)

A TypeScript client for the BigCommerce API, designed to be simple, efficient,
and developer-friendly. It provides a clean and intuitive interface for
interacting with the BigCommerce API, making it easier to manage your e-commerce
store's data and operations.

WIP: This project is currently in development, and the API may change as I
refine the design and add features. Stay tuned for updates!

## Features (planned)

- **TypeScript Support**: Fully typed for better developer experience and fewer
  runtime errors.
- **Modular Design**: Organized into modules for different API resources (e.g.,
  Products, Orders, Customers).
- **Built-in Error Handling**: Provides detailed error messages and handles API
  errors gracefully.
- **Request Caching**: Optional caching mechanism to improve performance and
  reduce API calls.
- **Rate Limiting**: Automatically handles API rate limits to prevent request
  failures.
- **Pagination Support**: Simplifies handling paginated API responses.
- **Retry Logic**: Automatically retries failed requests due to transient
  issues.
- **Validation**: Validates request parameters and response data against the API
  schema.

## Schema Validation

TypeScript types are the primary way we ensure type safety, giving you the correct expected type for each API response based on your query parameters. However, runtime data can still deviate from the expected types (e.g., due to API changes or data inconsistencies). As an optional additional safety net, every data-returning
method accepts a `schema` option that follows the
[Standard Schema](https://standardschema.dev/) interface (`StandardSchemaV1`).
This lets you plug in any compatible validation library — such as
[Zod](https://zod.dev/), [Valibot](https://valibot.dev/), or
[ArkType](https://arktype.io/) — without the client taking a hard dependency on
any of them.

When a schema is provided, it is applied to the unwrapped response data
(i.e. after the BigCommerce `{ data: T }` envelope is stripped) before the
result is returned. On failure the method returns
`{ ok: false, statusCode: 422, error: 'Schema validation failed: <message>' }`
instead of the data. For paginated methods validation runs per item and
short-circuits on the first failure, so subsequent pages are never fetched.

### Example — getOne

```ts
import * as v from 'valibot';
import { BcApiChef } from 'bc-api-chef';

const ProductSchema = v.object({
    id: v.number(),
    name: v.string(),
    price: v.number(),
});

const client = new BcApiChef(storeHash, accessToken);
const result = await client.v3().products().getOne(123, {
    schema: ProductSchema,
});

if (!result.ok) {
    // result.error is 'Schema validation failed: ...' if schema rejected the response
    console.error(result.error);
} else {
    console.log(result.data.name);
}
```

### Example — create and update

```ts
const result = await client
    .v3()
    .products()
    .create({ name: 'My Product', type: 'physical', weight: 0.5 }, { schema: ProductSchema });
```

### Using include_fields alongside a schema

When you narrow the response with `include_fields`, pass a schema that matches
the narrowed shape — not the full product type — to avoid spurious validation
failures (BC always returns the id field, even if you don't ask for it, so the schema must include it to validate successfully):

```ts
const NarrowSchema = v.object({
    id: v.number(),
    name: v.string(),
});

const result = await client
    .v3()
    .products()
    .getOne(123, {
        include_fields: ['name'],
        schema: NarrowSchema,
    });
```

## Retry Logic

Every data-returning method accepts an optional `retries` key inside its
options object. When provided, failed requests are automatically retried by the
underlying HTTP layer ([tchef](https://github.com/rogerio-romao/tchef)).

### RetryConfig shape

```ts
interface RetryConfig {
    /** Number of additional retries after the initial attempt. Total calls = repeat + 1. */
    repeat: number;
    /**
     * Delay between retries.
     * - number — fixed delay in milliseconds (e.g. 500 → 500 ms between each retry).
     * - 'exponential' — exponential back-off: 2000 × 2^(attempt+1) ms
     *   (1st retry: 4 000 ms, 2nd: 8 000 ms, 3rd: 16 000 ms …).
     * Omitting this field uses a 100 ms fixed default.
     */
    retryDelay?: number | 'exponential';
}
```

Retries are triggered on:

- Non-2xx HTTP responses
- Invalid / unparseable response bodies (JSON, text, blob)
- Network errors and request timeouts

When all retries are exhausted the method returns:

```ts
{ ok: false, statusCode: <last HTTP status>, error: 'Max retries reached. <last error message>' }
```

### Example — fixed delay in milliseconds

```ts
const client = new BcApiChef(storeHash, accessToken);

const result = await client
    .v3()
    .products()
    .getOne(123, {
        retries: { repeat: 3, retryDelay: 500 }, // up to 4 total attempts, 500 ms apart
    });

if (!result.ok) {
    console.error(result.error); // 'Max retries reached. ...' if all attempts failed
} else {
    console.log(result.data.name);
}
```

### Example — exponential back-off

```ts
const result = await client
    .v3()
    .products()
    .create(
        { name: 'New Product', type: 'physical', weight: 1.0 },
        {
            retries: {
                repeat: 4,
                retryDelay: 'exponential', // 4 s → 8 s → 16 s → 32 s
            },
        },
    );
```

### Example — retries on sub-resources

```ts
const result = await client
    .v3()
    .products()
    .images(42)
    .getMultiple({
        retries: { repeat: 2, retryDelay: 1000 },
    });
```

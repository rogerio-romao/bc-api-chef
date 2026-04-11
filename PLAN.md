# Plan: Refactor & Complete Get Products Endpoint

## Context

bc-api-chef wraps the BigCommerce REST API with a fluent builder pattern (`BcApiChef` -> `.v3()` -> `.products()` -> `.getAllProducts()`). The project is early-stage, focused on the `GET /v3/catalog/products` endpoint. The current implementation has several bugs, only 6 of ~50+ query params are typed, and there are no tests for the actual BC API code. The goal is to fix the foundation (Phase 1) then complete the type-safe query parameter coverage test-first (Phase 2).

---

## Phase 1: Refactoring, Bug Fixes & Test Infrastructure

### 1.1 — Clean up `src/index.ts`

Remove all demo code (`fetchTodo`, `TodoSchema`, valibot import, top-level BC API usage block). Replace with clean re-exports of the public API surface:
- `export { default as BcApiChef } from './BcApiChef.ts'`
- Re-export relevant types from `api-types.ts` and `product-types.ts`

Delete `src/tests/index.test.ts` (tests the removed `fetchTodo`, hits a live API).

### 1.2 — Fix pagination bug in `ProductsV3.getMultiPage()`

**File:** [ProductsV3.ts](src/v3Api/Products/ProductsV3.ts)
**Bug:** URL is built once before the loop (line 63) with `page=1` hardcoded. The `page` variable increments but the URL is never rebuilt — every iteration re-fetches page 1.
**Fix:** Move URL construction inside the `do...while` loop body so it uses the current `page` value each iteration.

### 1.3 — Fix `generateIncludes` bug

**File:** [ProductsV3.ts:88-102](src/v3Api/Products/ProductsV3.ts)
**Bug:** Checks `Object.hasOwn` but never checks if the value is `true`. `{ variants: false }` would still include `variants`.
**Fix:** Replace with `Object.entries(includes).filter(([, v]) => v === true).map(([k]) => k).join(',')`.

### 1.4 — Fix `generateQueryString` dropping includes when no query

**File:** [ProductsV3.ts:104-117](src/v3Api/Products/ProductsV3.ts)
**Bug:** Returns `''` immediately if `query` is undefined, losing the includes string entirely.
**Fix:** Restructure so includes are always appended when present. Also add URL encoding. Use `URLSearchParams` for clean URL building.

### 1.5 — Fix `id:in` and `id:not_in` types

**File:** [api-types.ts:5-6](src/types/bigcommerce/api-types.ts)
Change from `string` to `number[]`. Update `generateQueryString` to handle array values by joining with commas.

### 1.6 — Remove unused `validate` and `retries` plumbing

**Files:** [BcApiChef.ts](src/BcApiChef.ts), [V3Api.ts](src/v3Api/V3Api.ts), [ProductsV3.ts](src/v3Api/Products/ProductsV3.ts)
Remove `validate` and `retries` from all constructor signatures and class fields. They're threaded everywhere but never used. Can be re-added when actually wired to `tchef` options.

### 1.7 — Fix `getAllProducts` method signature

**File:** [ProductsV3.ts:30-33](src/v3Api/Products/ProductsV3.ts)
Currently requires both `includes` and `query` (hardcoded in inline type), but `GetProductsOptions` marks both as optional. Make both optional with a default generic of `{}` for includes:
```ts
public async getAllProducts<T extends ProductIncludes = {}>(
    options?: { includes?: T; query?: ApiProductQuery }
)
```

### 1.8 — Split test setup: unit tests (no creds) + integration tests (real API)

**Unit tests** (default `pnpm test`): No credentials needed. All HTTP calls mocked via `vi.mock('tchef')`.
- Remove `.env` loading from [vitest.setup.ts](vitest.setup.ts) (or delete the file and remove from [vitest.config.ts](vitest.config.ts))

**Integration tests** (new `pnpm test:integration`): Hit the real BC API with credentials.
- Create `vitest.integration.config.ts` extending the base config, with its own setup file `vitest.integration.setup.ts` that loads `.env`
- Create `src/tests/integration/` directory for integration test files
- Integration tests use `describe.runIf(process.env.STORE_HASH)` as a safety guard so they skip gracefully if creds are missing
- Add npm script: `"test:integration": "vitest --run --config vitest.integration.config.ts"`
- CI runs only unit tests (`test:ci`). Integration tests are manual/local only.

**Integration test file:** `src/tests/integration/products.integration.test.ts`
- Smoke test: instantiate `BcApiChef` with real creds, call `getAllProducts` with a small query (e.g. `{ limit: 1 }`), assert response shape matches types
- Test includes: request with `{ variants: true, images: true }`, verify sub-resources are present in response
- Test `include_fields`: request with `{ include_fields: ['id', 'name'] }`, verify only those fields are populated
- Test pagination: request all products (no filter), verify multi-page results are concatenated
- These are not run in CI — they validate real API behavior during local development

### 1.9 — Establish test infrastructure

**New file:** `src/tests/products-v3.test.ts` — Mock `tchef` via `vi.mock('tchef', ...)`. Test cases:
- Pagination: mock returns `total_pages: 3`, assert `tchef` called 3x with correct page params, all data concatenated
- `generateIncludes`: `{ variants: true, images: false }` → URL contains `variants`, not `images`
- All includes `false` → no `include=` param
- Includes without query → URL still has `include=...`
- Query without includes → URL has query params, no `include=`
- URL encoding: `{ name: 'foo&bar' }` → properly encoded
- Array serialization: `{ 'id:in': [1,2,3] }` → correct comma-separated encoding
- Empty options / no args → valid request

**New file:** `src/tests/bc-api-chef.test.ts` — Builder chain sanity:
- `.v3()` returns V3Api instance
- `.products()` returns ProductsV3 instance

---

## Phase 2: Complete Get Products Query Params (TDD)

### 2.1 — Add `BaseProductField` type

**File:** [product-types.ts](src/types/bigcommerce/product-types.ts)
```ts
export type BaseProductField = keyof BaseProduct;
```
Provides the source-of-truth union for `include_fields` / `exclude_fields`.

### 2.2 — Add sort and direction literal types

**File:** [api-types.ts](src/types/bigcommerce/api-types.ts)
```ts
export type ProductSortField = 'id' | 'name' | 'sku' | 'price' | 'date_modified' | 'date_last_imported' | 'inventory_level' | 'is_visible' | 'total_sold';
export type SortDirection = 'asc' | 'desc';
```

### 2.3 — Complete `ApiProductQuery` with all BC API params

**File:** [api-types.ts](src/types/bigcommerce/api-types.ts)
Expand from 6 fields to the full ~50+ params from the BC API docs:
- ID filters: `id`, `id:in`, `id:not_in`, `id:min`, `id:max`, `id:greater`, `id:less`
- Name: `name`, `name:like`
- SKU: `sku`, `sku:in`
- Simple: `upc`, `price`, `weight`, `condition`, `brand_id`
- Dates: `date_modified`, `date_modified:max/min`, `date_last_imported`, `date_last_imported:max/min`
- Booleans: `is_visible`, `is_featured`, `is_free_shipping`
- Inventory: `inventory_level`, `inventory_level:in/not_in/min/max/greater/less`, `inventory_low_stock`, `out_of_stock`
- Other: `total_sold`, `type`, `categories`, `categories:in`, `keyword`, `keyword_context`, `status`, `availability`
- Field selection: `include_fields: BaseProductField[]`, `exclude_fields: BaseProductField[]`
- Sort/pagination: `sort: ProductSortField`, `direction: SortDirection`, `page`, `limit`

Reuse existing literal unions from `BaseProduct` where applicable (`condition`, `type`, `availability`).

### 2.4 — Type-narrow return type based on `include_fields`

Add a second generic to `getAllProducts` so that when `include_fields` is provided, the return type is `Pick<BaseProduct, ...>` instead of the full `BaseProduct`. Do NOT model `exclude_fields` affecting the return type (too fragile with `Omit` + generics).

```ts
export type GetProductsReturnType<
    T extends ProductIncludes,
    F extends readonly BaseProductField[] | undefined = undefined,
> = Array<
    (F extends readonly BaseProductField[] ? Pick<BaseProduct, F[number]> : BaseProduct) &
    IncludeExpansion<T>
>;
```

### 2.5 — Update serialization for new param types

**File:** [ProductsV3.ts](src/v3Api/Products/ProductsV3.ts)
Handle all value types: `number`, `string`, `boolean`, `number[]`, `string[]`, `BaseProductField[]`. Use `URLSearchParams` for automatic encoding. Strip `page`/`limit` from user query (managed internally by `getMultiPage`).

### 2.6 — Write type-level tests (TDD)

**New file:** `src/tests/product-types.test.ts`
Use vitest's `expectTypeOf` for compile-time assertions:
- `BaseProductField` equals `keyof BaseProduct`
- `include_fields` accepts valid field names, rejects invalid ones (`@ts-expect-error`)
- `id:in` is `number[] | undefined`
- `ProductSortField` is the correct union, rejects invalid strings
- `GetProductsReturnType` with includes adds sub-resources
- `GetProductsReturnType` without includes returns `BaseProduct`
- `include_fields` narrows return type to `Pick<BaseProduct, ...>`
- Combined includes + include_fields works correctly
- `condition`, `type`, `availability` only accept correct literals

### 2.7 — Write runtime serialization tests

**New file:** `src/tests/query-serialization.test.ts`
Mock `tchef`, verify URLs for: number arrays, string arrays, booleans, dates, sort/direction, `include_fields` as array, full combination queries. Verify `page`/`limit` from user query are stripped/overridden.

### 2.8 — Make `getMultiPage` generic

Change internal accumulator from `FullProduct[]` to `unknown[]` and let `getAllProducts` assert the final type. This is more honest — the internal type was always a lie when includes didn't match `FullProduct`.

---

## Key Design Decisions

1. **`URLSearchParams` for query building** — handles encoding automatically. Using standard encoding (`%3A` for colons in `id:in` etc.). If BC rejects encoded colons, we'll fix later.
2. **`include_fields` narrows return type; `exclude_fields` does not** — `Pick` with generics works well; `Omit` with a generic array is fragile.
3. **No `.env` in unit tests** — all unit tests mock `tchef`, no real API calls. Integration tests use a separate vitest config that loads `.env`.
4. **Arrays for multi-value params** — `number[]` for `id:in` etc., `BaseProductField[]` for field selection. Serialized to comma-separated strings at the URL layer.

## Files Modified

| File | Changes |
|------|---------|
| `src/index.ts` | Strip demo code, clean re-exports |
| `src/BcApiChef.ts` | Remove validate/retries |
| `src/v3Api/V3Api.ts` | Remove validate/retries |
| `src/v3Api/Products/ProductsV3.ts` | Pagination fix, includes fix, query string rewrite, method signature, generics |
| `src/types/bigcommerce/api-types.ts` | Complete ApiProductQuery, sort/direction types, updated generics |
| `src/types/bigcommerce/product-types.ts` | Add BaseProductField type |
| `vitest.setup.ts` | Remove .env loading (unit tests need no creds) |
| `vitest.config.ts` | Remove setupFiles if vitest.setup.ts is deleted |

## Files Created

| File | Purpose |
|------|---------|
| `src/tests/products-v3.test.ts` | Runtime unit tests for bug fixes + behavior |
| `src/tests/bc-api-chef.test.ts` | Builder chain tests |
| `src/tests/product-types.test.ts` | Type-level tests with expectTypeOf |
| `src/tests/query-serialization.test.ts` | Runtime tests for query param serialization |
| `vitest.integration.config.ts` | Vitest config for integration tests (loads .env) |
| `vitest.integration.setup.ts` | Setup file that loads .env for integration tests |
| `src/tests/integration/products.integration.test.ts` | Real API smoke tests (local only, not CI) |

## Files Deleted

| File | Reason |
|------|--------|
| `src/tests/index.test.ts` | Tests removed fetchTodo demo, hits live API |

## Verification

1. `pnpm run dev:tsc` — zero type errors after each step
2. `pnpm test` — all unit tests pass (mocked, no creds needed), no regressions
3. `pnpm test:integration` — real API smoke tests pass (requires `.env` with valid creds)
4. `pnpm lint` — clean
5. Manual verification: IDE autocomplete shows all query params with correct types; `include_fields` narrows return type in hover tooltips

## npm scripts changes

Add to `package.json`:
```json
"test:integration": "vitest --run --config vitest.integration.config.ts"
```

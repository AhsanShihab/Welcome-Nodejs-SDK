# Welcome-Nodejs-SDK

Node.js SDK for the [Optimizely CMP](https://docs.developers.optimizely.com/content-marketing-platform/reference/api-reference) REST API. Published as [`@welcomesoftware/cmp-sdk`](https://www.npmjs.com/package/@welcomesoftware/cmp-sdk).

Public entry point is `CmpClient` from `src/index.ts`. Consumers use `cmpClient.<module>.<method>()` (task, campaign, library, publishing, user, uploader, auth, label).

## Architecture

Two-layer:

1. **Modules** (`src/modules/`) — one class per API tag; methods call `APICaller` and wrap responses. Each accepts an optional `tokenGetParam` (opaque value used by multi-tenant apps to look up per-request tokens).
2. **Objects** (`src/objects/`) — class-instance wrappers around API responses. Every resource extends `Resource<TData>` (see below). Resources hold their own `apiCaller` + `tokenGetParam` so their methods can follow HATEOAS links without the consumer rebuilding URLs.

Case conversion happens at the API boundary (`APICaller`): TypeScript uses camelCase, wire JSON uses snake_case. `src/util.ts` has both directions.

## The `Resource<TData>` base class

Every resource class extends `Resource<TData>` and declares static configs. Base handles constructor plumbing, date conversion, nested-class hydration, `toJSON`, `getRelatedLinks`, and HATEOAS traversal.

```ts
export class Foo extends Resource<FooData> {
  static dateFields = ["createdAt", "updatedAt"] as const;
  static nested: Record<string, ResourceCtor> = { children: Child };
  static linkTargets: Record<string, ResourceCtor> = { parent: Parent };
  static listLinkTargets: Record<string, ResourceCtor> = { items: ItemList };

  // Wrapper methods pick the right helper based on OpenAPI-declared nullability:
  getParent()    { return this._follow<Parent>("parent"); }          // nullable link
  getRequired()  { return this._followRequired<X>("x"); }            // required + non-null
  getOptional()  { return this._followOptional<Y>("y"); }            // key may be absent
  getItems(opt)  { return this._followList<ItemList>("items", opt); }
  update(payload){ return this._updateSelf(payload); }               // PATCH links.self + rehydrate
}
```

The interface merge pattern `export interface Foo { ... } export class Foo extends Resource<FooData> {}` is how public field types (Date instead of string, class instances instead of nested data) surface to consumers. Don't remove.

List classes use `src/objects/list-factory.ts`:

```ts
export class FooList extends createListClass(Foo) {}
```

This inherits `getNextBatch()` / `getPreviousBatch()` from `ListData` with correct self-typing.

## Spec-strict validation

The SDK treats the OpenAPI spec as source of truth. If the API violates the contract, we throw rather than silently coerce.

- Date field with non-string, non-null value → `TypeError`
- Nested field with unexpected type → `TypeError`
- Link key missing from response → `Error`
- Link value `null` for a non-nullable link → `Error` (use `_followRequired`)
- Link value non-string → `TypeError`

If you're editing `Resource`, don't add silent fallbacks. If the base class can't determine the spec rule for a case (e.g., which links are optional-key), require the subclass to disambiguate via method choice (`_followOptional` vs `_follow`).

## Conventions

- Constructor signature for all resources: `(data, apiCaller, tokenGetParam?)`. `TaskStep`'s old inverted order was a legacy quirk and got normalized.
- Private fields use `#` syntax so they don't leak into `{...this}` spread or `JSON.stringify`.
- Value-add methods (`Uploader.upload`, `Auth.initiateOAuth`, etc.) are hand-written and stay hand-written. Not everything fits the Resource pattern.
- No `as any` casts inside `Resource`. Narrow assertions (`as string`, `as Bag`) are OK. The `data: any` in `ResourceCtor` is a documented variance workaround — not a cast.
- `getRelatedLinks(): LinksOf<TData>` and `toJSON(): WireData<TData>` use conditional types to preserve per-subclass typing. Don't collapse to `any`.

## Where things live

- `src/index.ts` — public exports (only `CmpClient` + type)
- `src/welcome.ts` — `CmpClient` composition root; wires modules
- `src/modules/api-caller/api-caller.ts` — HTTP layer, case conversion, 401 auto-retry
- `src/modules/auth/auth.ts` — full OAuth code-flow + refresh
- `src/objects/resource.ts` — the base class
- `src/objects/list-factory.ts` — `createListClass` factory
- `src/objects/base-list-data.ts` — `ListData` with `getNextBatch`/`getPreviousBatch`
- `src/objects/libray-objects/index.ts` — registers `FolderList` as `Folder.linkTargets.childFolders` (breaks the circular dep via type-only import in `folder.ts`)
- `src/errors/index.ts` — typed HTTP errors (400/401/403/404/422)
- `docs/` — hand-written user reference (per-object + per-module)
- `tests/` — jest + nock; `tests/objects/` for base class, `tests/modules/` for module + object family

## Common commands

```bash
npx tsc --noEmit          # type-check
npx jest                  # run all tests (141 tests currently)
npx jest tests/objects    # just the base class tests
npm run build             # tsc emit to lib/
```

## Adding a new resource

1. Read the OpenAPI response schema for the resource
2. Write `FooData` interface (snake_case → camelCase in property names)
3. Write `interface Foo extends Common` for the runtime shape (Date not string, wrapped classes not raw data)
4. Extend `Resource<FooData>`, declare `dateFields` / `nested` / `linkTargets` / `listLinkTargets`
5. Add wrapper methods that call the right `_follow*` variant based on spec nullability
6. If it's paginated: `export class FooList extends createListClass(Foo) {}`
7. Wire up the module method in `src/modules/<tag>/<tag>.ts` — pass `apiCaller` and `tokenGetParam` to every ctor
8. Add tests to `tests/modules/<tag>.test.ts` — mock via `nock`, verify hydration + one or two HATEOAS follows

See `src/objects/task.ts` for a full-featured example and `src/objects/attachment.ts` for the minimum (pure data resource).

## Breaking-change discipline

Public API is `CmpClient` + its return types (as documented in `docs/`). Deep imports of internal classes (via `@welcomesoftware/cmp-sdk/lib/objects/...`) are not covered by semver — but call out affected classes in release notes so anyone reaching past `src/index.ts` isn't surprised.

import { APICaller } from "../modules/api-caller";
import { buildQueryString } from "../util";
import { PaginationOption } from "./common/types";

// `data: any` (not `unknown`) is deliberate: `linkTargets` holds a heterogeneous
// bag of resource constructors with different data shapes, and parameter
// contravariance would otherwise forbid assigning `new (data: FooData) => Foo`
// to `ResourceCtor`. This is not a cast — just a permissive parameter type.
export type ResourceCtor<T = unknown> = new (
  data: any,
  apiCaller: APICaller,
  tokenGetParam?: unknown
) => T;

export type ResourceMeta = {
  dateFields?: readonly string[];
  nested?: Readonly<Record<string, ResourceCtor>>;
  linkTargets?: Readonly<Record<string, ResourceCtor>>;
  listLinkTargets?: Readonly<Record<string, ResourceCtor>>;
};

type Bag = Record<string, unknown>;

// Pulls the `links` shape out of TData when present; falls back to `never`
// otherwise. `never` signals at the type level that a resource with no `links`
// field cannot meaningfully call getRelatedLinks / _follow — consumers get a
// compile error instead of a plausibly-typed empty bag.
type LinksOf<T> = T extends { links: infer L } ? L : never;

// Wire-format representation returned by toJSON: TData minus the `links` field.
// Nested classes are already typed as their *Data shape in TData, which matches
// what their own toJSON() returns.
type WireData<T> = T extends object ? Omit<T, "links"> : Bag;

function hasToJSON(v: unknown): v is { toJSON: () => unknown } {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { toJSON?: unknown }).toJSON === "function"
  );
}

function describeType(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

export class Resource<TData = unknown> {
  #apiCaller: APICaller;
  #tokenGetParam: unknown;
  #links: Bag = {};

  constructor(data: TData, apiCaller: APICaller, tokenGetParam?: unknown) {
    this.#apiCaller = apiCaller;
    this.#tokenGetParam = tokenGetParam;
    this.#loadData(data);
  }

  #getMeta(): ResourceMeta {
    return this.constructor as unknown as ResourceMeta;
  }

  #loadData(data: TData) {
    const meta = this.#getMeta();
    const source = data as Bag & { links?: Bag };
    const { links, ...rest } = source;
    const self = this as unknown as Bag;

    if (links !== undefined) {
      this.#links = links;
    }

    Object.assign(self, rest);

    // The OpenAPI spec is the source of truth. Fields marked `nullable: true`
    // may be null; fields marked required will always be present; unrequired
    // fields may be absent (undefined). Anything else is a contract break, so
    // we throw rather than silently coerce or fall back to a "safe" default.
    for (const field of meta.dateFields ?? []) {
      if (!(field in rest)) continue; // absent — respects unrequired-field spec
      const val = rest[field];
      if (val === null) {
        self[field] = null;
      } else if (typeof val === "string") {
        self[field] = new Date(val);
      } else {
        throw new TypeError(
          `${this.constructor.name}: field '${field}' expected an ISO date-time string or null, got ${describeType(val)}`
        );
      }
    }

    for (const [field, Ctor] of Object.entries(meta.nested ?? {})) {
      if (!(field in rest)) continue;
      const val = rest[field];
      if (val === null) {
        self[field] = null;
      } else if (Array.isArray(val)) {
        self[field] = val.map(
          (item) => new Ctor(item, this.#apiCaller, this.#tokenGetParam)
        );
      } else if (typeof val === "object") {
        self[field] = new Ctor(val, this.#apiCaller, this.#tokenGetParam);
      } else {
        throw new TypeError(
          `${this.constructor.name}: field '${field}' expected an object, array, or null, got ${describeType(val)}`
        );
      }
    }
  }

  getRelatedLinks(): LinksOf<TData> {
    return this.#links as LinksOf<TData>;
  }

  toJSON(): WireData<TData> {
    const meta = this.#getMeta();
    const self = this as unknown as Bag;
    const out: Bag = { ...self };

    for (const field of meta.dateFields ?? []) {
      const val = self[field];
      if (val instanceof Date) out[field] = val.toISOString();
    }

    for (const field of Object.keys(meta.nested ?? {})) {
      const val = self[field];
      if (Array.isArray(val)) {
        out[field] = val.map((item) =>
          hasToJSON(item) ? item.toJSON() : item
        );
      } else if (hasToJSON(val)) {
        out[field] = val.toJSON();
      }
    }

    return out as WireData<TData>;
  }

  protected get _apiCaller(): APICaller {
    return this.#apiCaller;
  }

  protected get _tokenGetParam(): unknown {
    return this.#tokenGetParam;
  }

  protected get _links(): Readonly<LinksOf<TData>> {
    return this.#links as Readonly<LinksOf<TData>>;
  }

  protected _reload(data: TData) {
    this.#loadData(data);
  }

  // Resolves a link URL with strict spec-adherent validation. Returns:
  //   - the URL string when the link is present and truthy
  //   - null when the link value is explicitly null (respects `nullable: true`)
  // Throws when the link key is missing from the response (contract break for
  // any required link) or when the value has an unexpected type.
  //
  // Exposed as `protected` so subclasses can use it as an escape hatch when
  // they need to follow a link without wrapping the response in a
  // registered class (e.g. CustomField.getChoices returning a raw payload).
  protected _resolveLinkUrl(linkName: string): string | null {
    if (!(linkName in this.#links)) {
      throw new Error(
        `${this.constructor.name}: link '${linkName}' is missing from the API response`
      );
    }
    const url = this.#links[linkName];
    if (url === null) return null;
    if (typeof url !== "string") {
      throw new TypeError(
        `${this.constructor.name}: link '${linkName}' expected a string or null, got ${describeType(url)}`
      );
    }
    return url;
  }

  protected async _updateSelf(payload: unknown): Promise<void> {
    const url = this._resolveLinkUrl("self");
    if (url === null) {
      // `links.self` should never be nullable per spec — contract break.
      throw new Error(
        `${this.constructor.name}: cannot update — 'self' link is null`
      );
    }
    const response = await this.#apiCaller.patch(
      url,
      payload,
      this.#tokenGetParam
    );
    this.#loadData(response as TData);
  }

  // For links the spec marks `nullable: true`. Returns null only when the link
  // value in the response is explicitly null; throws for missing keys or
  // malformed values.
  protected async _follow<T = unknown>(linkName: string): Promise<T | null> {
    const url = this._resolveLinkUrl(linkName);
    if (url === null) return null;
    const Ctor = this.#getMeta().linkTargets?.[linkName];
    if (!Ctor) {
      throw new Error(
        `No linkTarget registered for '${linkName}' on ${this.constructor.name}`
      );
    }
    const response = await this.#apiCaller.get(url, this.#tokenGetParam);
    return new Ctor(response, this.#apiCaller, this.#tokenGetParam) as T;
  }

  // For links the spec marks required and non-nullable. Throws if the API
  // returns null for the link, which is a contract break.
  protected async _followRequired<T = unknown>(linkName: string): Promise<T> {
    const result = await this._follow<T>(linkName);
    if (result === null) {
      throw new Error(
        `${this.constructor.name}: required non-nullable link '${linkName}' resolved to null`
      );
    }
    return result;
  }

  // For links the spec marks optional (not in the `required` array). Returns
  // null when the key is absent from the response (valid per spec) or when the
  // value is explicitly null. Only throws on malformed values.
  protected async _followOptional<T = unknown>(
    linkName: string
  ): Promise<T | null> {
    if (!(linkName in this.#links)) return null;
    return this._follow<T>(linkName);
  }

  protected async _followList<T = unknown>(
    linkName: string,
    option: PaginationOption = {}
  ): Promise<T | null> {
    const url = this._resolveLinkUrl(linkName);
    if (url === null) return null;
    const Ctor = this.#getMeta().listLinkTargets?.[linkName];
    if (!Ctor) {
      throw new Error(
        `No listLinkTarget registered for '${linkName}' on ${this.constructor.name}`
      );
    }
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      url + query,
      this.#tokenGetParam
    );
    return new Ctor(response, this.#apiCaller, this.#tokenGetParam) as T;
  }

  protected async _followListRequired<T = unknown>(
    linkName: string,
    option: PaginationOption = {}
  ): Promise<T> {
    const result = await this._followList<T>(linkName, option);
    if (result === null) {
      throw new Error(
        `${this.constructor.name}: required non-nullable list link '${linkName}' resolved to null`
      );
    }
    return result;
  }

  // POSTs to a link and wraps the response with an explicitly-provided ctor.
  // Explicit `ResponseCtor` is required because the POST response type usually
  // differs from what `linkTargets` / `listLinkTargets` would suggest
  // (e.g. POST /tasks/{id}/assets returns a single TaskAsset, but
  // listLinkTargets["assets"] is TaskAssetList for the GET path).
  protected async _postToLink<T>(
    linkName: string,
    payload: unknown,
    ResponseCtor: ResourceCtor<T>
  ): Promise<T> {
    const url = this._resolveLinkUrl(linkName);
    if (url === null) {
      throw new Error(
        `${this.constructor.name}: cannot POST to '${linkName}' — link value is null`
      );
    }
    const response = await this.#apiCaller.post(
      url,
      payload,
      this.#tokenGetParam
    );
    return new ResponseCtor(
      response,
      this.#apiCaller,
      this.#tokenGetParam
    ) as T;
  }
}

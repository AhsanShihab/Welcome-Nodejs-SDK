import { Resource, ResourceCtor } from "../../src/objects/resource";
import { APICaller } from "../../src/modules/api-caller";
import { Auth } from "../../src/modules/auth";
import * as nock from "nock";

// A minimal test fixture. Declares a nested class + a linkable class so we
// exercise dateFields, nested, linkTargets, and listLinkTargets end-to-end.

interface ChildData {
  id: string;
  name: string;
  links: { self: string };
}
interface Child {
  id: string;
  name: string;
}
class Child extends Resource<ChildData> {}

interface OtherData {
  id: string;
  links: { self: string };
}
interface Other {
  id: string;
}
class Other extends Resource<OtherData> {}

interface OtherListData {
  data: OtherData[];
  pagination: { next: string | null; previous: string | null };
}
class OtherList extends Resource<OtherListData> {}

interface FixtureData {
  id: string;
  title: string;
  createdAt: string;
  archivedAt: string | null;
  child: ChildData;
  siblings: ChildData[];
  links: {
    self: string;
    other: string | null;
    otherRequired: string;
    others: string;
    optionalLink?: string | null;
  };
}
interface Fixture {
  id: string;
  title: string;
  createdAt: Date;
  archivedAt: Date | null;
  child: Child;
  siblings: Child[];
}
class Fixture extends Resource<FixtureData> {
  static dateFields = ["createdAt", "archivedAt"] as const;
  static nested: Record<string, ResourceCtor> = { child: Child, siblings: Child };
  static linkTargets: Record<string, ResourceCtor> = { other: Other, otherRequired: Other, optionalLink: Other };
  static listLinkTargets: Record<string, ResourceCtor> = { others: OtherList };

  followOther() {
    return this._follow<Other>("other");
  }
  followOtherRequired() {
    return this._followRequired<Other>("otherRequired");
  }
  followOptional() {
    return this._followOptional<Other>("optionalLink");
  }
  followOthers() {
    return this._followList<OtherList>("others");
  }
  followOthersRequired() {
    return this._followListRequired<OtherList>("others");
  }
  runUpdate(payload: unknown) {
    return this._updateSelf(payload);
  }
}

describe("Resource base class", () => {
  const auth = new Auth({
    accessToken: jest.fn().mockResolvedValue("token"),
    refreshToken: "refresh",
  });
  const apiCaller = new APICaller(auth, false);

  const validWireData: FixtureData = {
    id: "1",
    title: "hello",
    createdAt: "2024-01-01T00:00:00Z",
    archivedAt: null,
    child: { id: "c1", name: "kid", links: { self: "https://api/child/c1" } },
    siblings: [
      { id: "s1", name: "s-one", links: { self: "https://api/child/s1" } },
      { id: "s2", name: "s-two", links: { self: "https://api/child/s2" } },
    ],
    links: {
      self: "https://api/fixture/1",
      other: null,
      otherRequired: "https://api/other/o1",
      others: "https://api/others",
    },
  };

  afterEach(() => nock.cleanAll());

  describe("data loading", () => {
    it("assigns scalar fields via Object.assign", () => {
      const f = new Fixture(validWireData, apiCaller);
      expect(f.id).toBe("1");
      expect(f.title).toBe("hello");
    });

    it("converts declared date fields to Date instances", () => {
      const f = new Fixture(validWireData, apiCaller);
      expect(f.createdAt).toBeInstanceOf(Date);
      expect(f.createdAt.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    });

    it("preserves null on nullable date fields", () => {
      const f = new Fixture(validWireData, apiCaller);
      expect(f.archivedAt).toBeNull();
    });

    it("throws on a date field with unexpected type (spec violation)", () => {
      const bad = {
        ...validWireData,
        createdAt: 12345 as unknown as string,
      };
      expect(() => new Fixture(bad, apiCaller)).toThrow(
        /field 'createdAt' expected an ISO date-time string or null, got number/
      );
    });

    it("instantiates nested single objects as class instances", () => {
      const f = new Fixture(validWireData, apiCaller);
      expect(f.child).toBeInstanceOf(Child);
      expect(f.child.id).toBe("c1");
    });

    it("instantiates nested arrays as class-instance arrays", () => {
      const f = new Fixture(validWireData, apiCaller);
      expect(f.siblings).toHaveLength(2);
      expect(f.siblings[0]).toBeInstanceOf(Child);
      expect(f.siblings[1].name).toBe("s-two");
    });

    it("throws on a nested field with unexpected type (spec violation)", () => {
      const bad = { ...validWireData, siblings: "not an array" as unknown as ChildData[] };
      expect(() => new Fixture(bad, apiCaller)).toThrow(
        /field 'siblings' expected an object, array, or null, got string/
      );
    });

    it("preserves absent optional fields rather than clobbering to null", () => {
      const partial = { ...validWireData };
      // Simulate absent date field
      const source = { ...partial } as Partial<FixtureData>;
      delete source.archivedAt;
      const f = new Fixture(source as FixtureData, apiCaller);
      // Should NOT have been silently set to null just because the key is absent
      expect(f.archivedAt).toBeUndefined();
    });
  });

  describe("toJSON", () => {
    it("serializes dates back to ISO strings", () => {
      const f = new Fixture(validWireData, apiCaller);
      const json = f.toJSON() as Record<string, unknown>;
      expect(json.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(json.archivedAt).toBeNull();
    });

    it("recursively calls toJSON on nested resources", () => {
      const f = new Fixture(validWireData, apiCaller);
      const json = f.toJSON() as Record<string, unknown>;
      const siblings = json.siblings as Record<string, unknown>[];
      expect(siblings[0]).toEqual({ id: "s1", name: "s-one" });
    });

    it("does not include the links field or private plumbing", () => {
      const f = new Fixture(validWireData, apiCaller);
      const json = f.toJSON() as Record<string, unknown>;
      expect(json).not.toHaveProperty("links");
      expect(json).not.toHaveProperty("_apiCaller");
      expect(json).not.toHaveProperty("_tokenGetParam");
      expect(json).not.toHaveProperty("_links");
    });
  });

  describe("_follow — nullable link", () => {
    it("returns null when link value is null (respects nullable spec)", async () => {
      const f = new Fixture(validWireData, apiCaller);
      await expect(f.followOther()).resolves.toBeNull();
    });

    it("throws when link key is missing (contract break)", async () => {
      const bad = {
        ...validWireData,
        links: { self: "https://api/fixture/1", otherRequired: "x", others: "y" },
      } as unknown as FixtureData;
      const f = new Fixture(bad, apiCaller);
      await expect(f.followOther()).rejects.toThrow(
        /link 'other' is missing from the API response/
      );
    });

    it("throws when link value has an unexpected type", async () => {
      const bad = {
        ...validWireData,
        links: { ...validWireData.links, other: 42 as unknown as string },
      };
      const f = new Fixture(bad, apiCaller);
      await expect(f.followOther()).rejects.toThrow(
        /link 'other' expected a string or null, got number/
      );
    });

    it("follows a non-null link and wraps the response", async () => {
      const good = {
        ...validWireData,
        links: { ...validWireData.links, other: "https://api.example/other" },
      };
      nock("https://api.example").get("/other").reply(200, {
        id: "o1",
        links: { self: "https://api.example/other" },
      });
      const f = new Fixture(good, apiCaller);
      const other = await f.followOther();
      expect(other).toBeInstanceOf(Other);
      expect((other as Other).id).toBe("o1");
    });
  });

  describe("_followRequired — non-nullable link", () => {
    it("throws when link value is null (contract break)", async () => {
      const bad = {
        ...validWireData,
        links: { ...validWireData.links, otherRequired: null as unknown as string },
      };
      const f = new Fixture(bad, apiCaller);
      await expect(f.followOtherRequired()).rejects.toThrow(
        /required non-nullable link 'otherRequired' resolved to null/
      );
    });

    it("returns the wrapped resource when link is present", async () => {
      nock("https://api.example").get("/other-req").reply(200, {
        id: "or1",
        links: { self: "https://api.example/other-req" },
      });
      const good = {
        ...validWireData,
        links: { ...validWireData.links, otherRequired: "https://api.example/other-req" },
      };
      const f = new Fixture(good, apiCaller);
      const other = await f.followOtherRequired();
      expect(other).toBeInstanceOf(Other);
      expect(other.id).toBe("or1");
    });
  });

  describe("_followOptional — optional link", () => {
    it("returns null when the link key is absent (valid per spec)", async () => {
      const f = new Fixture(validWireData, apiCaller);
      await expect(f.followOptional()).resolves.toBeNull();
    });

    it("returns null when the link value is null", async () => {
      const withNullLink = {
        ...validWireData,
        links: { ...validWireData.links, optionalLink: null as string | null },
      };
      const f = new Fixture(withNullLink, apiCaller);
      await expect(f.followOptional()).resolves.toBeNull();
    });

    it("follows the link when present", async () => {
      nock("https://api.example").get("/opt").reply(200, {
        id: "opt1",
        links: { self: "https://api.example/opt" },
      });
      const withLink = {
        ...validWireData,
        links: { ...validWireData.links, optionalLink: "https://api.example/opt" },
      };
      const f = new Fixture(withLink, apiCaller);
      const result = await f.followOptional();
      expect(result).toBeInstanceOf(Other);
    });
  });

  describe("_followList / _followListRequired", () => {
    it("follows a list link and wraps the response", async () => {
      nock("https://api.example").get("/others").reply(200, {
        data: [{ id: "l1", links: { self: "https://api.example/others/l1" } }],
        pagination: { next: null, previous: null },
      });
      const withLink = {
        ...validWireData,
        links: { ...validWireData.links, others: "https://api.example/others" },
      };
      const f = new Fixture(withLink, apiCaller);
      const list = await f.followOthers();
      expect(list).toBeInstanceOf(OtherList);
    });
  });

  describe("_updateSelf", () => {
    it("PATCHes links.self and reloads state from the response", async () => {
      nock("https://api.example")
        .patch("/fixture/1", { title: "renamed" })
        .reply(200, { ...validWireData, title: "renamed" });
      const withRealSelf = {
        ...validWireData,
        links: { ...validWireData.links, self: "https://api.example/fixture/1" },
      };
      const f = new Fixture(withRealSelf, apiCaller);
      await f.runUpdate({ title: "renamed" });
      expect(f.title).toBe("renamed");
    });
  });

  describe("getRelatedLinks", () => {
    it("returns the raw links object", () => {
      const f = new Fixture(validWireData, apiCaller);
      expect(f.getRelatedLinks()).toEqual(validWireData.links);
    });
  });
});

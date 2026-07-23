import { User as UserModule } from "../../src/modules/user";
import { User } from "../../src/objects/user";
import { APICaller } from "../../src/modules/api-caller";
import { Auth } from "../../src/modules/auth";
import * as nock from "nock";

describe("User module + User object", () => {
  const accessTokenMock = jest.fn().mockResolvedValue("some-access-token");
  const auth = new Auth({
    accessToken: accessTokenMock,
    refreshToken: "some-refresh-token",
  });
  const apiCaller = new APICaller(auth, true);
  const userModule = new UserModule(apiCaller);

  const WELCOME_API_BASE_URL = "https://api.cmp.optimizely.com/v3";
  const tokenGetParam = { user: "123" };

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  const wireUser = () => ({
    id: "u1",
    first_name: "Ada",
    last_name: "Lovelace",
    full_name: "Ada Lovelace",
    email: "ada@example.com",
    links: {
      self: "https://api.cmp.optimizely.com/v3/users/u1",
    },
  });

  describe("getUserById", () => {
    it("returns a hydrated User with camelCased fields", async () => {
      const scope = nock(WELCOME_API_BASE_URL, {
        reqheaders: { authorization: "Bearer some-access-token" },
      })
        .get("/users/u1")
        .reply(200, wireUser());

      const user = await userModule.getUserById("u1", tokenGetParam);
      expect(scope.isDone()).toBe(true);
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe("u1");
      expect(user.firstName).toBe("Ada");
      expect(user.lastName).toBe("Lovelace");
      expect(user.fullName).toBe("Ada Lovelace");
      expect(user.email).toBe("ada@example.com");
    });

    it("preserves null email (nullable per spec)", async () => {
      const wire = wireUser();
      (wire as any).email = null;
      nock(WELCOME_API_BASE_URL).get("/users/u1").reply(200, wire);

      const user = await userModule.getUserById("u1", tokenGetParam);
      expect(user.email).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("hits /users?email=... and returns a User", async () => {
      nock(WELCOME_API_BASE_URL)
        .get("/users?email=ada%40example.com")
        .reply(200, wireUser());
      const user = await userModule.getUserByEmail(
        "ada%40example.com",
        tokenGetParam
      );
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe("u1");
    });
  });

  describe("User object", () => {
    it("getRelatedLinks returns the links object", async () => {
      nock(WELCOME_API_BASE_URL).get("/users/u1").reply(200, wireUser());
      const user = await userModule.getUserById("u1", tokenGetParam);
      expect(user.getRelatedLinks()).toEqual({
        self: "https://api.cmp.optimizely.com/v3/users/u1",
      });
    });

    it("toJSON does not include the links field", async () => {
      nock(WELCOME_API_BASE_URL).get("/users/u1").reply(200, wireUser());
      const user = await userModule.getUserById("u1", tokenGetParam);
      const json = user.toJSON() as any;
      expect(json).toEqual({
        id: "u1",
        firstName: "Ada",
        lastName: "Lovelace",
        fullName: "Ada Lovelace",
        email: "ada@example.com",
      });
      expect(json).not.toHaveProperty("links");
    });
  });
});

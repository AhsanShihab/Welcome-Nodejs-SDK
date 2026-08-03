import { Unauthorized } from "../../src/errors";
import { Auth } from "../../src/modules/auth";
import * as nock from "nock";
import * as https from "https";

describe("Auth module", () => {
  describe("tokens", () => {
    it("should return access and refresh tokens if the tokens are provided as string", async () => {
      const auth = new Auth({
        accessToken: "access-token-123",
        refreshToken: "refresh-token-567",
      });
      expect(await auth.getAccessToken()).toBe("access-token-123");
      expect(await auth.getRefreshToken()).toBe("refresh-token-567");
    });

    it("should return access and refresh tokens if the tokens are provided as function", async () => {
      const accessToken = jest
        .fn()
        .mockResolvedValue("access-token-from-a-function-call");
      const refreshToken = jest
        .fn()
        .mockResolvedValue("refresh-token-from-a-function-call");
      const auth = new Auth({
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
      expect(await auth.getAccessToken()).toBe(
        "access-token-from-a-function-call"
      );
      expect(accessToken).toBeCalledTimes(1);
      expect(await auth.getRefreshToken()).toBe(
        "refresh-token-from-a-function-call"
      );
      expect(refreshToken).toBeCalledTimes(1);
    });
  });

  describe("initiateOAuth", () => {
    it("should throw error if clientId, clientSecret or redirectUri is missing", () => {
      const authWithMissingClientId = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientSecret: "client-secret",
        redirectUri: "https://www.myapp.com/oauth/callback",
      });
      const authWithMissingClientSecret = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientId: "client-id",
        redirectUri: "https://www.myapp.com/oauth/callback",
      });
      const authWithMissingRedirect = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientId: "client-id",
        clientSecret: "client-secret",
      });
      const redirectFn = jest.fn();

      const toThrowForMissingClientId = () =>
        authWithMissingClientId.initiateOAuth(redirectFn);
      const toThrowForMissingClientSecret = () =>
        authWithMissingClientSecret.initiateOAuth(redirectFn);
      const toThrowForMissingRedirect = () =>
        authWithMissingRedirect.initiateOAuth(redirectFn);

      const expectedError = new Error(
        "Cannot initiate authorization because 'clientId', 'clientSecret' or 'redirectUri' is missing"
      );
      expect(toThrowForMissingClientId).toThrow(expectedError);
      expect(toThrowForMissingClientSecret).toThrow(expectedError);
      expect(toThrowForMissingRedirect).toThrow(expectedError);
      expect(redirectFn).not.toBeCalled();
    });

    it("should call the provided redirect function with the right url", () => {
      const redirectFn = jest.fn();
      const expectedUrl =
        "https://accounts.cmp.optimizely.com/o/oauth2/v1/auth?client_id=123-456-ghi-jkl&redirect_uri=https://www.myapp.com/oauth/callback&response_type=code&scope=openid%20profile%20offline_access";
      const auth = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientId: "123-456-ghi-jkl",
        clientSecret: "789-123-abc-def",
        redirectUri: "https://www.myapp.com/oauth/callback",
      });

      auth.initiateOAuth(redirectFn);
      expect(redirectFn).toBeCalledTimes(1);
      expect(redirectFn).toBeCalledWith(expectedUrl);
    });
  });

  describe("handleOAuthCallback", () => {
    let oldEnv = process.env;

    beforeAll(() => {
      process.env.WELCOME_CLIENT_ID = "123";
      process.env.WELCOME_CLIENT_SECRET = "456";
    });

    afterAll(() => {
      delete process.env.WELCOME_CLIENT_ID;
      delete process.env.WELCOME_CLIENT_SECRET;
    });

    it("should call onAuthFailure if code is missing", async () => {
      const onAuthFailure = jest.fn();
      const auth = new Auth({
        accessToken: "123",
        refreshToken: "456",
        redirectUri: "https://www.myapp.com/oauth/callback",
        onAuthFailure,
      });
      await auth.handleOAuthCallback({});
      expect(onAuthFailure).toBeCalledWith("Missing 'code' in the query param");

      await auth.handleOAuthCallback({ error: "Denied by user" });
      expect(onAuthFailure).toBeCalledWith("Denied by user");
    });

    it("should throw error if onAuthFailure is missing and code is missing", async () => {
      const auth = new Auth({
        accessToken: "123",
        refreshToken: "456",
        redirectUri: "https://www.myapp.com/oauth/callback",
      });
      const expectedError = new Error("Missing 'code' in the query param");
      await expect(auth.handleOAuthCallback({})).rejects.toEqual(expectedError);
    });

    it("should throw error if onAuthSuccess is missing", async () => {
      const auth = new Auth({
        accessToken: "123",
        refreshToken: "456",
        redirectUri: "https://www.myapp.com/oauth/callback",
      });
      const expectedError = new Error(
        "'onAuthSuccess' was not provided. Please provide the 'onAuthSuccess' function"
      );
      await expect(
        auth.handleOAuthCallback({ code: "123-456" })
      ).rejects.toEqual(expectedError);
    });

    it("should call onAuthSuccess with proper data", async () => {
      const scope = nock("https://accounts.cmp.optimizely.com")
        .post("/o/oauth2/v1/token", {
          client_id: process.env.WELCOME_CLIENT_ID,
          client_secret: process.env.WELCOME_CLIENT_SECRET,
          code: "123-456",
          grant_type: "authorization_code",
          redirect_uri: "https://www.myapp.com/oauth/callback",
        })
        .reply(200, {
          access_token: "bd680785-b090-40ca-9a32-22df51e96e7a",
          refresh_token: "e053d83e-14e1-4ba4-b18e-ea654b39a02e",
          id_token: "some-jwt-token",
          expires_in: 3599,
          token_type: "Bearer",
        });

      const onAuthSuccess = jest.fn();
      const auth = new Auth({
        accessToken: "123",
        refreshToken: "456",
        redirectUri: "https://www.myapp.com/oauth/callback",
        onAuthSuccess: onAuthSuccess,
      });

      await auth.handleOAuthCallback({ code: "123-456" }, { foo: "bar" });
      expect(onAuthSuccess).toBeCalledWith(
        "bd680785-b090-40ca-9a32-22df51e96e7a",
        "e053d83e-14e1-4ba4-b18e-ea654b39a02e",
        { foo: "bar" }
      );
      expect(scope.isDone()).toBe(true);
    });
  });

  describe("initiateClientFlow", () => {
    let auth: Auth;
    const onAuthSuccess = jest.fn();
    const accessToken = "test-access-token";
    const refreshToken = "test-refresh-token";

    beforeAll(() => {
      nock('https://accounts.cmp.optimizely.com')
        .persist()
        .post("/o/oauth2/v1/token", {
          client_id: "test-client-id",
          client_secret: "test-client-secret",
          grant_type: "client_credentials"
        })
        .reply(200, {
          access_token: accessToken
        });
    });

    beforeEach(() => {
      auth = new Auth({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        accessToken: accessToken,
        refreshToken: refreshToken,
        onAuthSuccess: onAuthSuccess,
      });
    });

    afterAll(() => {
      nock.cleanAll();
    });

    it("should throw an error if 'onAuthSuccess' is not provided", async () => {
      const authWithoutSuccess = new Auth({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        accessToken: accessToken,
        refreshToken: refreshToken,
    });

      await expect(authWithoutSuccess.initiateClientFlow())
        .rejects.toThrow("'onAuthSuccess' was not provided. Please provide the 'onAuthSuccess' function");
    });

    it("should throw an error if 'clientId' or 'clientSecret' is missing", async () => {
      const missingIdandSecret = new Auth({
        accessToken: "1",
        refreshToken: "2",
        onAuthSuccess: onAuthSuccess,
      });
      const missingSecret = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientId: "test-client-secret",
        onAuthSuccess: onAuthSuccess,
      });
      const missingId = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientSecret: "test-client-secret",
        onAuthSuccess: onAuthSuccess,
      });
      await expect(missingIdandSecret.initiateClientFlow())
        .rejects.toThrow("Cannot get access token because 'clientId' or 'clientSecret' is missing");
      await expect(missingSecret.initiateClientFlow())
        .rejects.toThrow("Cannot get access token because 'clientId' or 'clientSecret' is missing");
      await expect(missingId.initiateClientFlow())
        .rejects.toThrow("Cannot get access token because 'clientId' or 'clientSecret' is missing");
    });

    it("should call 'onAuthSuccess' with access token", async () => {
      const tokenGetParam = { foo: "bar" };
      await auth.initiateClientFlow(tokenGetParam);
      expect(onAuthSuccess).toBeCalledWith(accessToken, tokenGetParam);
    });
  });

  describe("rotateTokens", () => {
    it("should throw error if clientId or clientSecret is missing", async () => {
      const authWithMissingClientId = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientSecret: "secret",
      });
      const authWithMissingClientSecret = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientId: "client-id-ajsfhla",
      });
      const expectedError = new Error(
        "Cannot refresh access token because 'clientId' or 'clientSecret' is missing"
      );
      await expect(authWithMissingClientId.rotateTokens()).rejects.toEqual(
        expectedError
      );
      await expect(authWithMissingClientSecret.rotateTokens()).rejects.toEqual(
        expectedError
      );
    });

    it("should throw error if receives error response from server", async () => {
      nock("https://accounts.cmp.optimizely.com")
        .post("/o/oauth2/v1/token", {
          client_id: "12345678-1234-1234-1234-123456789012",
          client_secret: "my-encrypted-secret-1234",
          refresh_token: "456",
          grant_type: "refresh_token",
        })
        .reply(401, {
          message: "invalid token",
        });

      const tokenChangeCallback = jest.fn();
      const auth = new Auth({
        accessToken: "123",
        refreshToken: "456",
        clientId: "12345678-1234-1234-1234-123456789012",
        clientSecret: "my-encrypted-secret-1234",
        redirectUri: "https://www.myapp.com/oauth/callback",
        tokenChangeCallback: tokenChangeCallback,
      });

      await expect(auth.rotateTokens({ foo: "bar" })).rejects.toEqual(
        new Unauthorized({ message: "invalid token" })
      );
    });

    it("should rotate the tokens", async () => {
      nock("https://accounts.cmp.optimizely.com")
        .post("/o/oauth2/v1/token", {
          client_id: "12345678-1234-1234-1234-123456789012",
          client_secret: "my-encrypted-secret-1234",
          refresh_token: "456",
          grant_type: "refresh_token",
        })
        .reply(200, {
          access_token: "bd680785-b090-40ca-9a32-22df51e96e7a",
          refresh_token: "e053d83e-14e1-4ba4-b18e-ea654b39a02e",
          id_token: "some-jwt-token",
          expires_in: 3599,
          token_type: "Bearer",
        });

      const tokenChangeCallback = jest.fn();
      const auth = new Auth({
        accessToken: "123",
        refreshToken: "456",
        clientId: "12345678-1234-1234-1234-123456789012",
        clientSecret: "my-encrypted-secret-1234",
        redirectUri: "https://www.myapp.com/oauth/callback",
        tokenChangeCallback: tokenChangeCallback,
      });

      await auth.rotateTokens({ foo: "bar" });
      expect(await auth.getAccessToken()).toBe(
        "bd680785-b090-40ca-9a32-22df51e96e7a"
      );
      expect(await auth.getRefreshToken()).toBe(
        "e053d83e-14e1-4ba4-b18e-ea654b39a02e"
      );
      expect(tokenChangeCallback).toBeCalledWith(
        "bd680785-b090-40ca-9a32-22df51e96e7a",
        "e053d83e-14e1-4ba4-b18e-ea654b39a02e",
        { foo: "bar" }
      );
    });
  });

  describe("revokeAccessToken", () => {
    it("should throw error if clientId or clientSecret is missing", async () => {
      const authWithMissingClientId = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientSecret: "secret",
      });
      const authWithMissingClientSecret = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientId: "client-id-ajsfhla",
      });
      const expectedError = new Error(
        "Cannot revoke access token because 'clientId' or 'clientSecret' is missing"
      );
      await expect(authWithMissingClientId.revokeAccessToken()).rejects.toEqual(
        expectedError
      );
      await expect(
        authWithMissingClientSecret.revokeAccessToken()
      ).rejects.toEqual(expectedError);
    });

    it("should revoke the access token", async () => {
      const scope = nock("https://accounts.cmp.optimizely.com")
        .post("/o/oauth2/v1/revoke", {
          token: "my-access-token",
          token_type_hint: "access_token",
          client_id: "12345678-1234-1234-1234-123456789012",
          client_secret: "my-encrypted-secret-1234",
        })
        .reply(200, {
          msg: "success",
        });

      const accessToken = jest.fn().mockResolvedValue("my-access-token");
      const tokenGetParam = { foo: "bar" };
      const auth = new Auth({
        accessToken: accessToken,
        refreshToken: "456",
        clientId: "12345678-1234-1234-1234-123456789012",
        clientSecret: "my-encrypted-secret-1234",
      });
      await auth.revokeAccessToken(tokenGetParam);
      expect(accessToken).toBeCalledWith(tokenGetParam);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe("revokeRefreshToken", () => {
    it("should throw error if clientId or clientSecret is missing", async () => {
      const authWithMissingClientId = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientSecret: "secret",
      });
      const authWithMissingClientSecret = new Auth({
        accessToken: "1",
        refreshToken: "2",
        clientId: "client-id-ajsfhla",
      });
      const expectedError = new Error(
        "Cannot revoke refresh token because 'clientId' or 'clientSecret' is missing"
      );
      await expect(authWithMissingClientId.revokeRefreshToken()).rejects.toEqual(
        expectedError
      );
      await expect(
        authWithMissingClientSecret.revokeRefreshToken()
      ).rejects.toEqual(expectedError);
    });

    it("should revoke the access token", async () => {
      const scope = nock("https://accounts.cmp.optimizely.com")
        .post("/o/oauth2/v1/revoke", {
          token: "my-refresh-token",
          token_type_hint: "refresh_token",
          client_id: "12345678-1234-1234-1234-123456789012",
          client_secret: "my-encrypted-secret-1234",
        })
        .reply(200, {
          msg: "success",
        });

      const refreshToken = jest.fn().mockResolvedValue("my-refresh-token");
      const tokenGetParam = { foo: "bar" };
      const auth = new Auth({
        accessToken: "123",
        refreshToken: refreshToken,
        clientId: "12345678-1234-1234-1234-123456789012",
        clientSecret: "my-encrypted-secret-1234",
      });
      await auth.revokeRefreshToken(tokenGetParam);
      expect(refreshToken).toBeCalledWith(tokenGetParam);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe("ssoBaseUrl with a custom port", () => {
    it("should pass the hostname without the port to the request options", async () => {
      const requestSpy = jest.spyOn(https, "request");
      const scope = nock("https://accounts.cmp-localdev.optimizely.com:4443")
        .post("/o/oauth2/v1/revoke")
        .reply(200, { msg: "success" });

      const auth = new Auth({
        accessToken: "my-access-token",
        refreshToken: "456",
        clientId: "12345678-1234-1234-1234-123456789012",
        clientSecret: "my-encrypted-secret-1234",
        ssoBaseUrl: "https://accounts.cmp-localdev.optimizely.com:4443",
      });
      await auth.revokeAccessToken();

      expect(requestSpy).toBeCalledWith(
        expect.objectContaining({
          hostname: "accounts.cmp-localdev.optimizely.com",
          port: "4443",
        }),
        expect.any(Function)
      );
      expect(scope.isDone()).toBe(true);
      requestSpy.mockRestore();
    });
  });
});

import { request, RequestOptions } from "https";
import {
  BadRequest,
  ErrorResponseBody,
  Forbidden,
  NotFound,
  Unauthorized,
  UnprocessableEntity,
} from "../../errors";

const OAUTH_PATH = "/o/oauth2/v1";

enum GrantType {
  AUTHORIZATION_CODE = "authorization_code",
  CLIENT_CREDENTIALS = "client_credentials",
  REFRESH_TOKEN = "refresh_token",
}
interface AuthConstructorParam {
  accessToken: string | ((tokenGetParam?: any) => string | Promise<string>);
  refreshToken: string | ((tokenGetParam?: any) => string | Promise<string>);
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  ssoBaseUrl?: string;
  onAuthSuccess?: (
    accessToken: string,
    refreshToken?: string,
    tokenGetParam?: any
  ) => any;
  onAuthFailure?: (error: string, ...args: any) => any;
  tokenChangeCallback?: (
    accessToken: string,
    refreshToken: string,
    tokenGetParam?: any
  ) => any;
}

interface CodeTokenRequestPayload {
  grant_type: GrantType.AUTHORIZATION_CODE;
  client_id: string;
  client_secret: string;
  code: string;
  redirect_uri: string;
}

interface ClientTokenRequestPayload {
  grant_type: GrantType.CLIENT_CREDENTIALS;
  client_id: string;
  client_secret: string;
}

interface TokenRotatePayload {
  grant_type: GrantType.REFRESH_TOKEN;
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

interface TokenRevokPayload {
  token: string;
  token_type_hint: "access_token" | "refresh_token";
  client_id: string;
  client_secret: string;
}

export class Auth {
  #accessToken: string | ((tokenGetParam?: any) => string | Promise<string>);
  #refreshToken: string | ((tokenGetParam?: any) => string | Promise<string>);
  #clientId: string | undefined;
  #clientSecret: string | undefined;
  #redirectUri: string | undefined;
  #onAuthSuccess?: (accessToken: string, refreshToken?: string, tokenGetParam?: any) => any;
  #onAuthFailure?: (error: string) => any;
  #tokenChangeCallback?: (accessToken: string, refreshToken: string, tokenGetParam?: any) => any;
  #ssoBaseUrl: string;

  constructor(param: AuthConstructorParam) {
    this.#accessToken = param.accessToken;
    this.#refreshToken = param.refreshToken;
    this.#clientId = param.clientId || process.env.CMP_CLIENT_ID || process.env.WELCOME_CLIENT_ID;
    this.#clientSecret = param.clientSecret || process.env.CMP_CLIENT_SECRET || process.env.WELCOME_CLIENT_SECRET;
    this.#redirectUri = param.redirectUri;
    this.#ssoBaseUrl = (param.ssoBaseUrl || "https://accounts.cmp.optimizely.com").replace(/\/+$/, "");
    this.#onAuthFailure = param.onAuthFailure;
    this.#onAuthSuccess = param.onAuthSuccess;
    this.#tokenChangeCallback = param.tokenChangeCallback;
  }

  async getAccessToken(tokenGetParam?: any) {
    if (typeof this.#accessToken === "function") {
      return this.#accessToken(tokenGetParam);
    }
    return this.#accessToken;
  }

  async getRefreshToken(tokenGetParam?: any) {
    if (typeof this.#refreshToken === "function") {
      return this.#refreshToken(tokenGetParam);
    }
    return this.#refreshToken;
  }

  #formError(body: ErrorResponseBody, code?: number) {
    if (code === 400) {
      return new BadRequest(body);
    }
    if (code === 401) {
      return new Unauthorized(body);
    }
    if (code === 403) {
      return new Forbidden(body);
    }
    if (code === 404) {
      return new NotFound(body);
    }
    if (code === 422) {
      return new UnprocessableEntity(body);
    }
    return new Error(body.message);
  }

  #post(
    endpoint: "/token",
    payload: CodeTokenRequestPayload | ClientTokenRequestPayload | TokenRotatePayload
  ): Promise<{ access_token: string; refresh_token?: string }>;
  #post(
    endpoint: "/revoke",
    payload: TokenRevokPayload
  ): Promise<{ msg: string }>;
  async #post(endpoint: string, payload: any) {
    const url = new URL(this.#ssoBaseUrl + OAUTH_PATH + endpoint);

    const payloadStringified = JSON.stringify(payload);
    const options: RequestOptions = {
      host: url.host,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payloadStringified.length,
      },
    };

    return new Promise((resolve, reject) => {
      const req = request(options, (res) => {
        let data = "";
        const statusCode = res.statusCode;

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          let responseBody = {};
          if (data) {
            try {
              responseBody = JSON.parse(data);
            } catch {}
          }
          if (statusCode && statusCode < 299) {
            resolve(responseBody);
          } else {
            reject(
              this.#formError(responseBody as ErrorResponseBody, statusCode)
            );
          }
        });
      }).on("error", (err) => {
        reject(err.message);
      });

      req.write(payloadStringified);
      req.end();
    });
  }

  initiateOAuth(redirectFn: (url: string) => void) {
    if (!this.#clientId || !this.#clientSecret || !this.#redirectUri) {
      throw new Error(
        "Cannot initiate authorization because 'clientId', 'clientSecret' or 'redirectUri' is missing"
      );
    }
    const url = `${this.#ssoBaseUrl}${OAUTH_PATH}/auth?client_id=${this.#clientId}&redirect_uri=${this.#redirectUri}&response_type=code&scope=openid%20profile%20offline_access`;
    redirectFn(url);
  }

  async handleOAuthCallback(query: {[key: string]: string}, tokenGetParam?: any) {
    const { code } = query;
    if (!code) {
      const errorMsg = query.error || "Missing 'code' in the query param";
      if (!this.#onAuthFailure) {
        throw new Error(errorMsg);
      }
      return this.#onAuthFailure(errorMsg);
    } else {
      if (!this.#onAuthSuccess) {
        throw new Error(
          "'onAuthSuccess' was not provided. Please provide the 'onAuthSuccess' function"
        );
      }
      const payload: CodeTokenRequestPayload = {
        client_id: this.#clientId!,
        client_secret: this.#clientSecret!,
        code: code,
        grant_type: GrantType.AUTHORIZATION_CODE,
        redirect_uri: this.#redirectUri!,
      };
      const result = await this.#post("/token", payload);
      const { access_token: accessToken, refresh_token: refreshToken } = result;
      return this.#onAuthSuccess(accessToken, refreshToken, tokenGetParam);
    }
  }

  async initiateClientFlow(tokenGetParam?: any) {
    if (!this.#onAuthSuccess) {
      throw new Error(
        "'onAuthSuccess' was not provided. Please provide the 'onAuthSuccess' function"
      );
    }
    if (!this.#clientId || !this.#clientSecret) {
      throw new Error(
        "Cannot get access token because 'clientId' or 'clientSecret' is missing"
      );
    }
    const payload: ClientTokenRequestPayload = {
      client_id: this.#clientId!,
      client_secret: this.#clientSecret!,
      grant_type: GrantType.CLIENT_CREDENTIALS
    };
    try {
      const result = await this.#post("/token", payload);
      const { access_token: accessToken } = result;
      return this.#onAuthSuccess(accessToken, tokenGetParam);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? `Failed to get access token: ${err.message}` : "Failed to get access token";
      if (!this.#onAuthFailure) {
        throw new Error(errorMessage);
      }
      return this.#onAuthFailure(errorMessage);
    }
  }

  async rotateTokens(tokenGetParam?: any) {
    if (!this.#clientId || !this.#clientSecret) {
      throw new Error(
        "Cannot refresh access token because 'clientId' or 'clientSecret' is missing"
      );
    }
    const oldRefreshToken = await this.getRefreshToken(tokenGetParam);
    if (!oldRefreshToken) {
      throw new Error(
        "Cannot refresh access token because the refresh token is missing"
      );
    }
    const payload: TokenRotatePayload = {
      client_id: this.#clientId,
      client_secret: this.#clientSecret,
      refresh_token: oldRefreshToken,
      grant_type: GrantType.REFRESH_TOKEN,
    };
    const result = await this.#post("/token", payload);
    const { access_token: accessToken, refresh_token: refreshToken } = result;
    if (!refreshToken) {
      throw new Error(
        "Error generating new access token."
      );
    }
    if (typeof this.#accessToken === "string") {
      this.#accessToken = accessToken;
    }
    if (typeof this.#refreshToken === "string") {
      this.#refreshToken = refreshToken;
    }
    if (this.#tokenChangeCallback) {
      return this.#tokenChangeCallback(accessToken, refreshToken, tokenGetParam);
    }
  }

  async revokeAccessToken(tokenGetParam?: any) {
    if (!this.#clientId || !this.#clientSecret) {
      throw new Error(
        "Cannot revoke access token because 'clientId' or 'clientSecret' is missing"
      );
    }
    const payload: TokenRevokPayload = {
      token: await this.getAccessToken(tokenGetParam),
      token_type_hint: "access_token",
      client_id: this.#clientId,
      client_secret: this.#clientSecret,
    };
    await this.#post("/revoke", payload);
  }

  async revokeRefreshToken(tokenGetParam?: any) {
    if (!this.#clientId || !this.#clientSecret) {
      throw new Error(
        "Cannot revoke refresh token because 'clientId' or 'clientSecret' is missing"
      );
    }
    const payload: TokenRevokPayload = {
      token: await this.getRefreshToken(tokenGetParam),
      token_type_hint: "refresh_token",
      client_id: this.#clientId,
      client_secret: this.#clientSecret,
    };
    await this.#post("/revoke", payload);
  }
}

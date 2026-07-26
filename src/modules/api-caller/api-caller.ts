import { request, RequestOptions } from "https";
import { Auth } from "../auth";
import {
  convertObjectKeysToCamelCase,
  convertObjectKeysToSnakeCase,
} from "../../util";
import {
  ErrorResponseBody,
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  UnprocessableEntity,
} from "../../errors";

export class APICaller {
  #shouldRetry: boolean;
  #auth: Auth;
  #shouldConvertObjectKeyCase: boolean;

  #apiBaseUrl: string;
  #apiVersion = "v3";

  constructor(
    auth: Auth,
    enableAutoRetry: boolean,
    shouldConvertObjectKeyCase: boolean = true,
    apiBaseUrl: string = "https://api.cmp.optimizely.com"
  ) {
    this.#auth = auth;
    this.#shouldRetry = enableAutoRetry;
    this.#shouldConvertObjectKeyCase = shouldConvertObjectKeyCase;
    this.#apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
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

  async #sendRequest(
    endpoint: string,
    tokenGetParam: any,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    payload: any = {},
    isRetry: boolean = false
  ) {
    let url: URL;
    if (endpoint.startsWith("https")) {
      url = new URL(endpoint);
    } else {
      url = new URL(this.#apiBaseUrl + "/" + this.#apiVersion + endpoint);
    }
    const payloadStringified = JSON.stringify(
      this.#shouldConvertObjectKeyCase
        ? convertObjectKeysToSnakeCase(payload)
        : payload
    );
    const options: RequestOptions = {
      host: url.host,
      path: url.pathname + url.search,
      port: url.port,
      method: method,
      headers: {
        Authorization: `Bearer ${await this.#auth.getAccessToken(
          tokenGetParam
        )}`,
      },
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json",
        "Content-Length": payloadStringified.length,
      };
    }

    return new Promise((resolve, reject) => {
      const req = request(options, (res) => {
        let data = "";
        const statusCode = res.statusCode;

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", async () => {
          let responseBody = {};
          if (data) {
            responseBody = JSON.parse(data);
          }

          responseBody = this.#shouldConvertObjectKeyCase
            ? convertObjectKeysToCamelCase(responseBody)
            : responseBody;
          if (statusCode && statusCode < 299) {
            resolve(responseBody);
            return;
          }
          if (statusCode === 302) {
            const redirectTo = res.headers.location;
            const dataFromRedirected = await this.#sendRequest(
              redirectTo!,
              tokenGetParam
            );
            resolve(dataFromRedirected);
            return;
          }
          if (statusCode == 401 && this.#shouldRetry && !isRetry) {
            await this.#auth.rotateTokens(tokenGetParam);
            try {
              const res = await this.#sendRequest(
                endpoint,
                tokenGetParam,
                method,
                payload,
                true
              );
              resolve(res);
              return;
            } catch (err) {
              reject(err);
              return;
            }
          }
          reject(
            this.#formError(responseBody as ErrorResponseBody, statusCode)
          );
          return;
        });
      }).on("error", (err) => {
        reject(err.message);
      });

      if (["POST", "PUT", "PATCH"].includes(method)) {
        req.write(payloadStringified);
      }
      req.end();
    });
  }

  async get(endpoint: string, tokenGetParam?: any) {
    return this.#sendRequest(endpoint, tokenGetParam);
  }

  async post(endpoint: string, payload: any, tokenGetParam?: any) {
    return this.#sendRequest(endpoint, tokenGetParam, "POST", payload);
  }

  async patch(endpoint: string, payload: any, tokenGetParam?: any) {
    return this.#sendRequest(endpoint, tokenGetParam, "PATCH", payload);
  }

  async put(endpoint: string, payload: any, tokenGetParam?: any) {
    return this.#sendRequest(endpoint, tokenGetParam, "PUT", payload);
  }

  async delete(endpoint: string, tokenGetParam?: any) {
    await this.#sendRequest(endpoint, tokenGetParam, "DELETE");
    return null;
  }
}

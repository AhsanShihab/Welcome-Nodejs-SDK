# ApiCaller

The `ApiCaller` module is useful if you want to extend the `CmpClient` class with your own custom modules. `ApiCaller` module takes care of making the network call to _Welcome_ Open API server with the access token.

You can import the `ApiCaller` class from `"@welcomesoftware/cmp-sdk/lib/modules/api-caller"`.

The constructor of the `ApiCaller` class takes four parameters. First one is the instance of the `Auth` module. The second parameter is a boolean value. If its set to `true` then when an API call gets 401 status code in the response, it will try to refresh the access token with the current refresh token and try the request again. If the second call also gets the same response, it will raise Unauthorized [Error](../errors/README.md).

The third parameter is also a boolean value which is set to `true` as default value. _Welcome_ API server expects payload object keys in snake case and sends response object with snake case keys. In JavaScript, the usual convention is to use camel case. If the third parameter is `true`, `ApiCaller` module converts payload object keys to snake case and response object keys to camel case. If its `false`, the ApiCaller module does not do any conversion.

The fourth parameter, `apiBaseUrl`, is an optional string that overrides the base URL of the _Welcome_ API server. Provide it to point the SDK at a non-default address (for example, a proxy server). A trailing slash, if present, is stripped. Default: `"https://api.cmp.optimizely.com"`.

```javascript
import { CmpClient } from "@welcomesoftware/cmp-sdk";
import { APICaller } from '@welcomesoftware/cmp-sdk/lib/modules/api-caller';

class ExtendedCmpClient extends CmpClient {
  constructor(params) {
    super(params)
    const apiCaller = new APICaller(this.auth, params.enableAutoRetry, false);
    ...
  }
}
```

The module provides the following methods.

## `get`

**_parameters:_**

- endpoint: string
- tokenGetParam: any (optional)

**_returns:_** Promise< object >

the `endpont` can be relative endpoint or full url.

## `post`

**_parameters:_**

- endpoint: string
- payload: any (object)
- tokenGetParam: any (optional)

**_returns:_** Promise< object >

the `endpont` can be relative endpoint or full url.


## `patch`

- endpoint: string
- payload: any (object)
- tokenGetParam: any (optional)

**_returns:_** Promise< object >

the `endpont` can be relative endpoint or full url.


## `put`

- endpoint: string
- payload: any (object)
- tokenGetParam: any (optional)

**_returns:_** Promise< object >

the `endpont` can be relative endpoint or full url.


## `delete`

- endpoint: string
- tokenGetParam: any (optional)

**_returns:_** Promise< null >

the `endpont` can be relative endpoint or full url.
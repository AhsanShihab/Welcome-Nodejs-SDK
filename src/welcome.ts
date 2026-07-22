import { Auth } from "./modules/auth";
import { APICaller } from "./modules/api-caller";
import { Campaign } from "./modules/campaign";
import { Label } from "./modules/label";
import { Library } from "./modules/library";
import { User } from "./modules/user";
import { Uploader } from "./modules/uploader";
import { Task } from "./modules/task";
import { Publishing } from "./modules/publishing";

export interface CmpClientConstructorParam {
  accessToken: string | ((tokenGetParam?: any) => string | Promise<string>);
  refreshToken: string | ((tokenGetParam?: any) => string | Promise<string>);
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  onAuthSuccess?: (
    accessToken: string,
    refreshToken?: string,
    tokenGetParam?: any
  ) => any;
  onAuthFailure?: (error: string) => any;
  tokenChangeCallback?: (
    accessToken: string,
    refreshToken: string,
    tokenGetParam?: any
  ) => any;
  enableAutoRetry?: boolean;
  apiBaseUrl?: string;
  ssoBaseUrl?: string;
}

export class CmpClient {
  auth: Auth;
  label: Label;
  campaign: Campaign;
  user: User;
  uploader: Uploader;
  task: Task;
  library: Library;
  publishing: Publishing;

  constructor(param: CmpClientConstructorParam) {
    this.auth = new Auth({
      accessToken: param.accessToken,
      refreshToken: param.refreshToken,
      clientId: param.clientId,
      clientSecret: param.clientSecret,
      redirectUri: param.redirectUri,
      ssoBaseUrl: param.ssoBaseUrl,
      onAuthFailure: param.onAuthFailure,
      onAuthSuccess: param.onAuthSuccess,
      tokenChangeCallback: param.tokenChangeCallback,
    });

    const apiCaller = new APICaller(this.auth, param.enableAutoRetry || false, true, param.apiBaseUrl);
    this.label = new Label(apiCaller);
    this.campaign = new Campaign(apiCaller);
    this.user = new User(apiCaller);
    this.uploader = new Uploader(apiCaller);
    this.task = new Task(apiCaller);
    this.library = new Library(apiCaller);
    this.publishing = new Publishing(apiCaller);
  }
}

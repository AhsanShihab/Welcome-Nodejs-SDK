import { APICaller } from "../api-caller";
import { User as UserModel } from "../../objects/user";

export class User {
  #apiCaller: APICaller;

  constructor(apiCaller: APICaller) {
    this.#apiCaller = apiCaller;
  }

  async getUserById(userId: string, tokenGetParam?: any) {
    const userData: any = await this.#apiCaller.get(
      "/users/" + userId,
      tokenGetParam
    );
    const user = new UserModel(userData, this.#apiCaller, tokenGetParam);
    return user;
  }

  async getUserByEmail(email: string, tokenGetParam?: any) {
    const userData: any = await this.#apiCaller.get(
      "/users?email=" + email,
      tokenGetParam
    );
    const user = new UserModel(userData, this.#apiCaller, tokenGetParam);
    return user;
  }
}

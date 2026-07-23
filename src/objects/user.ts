import { Resource } from "./resource";

export interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  links: {
    self: string;
  };
}

export interface User extends Omit<UserData, "links"> {}
export class User extends Resource<UserData> {}

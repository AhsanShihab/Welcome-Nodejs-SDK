import { Resource } from "../resource";
import { LibraryVideoData, ILibraryVideo } from "./types";

export interface LibraryVideo extends ILibraryVideo {}
export class LibraryVideo
  extends Resource<LibraryVideoData>
  implements ILibraryVideo
{
  static dateFields = ["createdAt", "modifiedAt", "expiresAt"] as const;
}

import { Resource } from "../resource";
import { LibraryImageData, ILibraryImage } from "./types";

export interface LibraryImage extends ILibraryImage {}
export class LibraryImage
  extends Resource<LibraryImageData>
  implements ILibraryImage
{
  static dateFields = ["createdAt", "modifiedAt", "expiresAt"] as const;
}

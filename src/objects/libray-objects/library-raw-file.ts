import { Resource } from "../resource";
import { LibraryRawFileData, ILibraryRawFile } from "./types";

export interface LibraryRawFile extends ILibraryRawFile {}
export class LibraryRawFile
  extends Resource<LibraryRawFileData>
  implements ILibraryRawFile
{
  static dateFields = ["createdAt", "modifiedAt", "expiresAt"] as const;
}

import { Resource } from "../resource";
import { LibraryAssetVersionData, ILibraryAssetVersion } from "./types";

export interface LibraryAssetVersion extends ILibraryAssetVersion {}
export class LibraryAssetVersion
  extends Resource<LibraryAssetVersionData>
  implements ILibraryAssetVersion
{
  static dateFields = ["createdAt"] as const;
}

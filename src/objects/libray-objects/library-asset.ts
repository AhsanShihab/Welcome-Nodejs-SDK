import { Resource } from "../resource";
import { LibraryAssetData, ILibraryAsset } from "./types";

export interface LibraryAsset extends ILibraryAsset {}
export class LibraryAsset
  extends Resource<LibraryAssetData>
  implements ILibraryAsset
{
  static dateFields = ["createdAt", "modifiedAt"] as const;
}

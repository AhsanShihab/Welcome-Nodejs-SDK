import { Resource, ResourceCtor } from "../resource";
import { FolderData, IFolder, IFolderList } from "./types";
// Type-only import breaks the runtime circular dep with folder-list.ts.
// The actual FolderList constructor is registered in `linkTargets` from
// libray-objects/index.ts after both modules have loaded.
import type { FolderList } from "./folder-list";

export interface Folder extends Omit<IFolder, "getChildFolders" | "getParentFolder" | "getRelatedLinks"> {}
export class Folder extends Resource<FolderData> implements IFolder {
  static dateFields = ["createdAt", "modifiedAt"] as const;
  static linkTargets: Record<string, ResourceCtor> = { parentFolder: Folder };

  // `links.parent_folder` is `string | null` per spec (nullable).
  async getParentFolder(): Promise<Folder | null> {
    return this._follow<Folder>("parentFolder");
  }

  // `links.child_folders` is required non-nullable per spec.
  async getChildFolders(): Promise<IFolderList> {
    return this._followRequired<FolderList>("childFolders");
  }
}

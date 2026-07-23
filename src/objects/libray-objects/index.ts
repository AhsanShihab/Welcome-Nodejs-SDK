import { Folder } from "./folder";
import { FolderList } from "./folder-list";

// Register FolderList as the linkTarget for `childFolders` after both modules
// have loaded. folder.ts imports FolderList as a type only, so there's no
// runtime circular-dep hazard.
Folder.linkTargets.childFolders = FolderList;

export { Folder, FolderList };
export { LibraryArticle } from "./library-article";
export { LibraryAsset } from "./library-asset";
export { LibraryAssetList } from "./library-asset-list";
export { LibraryImage } from "./library-image";
export { LibraryRawFile } from "./library-raw-file";
export { LibraryVideo } from "./library-video";
export { LibraryAssetVersion } from "./library-asset-version";

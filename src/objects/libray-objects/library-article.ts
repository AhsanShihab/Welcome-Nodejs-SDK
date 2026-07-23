import { Resource } from "../resource";
import { LibraryArticleData, ILibraryArticle } from "./types";

export interface LibraryArticle extends ILibraryArticle {}
export class LibraryArticle
  extends Resource<LibraryArticleData>
  implements ILibraryArticle
{
  static dateFields = ["createdAt", "modifiedAt", "expiresAt"] as const;
}

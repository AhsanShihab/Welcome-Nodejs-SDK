import { Resource } from "./resource";
import { LabelResponse } from "./common/types";

interface Common {
  id: string;
  title: string;
  htmlBody: string;
  url: string | null;
  labels: LabelResponse[];
}

export interface TaskArticleData extends Common {
  createdAt: string;
  modifiedAt: string;
  links: {
    self: string;
    task: string;
    drafts: string | null;
    webUrls: {
      self: string;
      task: string;
      drafts: null;
    };
  };
}

export interface TaskArticle extends Common {
  createdAt: Date;
  modifiedAt: Date;
}
export class TaskArticle extends Resource<TaskArticleData> {
  static dateFields = ["createdAt", "modifiedAt"] as const;
}

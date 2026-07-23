import { Resource } from "./resource";
import { LabelResponse } from "./common/types";

interface Common {
  id: string;
  title: string;
  mimeType: string;
  labels: LabelResponse[];
}

export interface TaskAssetBaseData extends Common {
  createdAt: string;
  modifiedAt: string;
  links: {
    self: string;
    task: string;
    drafts: string | null;
    webUrls: {
      self: string;
      task: string;
      drafts: string | null;
    };
  };
}

export interface TaskAssetBase extends Common {
  createdAt: Date;
  modifiedAt: Date;
}
export class TaskAssetBase extends Resource<TaskAssetBaseData> {
  static dateFields = ["createdAt", "modifiedAt"] as const;
}

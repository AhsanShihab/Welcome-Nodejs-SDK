import { TaskAssetBase, TaskAssetBaseData } from "./base-task-asset";
import { UploadedFile } from "./uploaded-file";

interface CommentCreatePayload {
  value: string;
  attachments?: UploadedFile[];
}

interface Extra {
  type: "article" | "image" | "video" | "raw_file" | "structured_content";
  content: {
    type: "url" | "api_url" | "html_body";
    value: string;
  };
}

export interface TaskAssetData extends TaskAssetBaseData, Extra {}
export interface TaskAsset extends Extra {}
export class TaskAsset extends TaskAssetBase {
  // `links.drafts` is `string | null` per spec. addDraft can only succeed for
  // asset types where the API allows drafts (i.e. link is non-null).
  async addDraft(uploadedFile: UploadedFile) {
    const url = this._resolveLinkUrl("drafts");
    if (url === null) {
      throw new Error("Cannot post draft for this task asset");
    }
    return this._apiCaller.post(
      url,
      { key: uploadedFile.key, title: uploadedFile.title },
      this._tokenGetParam
    );
  }

  // The comments endpoint is derived from `links.task` (required, non-nullable)
  // rather than being a top-level link on the task asset itself.
  async getComments() {
    const taskUrl = this._resolveLinkUrl("task");
    if (taskUrl === null) {
      throw new Error(
        "TaskAsset: cannot fetch comments — 'task' link is null"
      );
    }
    return this._apiCaller.get(
      `${taskUrl}/assets/${this.id}/comments`,
      this._tokenGetParam
    );
  }

  async addComment(comment: CommentCreatePayload) {
    const taskUrl = this._resolveLinkUrl("task");
    if (taskUrl === null) {
      throw new Error(
        "TaskAsset: cannot post comment — 'task' link is null"
      );
    }
    return this._apiCaller.post(
      `${taskUrl}/assets/${this.id}/comments`,
      comment,
      this._tokenGetParam
    );
  }
}

import { Resource, ResourceCtor } from "./resource";
import { TaskStep, TaskStepData } from "./task-step";
import { TaskBrief } from "./task-brief";
import { CustomFieldList } from "./custom-field-list";
import { TaskAsset } from "./task-generic-asset";
import { TaskAssetList } from "./task-asset-list";
import { UploadedFile } from "./uploaded-file";
import { AttachmentList } from "./attachment-list";
import { Campaign } from "./campaign";
import { LabelResponse, LabelPayload, PaginationOption } from "./common/types";

interface Common {
  id: string;
  title: string;
  isCompleted: boolean;
  isArchived: boolean;
  referenceId: string;
  labels: LabelResponse[];
}

export interface TaskData extends Common {
  startAt: string | null;
  dueAt: string | null;
  steps: TaskStepData[];
  links: {
    self: string;
    assets: string;
    attachments: string;
    brief: string | null;
    campaign: string;
    customFields: string | null;
    webUrls: {
      self: string;
      brief: string;
    };
  };
}

export interface Task extends Common {
  startAt: Date | null;
  dueAt: Date | null;
  steps: TaskStep[];
}
export class Task extends Resource<TaskData> {
  static dateFields = ["startAt", "dueAt"] as const;
  static nested: Record<string, ResourceCtor> = { steps: TaskStep };
  static linkTargets: Record<string, ResourceCtor> = {
    brief: TaskBrief,
    campaign: Campaign,
  };
  static listLinkTargets: Record<string, ResourceCtor> = {
    customFields: CustomFieldList,
    assets: TaskAssetList,
    attachments: AttachmentList,
  };

  async update(payload: { labels: LabelPayload[] }) {
    await this._updateSelf(payload);
  }

  // `links.brief` is `string | null` per spec (nullable).
  async getBrief(): Promise<TaskBrief | null> {
    return this._follow<TaskBrief>("brief");
  }

  // `links.campaign` is required non-nullable per spec.
  async getCampaign(): Promise<Campaign> {
    return this._followRequired<Campaign>("campaign");
  }

  // `links.customFields` is `string | null` per spec (nullable).
  async getCustomFields(
    option: PaginationOption = {}
  ): Promise<CustomFieldList | null> {
    return this._followList<CustomFieldList>("customFields", option);
  }

  // `links.assets` is required non-nullable per spec.
  async getAssets(option: PaginationOption = {}): Promise<TaskAssetList> {
    return this._followListRequired<TaskAssetList>("assets", option);
  }

  async addAsset(uploadedFile: UploadedFile): Promise<TaskAsset> {
    return this._postToLink<TaskAsset>(
      "assets",
      { key: uploadedFile.key, title: uploadedFile.title },
      TaskAsset as ResourceCtor<TaskAsset>
    );
  }

  // `links.attachments` is required non-nullable per spec.
  async getAttachments(option: PaginationOption = {}): Promise<AttachmentList> {
    return this._followListRequired<AttachmentList>("attachments", option);
  }
}


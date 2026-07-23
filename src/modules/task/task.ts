import { APICaller } from "../api-caller";
import { buildQueryString } from "../../util";
import { UploadedFile } from "../../objects/uploaded-file";
import { Task as TaskObject, TaskData } from "../../objects/task";
import { TaskBrief, TaskBriefData } from "../../objects/task-brief";
import {
  CustomFieldList,
  CustomFieldListData,
} from "../../objects/custom-field-list";
import { CustomField, CustomFieldData } from "../../objects/custom-field";
import { TaskSubStep, TaskSubStepData } from "../../objects/task-substep";
import { ExternalWork, ExternalWorkData } from "../../objects/external-work";
import { TaskAsset, TaskAssetData } from "../../objects/task-generic-asset";
import {
  TaskAssetList,
  TaskAssetListData,
} from "../../objects/task-asset-list";
import {
  AttachmentList,
  AttachmentListData,
} from "../../objects/attachment-list";
import { TaskArticle, TaskArticleData } from "../../objects/task-article";
import { TaskImage, TaskImageData } from "../../objects/task-image";
import { TaskVideo, TaskVideoData } from "../../objects/task-video";
import { TaskRawFile, TaskRawFileData } from "../../objects/task-raw-file";
import {
  LabelPayload,
  PaginationOption,
  CommentCreatePayload,
} from "../../objects/common/types";

interface TaskUpdatePayload {
  labels: LabelPayload[];
}

interface TaskCustomFieldUpdatePayload {
  values: string[];
}

interface TaskSubstepUpdatePayload {
  isCompleted?: true;
  isInProgress?: true;
  assigneeId?: string;
}

interface TaskSubStepExternalWorkUpdatePayload {
  identifier?: string;
  title?: string;
  status?: string;
  url?: string;
}

interface TaskSubStepCommentUpdatePayload {
  value: string;
}

export class Task {
  #apiCaller: APICaller;

  constructor(apiCaller: APICaller) {
    this.#apiCaller = apiCaller;
  }

  async getTask(taskId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}`,
      tokenGetParam
    );
    return new TaskObject(response as TaskData, this.#apiCaller, tokenGetParam);
  }

  async updateTask(
    taskId: string,
    update: TaskUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/tasks/${taskId}`,
      update,
      tokenGetParam
    );
    return new TaskObject(response as TaskData, this.#apiCaller, tokenGetParam);
  }

  async getTaskBrief(taskId: string, tokenGetParam?: any) {
    const response = (await this.#apiCaller.get(
      `/tasks/${taskId}/brief`,
      tokenGetParam
    )) as TaskBriefData;
    return new TaskBrief(response);
  }

  async getTaskCustomFields(
    taskId: string,
    option: PaginationOption = {},
    tokenGetParam?: any
  ) {
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/custom-fields${query}`,
      tokenGetParam
    );
    return new CustomFieldList(
      response as CustomFieldListData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskCustomField(
    taskId: string,
    customFieldId: string,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/custom-fields/${customFieldId}`,
      tokenGetParam
    );
    return new CustomField(
      response as CustomFieldData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async updateTaskCustomField(
    taskId: string,
    customFieldId: string,
    update: TaskCustomFieldUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/tasks/${taskId}/custom-fields/${customFieldId}`,
      update,
      tokenGetParam
    );
    return new CustomField(
      response as CustomFieldData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskCustomFieldChoices(
    taskId: string,
    customFieldId: string,
    option: PaginationOption = {},
    tokenGetParam?: any
  ) {
    const query = buildQueryString(option);
    // TODO: return custom field choices object
    return this.#apiCaller.get(
      `/tasks/${taskId}/custom-fields/${customFieldId}/choices${query}`,
      tokenGetParam
    );
  }

  async getTaskSubstep(
    taskId: string,
    stepId: string,
    subStepId: string,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}`,
      tokenGetParam
    );
    return new TaskSubStep(
      response as TaskSubStepData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async updateTaskSubstep(
    taskId: string,
    stepId: string,
    subStepId: string,
    update: TaskSubstepUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}`,
      update,
      tokenGetParam
    );
    return new TaskSubStep(
      response as TaskSubStepData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskSubstepExternalWork(
    taskId: string,
    stepId: string,
    subStepId: string,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}/external-work`,
      tokenGetParam
    );
    return new ExternalWork(
      response as ExternalWorkData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async updateTaskSubStepExternalWork(
    taskId: string,
    stepId: string,
    subStepId: string,
    update: TaskSubStepExternalWorkUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}/external-work`,
      update,
      tokenGetParam
    );
    return new ExternalWork(
      response as ExternalWorkData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskSubstepComments(
    taskId: string,
    stepId: string,
    subStepId: string,
    option: PaginationOption = {},
    tokenGetParam?: any
  ) {
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}/comments${query}`,
      tokenGetParam
    );
    // TODO: return list object
    return response;
  }

  async addTaskSubstepComment(
    taskId: string,
    stepId: string,
    subStepId: string,
    comment: CommentCreatePayload,
    tokenGetParam?: any
  ) {
    const commentPayload = {
      value: comment.value,
      attachments: [] as { key: string; name: string }[],
    };
    if (comment.attachments) {
      comment.attachments.forEach((file) => {
        commentPayload.attachments.push({
          key: file.key,
          name: file.title,
        });
      });
    }
    const response = await this.#apiCaller.post(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}/comments`,
      commentPayload,
      tokenGetParam
    );
    return response;
  }

  async getTaskSubstepComment(
    taskId: string,
    stepId: string,
    subStepId: string,
    commentId: string,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}/comments/${commentId}`,
      tokenGetParam
    );
    // TODO: return comment object
    return response;
  }

  async updateTaskSubstepComment(
    taskId: string,
    stepId: string,
    subStepId: string,
    commentId: string,
    update: TaskSubStepCommentUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}/comments/${commentId}`,
      update,
      tokenGetParam
    );
    // TODO: return comment object
    return response;
  }

  async deleteTaskSubstepComment(
    taskId: string,
    stepId: string,
    subStepId: string,
    commentId: string,
    tokenGetParam?: any
  ) {
    await this.#apiCaller.delete(
      `/tasks/${taskId}/steps/${stepId}/sub-steps/${subStepId}/comments/${commentId}`,
      tokenGetParam
    );
  }

  async getTaskAssets(
    taskId: string,
    option: PaginationOption = {},
    tokenGetParam?: any
  ) {
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/assets${query}`,
      tokenGetParam
    );
    return new TaskAssetList(
      response as TaskAssetListData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async addTaskAsset(taskId: string, asset: UploadedFile, tokenGetParam?: any) {
    const response = await this.#apiCaller.post(
      `/tasks/${taskId}/assets`,
      { key: asset.key, title: asset.title },
      tokenGetParam
    );
    return new TaskAsset(
      response as TaskAssetData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async addTaskAssetDraft(
    taskId: string,
    assetId: string,
    draft: UploadedFile,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.post(
      `/tasks/${taskId}/assets/${assetId}/drafts`,
      { key: draft.key, title: draft.title },
      tokenGetParam
    );
    return response;
  }

  async getTaskAssetComments(
    taskId: string,
    assetId: string,
    option: PaginationOption = {},
    tokenGetParam?: any
  ) {
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/assets/${assetId}/comments${query}`,
      tokenGetParam
    );
    return response;
  }

  async addTaskAssetComment(
    taskId: string,
    assetId: string,
    comment: CommentCreatePayload,
    tokenGetParam?: any
  ) {
    const commentPayload = {
      value: comment.value,
      attachments: [] as { key: string; name: string }[],
    };
    if (comment.attachments) {
      comment.attachments.forEach((file) => {
        commentPayload.attachments.push({
          key: file.key,
          name: file.title,
        });
      });
    }
    const response = await this.#apiCaller.post(
      `/tasks/${taskId}/assets/${assetId}/comments`,
      commentPayload,
      tokenGetParam
    );
    return response;
  }

  async getTaskAttachments(
    taskId: string,
    option: PaginationOption = {},
    tokenGetParam?: any
  ) {
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/attachments${query}`,
      tokenGetParam
    );
    return new AttachmentList(
      response as AttachmentListData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskArticle(taskId: string, articleId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/articles/${articleId}`,
      tokenGetParam
    );
    return new TaskArticle(
      response as TaskArticleData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskImage(taskId: string, imageId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/images/${imageId}`,
      tokenGetParam
    );
    return new TaskImage(
      response as TaskImageData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskVideo(taskId: string, videoId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/videos/${videoId}`,
      tokenGetParam
    );
    return new TaskVideo(
      response as TaskVideoData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getTaskRawFile(taskId: string, rawFileId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/tasks/${taskId}/raw-files/${rawFileId}`,
      tokenGetParam
    );
    return new TaskRawFile(
      response as TaskRawFileData,
      this.#apiCaller,
      tokenGetParam
    );
  }
}

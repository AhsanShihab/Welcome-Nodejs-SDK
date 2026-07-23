import { TaskAssetBase, TaskAssetBaseData } from "./base-task-asset";

interface Extra {
  fileSize: number;
  url: string;
}

export interface TaskVideoData extends TaskAssetBaseData, Extra {}
export interface TaskVideo extends Extra {}
export class TaskVideo extends TaskAssetBase {}

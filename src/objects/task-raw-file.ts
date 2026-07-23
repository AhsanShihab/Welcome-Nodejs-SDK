import { TaskAssetBase, TaskAssetBaseData } from "./base-task-asset";

interface Extra {
  fileSize: number;
  url: string;
}

export interface TaskRawFileData extends TaskAssetBaseData, Extra {}
export interface TaskRawFile extends Extra {}
export class TaskRawFile extends TaskAssetBase {}

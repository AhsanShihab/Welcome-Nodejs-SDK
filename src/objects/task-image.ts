import { TaskAssetBase, TaskAssetBaseData } from "./base-task-asset";

interface Extra {
  fileSize: number;
  imageResolution: {
    height: number;
    width: number;
  };
  url: string;
}

export interface TaskImageData extends TaskAssetBaseData, Extra {}
export interface TaskImage extends Extra {}
export class TaskImage extends TaskAssetBase {}

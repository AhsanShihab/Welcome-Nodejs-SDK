import { TaskAsset, TaskAssetData } from "./task-generic-asset";
import { PaginatedResponse } from "./common/types";
import { createListClass } from "./list-factory";

export interface TaskAssetListData extends PaginatedResponse {
  data: Array<TaskAssetData>;
}

export class TaskAssetList extends createListClass(TaskAsset) {}

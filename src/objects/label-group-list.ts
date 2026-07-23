import { LabelGroup, LabelGroupData } from "./label-group";
import { PaginatedResponse } from "./common/types";
import { createListClass } from "./list-factory";

export interface LabelGroupListData extends PaginatedResponse {
  data: Array<LabelGroupData>;
}

export class LabelGroupList extends createListClass(LabelGroup) {}

import { CustomField, CustomFieldData } from "./custom-field";
import { PaginatedResponse } from "./common/types";
import { createListClass } from "./list-factory";

export interface CustomFieldListData extends PaginatedResponse {
  data: Array<CustomFieldData>;
}

export class CustomFieldList extends createListClass(CustomField) {}

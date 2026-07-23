import { Resource } from "./resource";
import { buildQueryString } from "../util";
import { PaginationOption } from "./common/types";

interface Common {
  id: string;
  name: string;
  type:
    | "text_field"
    | "multi_line_text_field"
    | "checkboxes"
    | "dropdown"
    | "multi_select_dropdown"
    | "multiple_choice"
    | "date_field"
    | "image"
    | "video"
    | "rich_text_field";
  values: {
    id: string;
    name: string;
  }[];
}

export interface CustomFieldData extends Common {
  links: {
    self: string;
    choices: string | null;
  };
}

export interface CustomField extends Common {}
export class CustomField extends Resource<CustomFieldData> {
  // `links.choices` is `string | null` per spec (nullable). Returns raw response
  // for now — a CustomFieldChoiceList wrapper is a follow-up.
  async getChoices(option: PaginationOption = {}) {
    const url = this._resolveLinkUrl("choices");
    if (url === null) return null;
    const query = buildQueryString(option);
    return this._apiCaller.get(url + query, this._tokenGetParam);
  }
}

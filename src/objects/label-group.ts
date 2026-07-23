import { Resource } from "./resource";

export interface LabelGroupData {
  id: string;
  name: string;
  sourceOrgType: string;
  values: Array<{
    id: string;
    name: string;
  }>;
}

export interface LabelGroup extends LabelGroupData {}
export class LabelGroup extends Resource<LabelGroupData> {}

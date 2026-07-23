import { APICaller } from "../modules/api-caller";
import { BriefBase, BriefBaseData } from "./brief";

export interface TaskBriefData extends BriefBaseData {
  links: {
    self: string;
    task: string;
  };
}

export class TaskBrief extends BriefBase {
  #links: TaskBriefData["links"];

  constructor(
    data: TaskBriefData,
    _apiCaller?: APICaller,
    _tokenGetParam?: unknown
  ) {
    const { links, ...baseData } = data;
    super(baseData);
    this.#links = data.links;
  }

  getRelatedLinks() {
    return this.#links;
  }
}

import { Resource, ResourceCtor } from "./resource";
import { CampaignBrief } from "./campaign-brief";
import { User } from "./user";
import { LabelResponse } from "./common/types";

interface Common {
  id: string;
  title: string;
  description: string | null;
  isHidden: boolean;
  referenceId: string;
  budget: {
    currencyCode: string;
    budgetedAmount: string;
  } | null;
  labels: LabelResponse[];
}

export interface CampaignData extends Common {
  startDate: string | null;
  endDate: string | null;
  links: {
    self: string;
    brief: string | null;
    owner: string | null;
    parentCampaign: string | null;
    childCampaigns: string[];
  };
}

export interface Campaign extends Common {
  startDate: Date | null;
  endDate: Date | null;
}
export class Campaign extends Resource<CampaignData> {
  static dateFields = ["startDate", "endDate"] as const;
  static linkTargets: Record<string, ResourceCtor> = {
    brief: CampaignBrief,
    owner: User,
    parentCampaign: Campaign,
  };

  // `links.brief` is `string | null` per spec (nullable).
  async getBrief(): Promise<CampaignBrief | null> {
    return this._follow<CampaignBrief>("brief");
  }

  // `links.owner` is `string | null` per spec (nullable).
  async getOwner(): Promise<User | null> {
    return this._follow<User>("owner");
  }

  // `links.parent_campaign` is `string | null` per spec (nullable).
  async getParentCampaign(): Promise<Campaign | null> {
    return this._follow<Campaign>("parentCampaign");
  }

  // `links.child_campaigns` is a required non-nullable array of URLs per spec.
  // Not expressible via _follow / _followList since it's a list of individual
  // resource URLs, so this validates and fetches manually.
  async getChildCampaigns(): Promise<Campaign[]> {
    const urls = this._links.childCampaigns;
    if (!Array.isArray(urls)) {
      throw new TypeError(
        `Campaign: link 'childCampaigns' expected an array of strings, got ${typeof urls}`
      );
    }
    return Promise.all(
      urls.map(async (url) => {
        if (typeof url !== "string") {
          throw new TypeError(
            `Campaign: link 'childCampaigns' entry expected a string, got ${typeof url}`
          );
        }
        const data = await this._apiCaller.get(url, this._tokenGetParam);
        return new Campaign(
          data as CampaignData,
          this._apiCaller,
          this._tokenGetParam
        );
      })
    );
  }
}

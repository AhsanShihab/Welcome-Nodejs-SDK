import { Campaign } from "../../src/modules/campaign";
import { Campaign as CampaignObject } from "../../src/objects/campaign";
import { CampaignBrief } from "../../src/objects/campaign-brief";
import { User } from "../../src/objects/user";
import { APICaller } from "../../src/modules/api-caller";
import { Auth } from "../../src/modules/auth";
import * as nock from "nock";

describe("Campaign module", () => {
  const accessTokenMock = jest.fn().mockResolvedValue("some-access-token");
  const auth = new Auth({
    accessToken: accessTokenMock,
    refreshToken: "some-refresh-token",
  });
  const apiCaller = new APICaller(auth, true);
  const campaignModule = new Campaign(apiCaller);

  const WELCOME_API_BASE_URL = "https://api.cmp.optimizely.com/v3";
  const tokenGetParam = { user: "123" };

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  it("should get the campaign by its ID", async () => {
    const campaignResponseFromWelcomeAPI = {
      id: "8q7f910551b00a722e0418830cee6612",
      title: "The awesome campaign",
      description: "The awesome campaign's description",
      start_date: "2019-10-06",
      end_date: "2019-10-16",
      is_hidden: false,
      status: "On Track",
      reference_id: "CPN-1589",
      budget: {
        currency_code: "USD",
        budgeted_amount: "1000.50",
      },
      labels: [
        {
          group: {
            id: "2467e583a60e23fda2b89db81a453cd2",
            name: "Content Format",
          },
          values: [
            {
              id: "71c378f3fee3d822759d1bdc2aab628c",
              name: "Photos",
            },
          ],
        },
      ],
      links: {
        self: "https://api.cmp.optimizely.com/v3/campaigns/8q7f910551b00a722e0418830cee6612",
        brief:
          "https://api.cmp.optimizely.com/v3/campaigns/8q7f910551b00a722e0418830cee6612/brief",
        owner: "https://api.newscred.com/v3/users/6ea1bf781398c3147393arr1",
        parent_campaign:
          "https://api.cmp.optimizely.com/v3/campaigns/7u7f910551b00a722e0418830cee6643",
        child_campaigns: [
          "https://api.newscred.com/v3/campaigns/6fb21acf987094513ecb4b58",
        ],
      },
    };
    const scope = nock(WELCOME_API_BASE_URL, {
      reqheaders: {
        authorization: "Bearer some-access-token",
      },
    })
      .get("/campaigns/8q7f910551b00a722e0418830cee6612")
      .reply(200, campaignResponseFromWelcomeAPI);

    const campaign = await campaignModule.getCampaignById(
      "8q7f910551b00a722e0418830cee6612",
      tokenGetParam
    );

    expect(scope.isDone()).toBe(true);
    expect(accessTokenMock).toBeCalledWith(tokenGetParam);
    expect(campaign).toBeInstanceOf(CampaignObject);
    expect(campaign).toEqual({
      id: "8q7f910551b00a722e0418830cee6612",
      title: "The awesome campaign",
      description: "The awesome campaign's description",
      startDate: new Date("2019-10-06"),
      endDate: new Date("2019-10-16"),
      isHidden: false,
      status: "On Track",
      referenceId: "CPN-1589",
      budget: {
        currencyCode: "USD",
        budgetedAmount: "1000.50",
      },
      labels: [
        {
          group: {
            id: "2467e583a60e23fda2b89db81a453cd2",
            name: "Content Format",
          },
          values: [
            {
              id: "71c378f3fee3d822759d1bdc2aab628c",
              name: "Photos",
            },
          ],
        },
      ],
    });
  });

  it("should get the brief of a campaign by campaign ID", async () => {
    const campaignBriefResponseFromWelcomeAPI = {
      type: "template",
      title: "Awesome Campaign Brief",
      template: {
        id: "9nu8ue9wf8u9nusd9f",
        name: "My Template",
      },
      fields: [
        {
          name: "My Dropdown",
          value: ["option 1"],
        },
      ],
      links: {
        self: "https://api.cmp.optimizely.com/v3/campaigns/5f857f30e1c4a2038d6179e9/brief",
        campaign:
          "https://api.cmp.optimizely.com/v3/campaigns/5f857f30e1c4a2038d6179e9",
      },
    };

    const scope = nock(WELCOME_API_BASE_URL, {
      reqheaders: {
        authorization: "Bearer some-access-token",
      },
    })
      .get("/campaigns/8q7f910551b00a722e0418830cee6612/brief")
      .reply(200, campaignBriefResponseFromWelcomeAPI);

    const campaignBrief = await campaignModule.getCampaignBrief(
      "8q7f910551b00a722e0418830cee6612",
      tokenGetParam
    );

    expect(scope.isDone()).toBe(true);
    expect(accessTokenMock).toBeCalledWith(tokenGetParam);
    expect(campaignBrief).toBeInstanceOf(CampaignBrief);
    expect(campaignBrief).toEqual({
      type: "template",
      title: "Awesome Campaign Brief",
      template: {
        id: "9nu8ue9wf8u9nusd9f",
        name: "My Template",
      },
      fields: [
        {
          name: "My Dropdown",
          value: ["option 1"],
        },
      ],
    });
  });

  describe("Campaign object HATEOAS methods", () => {
    const baseWire = () => ({
      id: "c1",
      title: "Camp",
      description: null,
      start_date: null,
      end_date: null,
      is_hidden: false,
      status: "On Track",
      reference_id: "CPN-1",
      budget: null,
      labels: [],
      links: {
        self: "https://api.cmp.optimizely.com/v3/campaigns/c1",
        brief: null as string | null,
        owner: null as string | null,
        parent_campaign: null as string | null,
        child_campaigns: [] as string[],
      },
    });

    const loadCampaign = async () => {
      nock(WELCOME_API_BASE_URL).get("/campaigns/c1").reply(200, baseWire());
      return campaignModule.getCampaignById("c1", tokenGetParam);
    };

    it("getBrief returns null when links.brief is null (nullable per spec)", async () => {
      const c = await loadCampaign();
      await expect(c.getBrief()).resolves.toBeNull();
    });

    it("getBrief follows the link when non-null", async () => {
      const wire = baseWire();
      wire.links.brief =
        "https://api.cmp.optimizely.com/v3/campaigns/c1/brief";
      nock(WELCOME_API_BASE_URL).get("/campaigns/c1").reply(200, wire);
      const c = await campaignModule.getCampaignById("c1", tokenGetParam);

      nock(WELCOME_API_BASE_URL).get("/campaigns/c1/brief").reply(200, {
        type: "text",
        title: "The brief",
        template: null,
        fields: [],
        links: {
          self: "https://api.cmp.optimizely.com/v3/campaigns/c1/brief",
          campaign: "https://api.cmp.optimizely.com/v3/campaigns/c1",
        },
      });
      const brief = await c.getBrief();
      expect(brief).toBeInstanceOf(CampaignBrief);
    });

    it("getOwner returns null when links.owner is null", async () => {
      const c = await loadCampaign();
      await expect(c.getOwner()).resolves.toBeNull();
    });

    it("getOwner follows the link when non-null and returns a User", async () => {
      const wire = baseWire();
      wire.links.owner =
        "https://api.cmp.optimizely.com/v3/users/u1";
      nock(WELCOME_API_BASE_URL).get("/campaigns/c1").reply(200, wire);
      const c = await campaignModule.getCampaignById("c1", tokenGetParam);

      nock(WELCOME_API_BASE_URL).get("/users/u1").reply(200, {
        id: "u1",
        first_name: "Ada",
        last_name: "Lovelace",
        full_name: "Ada Lovelace",
        email: null,
        links: {
          self: "https://api.cmp.optimizely.com/v3/users/u1",
        },
      });
      const owner = await c.getOwner();
      expect(owner).toBeInstanceOf(User);
      expect(owner?.fullName).toBe("Ada Lovelace");
    });

    it("getParentCampaign returns null when links.parent_campaign is null", async () => {
      const c = await loadCampaign();
      await expect(c.getParentCampaign()).resolves.toBeNull();
    });

    it("getChildCampaigns returns [] when the array is empty", async () => {
      const c = await loadCampaign();
      await expect(c.getChildCampaigns()).resolves.toEqual([]);
    });

    it("getChildCampaigns fetches each URL and wraps as Campaign", async () => {
      const wire = baseWire();
      wire.links.child_campaigns = [
        "https://api.cmp.optimizely.com/v3/campaigns/c2",
      ];
      nock(WELCOME_API_BASE_URL).get("/campaigns/c1").reply(200, wire);
      const c = await campaignModule.getCampaignById("c1", tokenGetParam);

      const child = baseWire();
      child.id = "c2";
      child.title = "Child";
      child.links.self = "https://api.cmp.optimizely.com/v3/campaigns/c2";
      nock(WELCOME_API_BASE_URL).get("/campaigns/c2").reply(200, child);

      const children = await c.getChildCampaigns();
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(CampaignObject);
      expect(children[0].title).toBe("Child");
    });

    it("getChildCampaigns throws if the API returns non-string entries", async () => {
      const wire = baseWire();
      (wire.links.child_campaigns as unknown[]) = [123];
      nock(WELCOME_API_BASE_URL).get("/campaigns/c1").reply(200, wire);
      const c = await campaignModule.getCampaignById("c1", tokenGetParam);
      await expect(c.getChildCampaigns()).rejects.toThrow(
        /'childCampaigns' entry expected a string, got number/
      );
    });
  });
});

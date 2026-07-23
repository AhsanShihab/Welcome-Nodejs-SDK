import { Task } from "../../src/modules/task";
import { Task as TaskObject } from "../../src/objects/task";
import { TaskBrief } from "../../src/objects/task-brief";
import { TaskStep } from "../../src/objects/task-step";
import { TaskSubStep } from "../../src/objects/task-substep";
import { ExternalWork } from "../../src/objects/external-work";
import { Campaign } from "../../src/objects/campaign";
import { CustomFieldList } from "../../src/objects/custom-field-list";
import { CustomField } from "../../src/objects/custom-field";
import { TaskAssetList } from "../../src/objects/task-asset-list";
import { AttachmentList } from "../../src/objects/attachment-list";
import { TaskArticle } from "../../src/objects/task-article";
import { TaskImage } from "../../src/objects/task-image";
import { TaskVideo } from "../../src/objects/task-video";
import { TaskRawFile } from "../../src/objects/task-raw-file";
import { APICaller } from "../../src/modules/api-caller";
import { Auth } from "../../src/modules/auth";
import * as nock from "nock";

const WELCOME_API_BASE_URL = "https://api.cmp.optimizely.com/v3";
const tokenGetParam = { user: "u1" };

describe("Task module + Task object family", () => {
  let auth: Auth;
  let apiCaller: APICaller;
  let taskModule: Task;
  let accessTokenMock: jest.Mock;

  beforeEach(() => {
    accessTokenMock = jest.fn().mockResolvedValue("some-access-token");
    auth = new Auth({
      accessToken: accessTokenMock,
      refreshToken: "some-refresh-token",
    });
    apiCaller = new APICaller(auth, true);
    taskModule = new Task(apiCaller);
  });

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  const wireTask = () => ({
    id: "t1",
    title: "Awesome Task",
    start_at: "2024-01-01T00:00:00Z",
    due_at: "2024-02-01T00:00:00Z",
    is_completed: false,
    is_archived: false,
    reference_id: "TSK-1",
    labels: [],
    steps: [
      {
        id: "step-1",
        title: "Step One",
        is_completed: false,
        description: null,
        due_at: "2024-01-15T00:00:00Z",
        sub_steps: [
          {
            id: "sub-1",
            title: "Sub One",
            assignee_id: "u-2",
            is_completed: false,
            is_in_progress: false,
            is_skipped: false,
            is_external: false,
            links: {
              self: "https://api.cmp.optimizely.com/v3/tasks/t1/steps/step-1/sub-steps/sub-1",
              task: "https://api.cmp.optimizely.com/v3/tasks/t1",
              external_work: null,
              assignee: "https://api.cmp.optimizely.com/v3/users/u-2",
            },
          },
        ],
      },
    ],
    links: {
      self: "https://api.cmp.optimizely.com/v3/tasks/t1",
      assets: "https://api.cmp.optimizely.com/v3/tasks/t1/assets",
      attachments: "https://api.cmp.optimizely.com/v3/tasks/t1/attachments",
      brief: "https://api.cmp.optimizely.com/v3/tasks/t1/brief",
      campaign: "https://api.cmp.optimizely.com/v3/campaigns/c1",
      custom_fields: "https://api.cmp.optimizely.com/v3/tasks/t1/custom-fields",
      web_urls: {
        self: "https://cmp.optimizely.com/cloud/taskv3/t1",
        brief: "https://cmp.optimizely.com/cloud/taskv3/t1?activeTab=brief",
      },
    },
  });

  describe("getTask", () => {
    it("returns a fully-hydrated Task with nested TaskSteps and TaskSubSteps", async () => {
      const scope = nock(WELCOME_API_BASE_URL, {
        reqheaders: { authorization: "Bearer some-access-token" },
      })
        .get("/tasks/t1")
        .reply(200, wireTask());

      const task = await taskModule.getTask("t1", tokenGetParam);

      expect(scope.isDone()).toBe(true);
      expect(accessTokenMock).toBeCalledWith(tokenGetParam);
      expect(task).toBeInstanceOf(TaskObject);
      expect(task.title).toBe("Awesome Task");
      expect(task.startAt).toEqual(new Date("2024-01-01T00:00:00Z"));
      expect(task.dueAt).toEqual(new Date("2024-02-01T00:00:00Z"));
      expect(task.steps).toHaveLength(1);
      expect(task.steps[0]).toBeInstanceOf(TaskStep);
      expect(task.steps[0].dueAt).toEqual(new Date("2024-01-15T00:00:00Z"));
      expect(task.steps[0].subSteps[0]).toBeInstanceOf(TaskSubStep);
    });

    it("toJSON round-trips dates back to ISO strings", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);
      const json = task.toJSON() as any;
      expect(json.startAt).toBe("2024-01-01T00:00:00.000Z");
      expect(json.steps[0].dueAt).toBe("2024-01-15T00:00:00.000Z");
      expect(json).not.toHaveProperty("links");
    });
  });

  describe("Task instance methods (HATEOAS)", () => {
    it("update() PATCHes links.self and rehydrates", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);

      nock(WELCOME_API_BASE_URL)
        .patch("/tasks/t1", { labels: [] })
        .reply(200, { ...wireTask(), title: "Renamed" });

      await task.update({ labels: [] });
      expect(task.title).toBe("Renamed");
    });

    it("getBrief follows links.brief and returns a TaskBrief", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);

      nock(WELCOME_API_BASE_URL)
        .get("/tasks/t1/brief")
        .reply(200, {
          type: "template",
          title: "A brief",
          template: { id: "tpl-1", name: "Sample" },
          fields: [],
          links: {
            self: "https://api.cmp.optimizely.com/v3/tasks/t1/brief",
            task: "https://api.cmp.optimizely.com/v3/tasks/t1",
          },
        });
      const brief = await task.getBrief();
      expect(brief).toBeInstanceOf(TaskBrief);
    });

    it("getCampaign follows links.campaign as required (non-nullable)", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);

      nock(WELCOME_API_BASE_URL).get("/campaigns/c1").reply(200, {
        id: "c1",
        title: "Campaign",
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
          brief: null,
          owner: null,
          parent_campaign: null,
          child_campaigns: [],
        },
      });
      const campaign = await task.getCampaign();
      expect(campaign).toBeInstanceOf(Campaign);
      expect(campaign.title).toBe("Campaign");
    });

    it("getCampaign throws when API returns null for the non-nullable link", async () => {
      const wire = wireTask();
      (wire.links as any).campaign = null;
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wire);
      const task = await taskModule.getTask("t1", tokenGetParam);

      await expect(task.getCampaign()).rejects.toThrow(
        /required non-nullable link 'campaign' resolved to null/
      );
    });

    it("getAssets follows the assets list link", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);

      nock(WELCOME_API_BASE_URL)
        .get("/tasks/t1/assets")
        .reply(200, {
          data: [],
          pagination: { next: null, previous: null },
        });

      const list = await task.getAssets();
      expect(list).toBeInstanceOf(TaskAssetList);
      expect(list.data).toEqual([]);
    });

    it("getAttachments follows the attachments list link", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);

      nock(WELCOME_API_BASE_URL)
        .get("/tasks/t1/attachments")
        .reply(200, {
          data: [
            { id: "a1", name: "file.pdf", url: "https://files/x" },
          ],
          pagination: { next: null, previous: null },
        });

      const list = await task.getAttachments();
      expect(list).toBeInstanceOf(AttachmentList);
      expect(list.data[0].name).toBe("file.pdf");
    });

    it("getCustomFields returns null when the nullable link is null", async () => {
      const wire = wireTask();
      (wire.links as any).custom_fields = null;
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wire);
      const task = await taskModule.getTask("t1", tokenGetParam);
      await expect(task.getCustomFields()).resolves.toBeNull();
    });

    it("getCustomFields fetches and returns a CustomFieldList when present", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);

      nock(WELCOME_API_BASE_URL)
        .get("/tasks/t1/custom-fields")
        .reply(200, {
          data: [
            {
              id: "cf1",
              name: "Priority",
              type: "dropdown",
              values: [{ id: "v1", name: "High" }],
              links: {
                self: "https://api.cmp.optimizely.com/v3/tasks/t1/custom-fields/cf1",
                choices: null,
              },
            },
          ],
          pagination: { next: null, previous: null },
        });

      const list = await task.getCustomFields();
      expect(list).toBeInstanceOf(CustomFieldList);
      expect(list?.data[0]).toBeInstanceOf(CustomField);
      expect(list?.data[0].name).toBe("Priority");
    });
  });

  describe("TaskSubStep methods", () => {
    it("update() PATCHes the substep and rehydrates", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);
      const sub = task.steps[0].subSteps[0];

      const patchedWire = {
        ...wireTask().steps[0].sub_steps[0],
        is_completed: true,
      };
      nock(WELCOME_API_BASE_URL)
        .patch("/tasks/t1/steps/step-1/sub-steps/sub-1", { is_completed: true })
        .reply(200, patchedWire);

      await sub.update({ isCompleted: true });
      expect(sub.isCompleted).toBe(true);
    });

    it("getExternalWork returns null when the nullable link is null", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wireTask());
      const task = await taskModule.getTask("t1", tokenGetParam);
      const sub = task.steps[0].subSteps[0];
      await expect(sub.getExternalWork()).resolves.toBeNull();
    });

    it("getExternalWork fetches an ExternalWork when the link is populated", async () => {
      const wire = wireTask();
      (wire.steps[0].sub_steps[0].links as any).external_work =
        "https://api.cmp.optimizely.com/v3/tasks/t1/steps/step-1/sub-steps/sub-1/external-work";
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wire);
      const task = await taskModule.getTask("t1", tokenGetParam);
      const sub = task.steps[0].subSteps[0];

      nock(WELCOME_API_BASE_URL)
        .get("/tasks/t1/steps/step-1/sub-steps/sub-1/external-work")
        .reply(200, {
          identifier: "PROJ-1",
          title: "Ticket",
          status: "In Progress",
          url: "https://ext.example/PROJ-1",
          external_system: "jira",
          links: {
            self: "https://api.cmp.optimizely.com/v3/tasks/t1/steps/step-1/sub-steps/sub-1/external-work",
          },
        });

      const ext = await sub.getExternalWork();
      expect(ext).toBeInstanceOf(ExternalWork);
      expect(ext?.identifier).toBe("PROJ-1");
    });

    it("getAssignee returns undefined when assigneeId is null", async () => {
      const wire = wireTask();
      (wire.steps[0].sub_steps[0] as any).assignee_id = null;
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wire);
      const task = await taskModule.getTask("t1", tokenGetParam);
      const sub = task.steps[0].subSteps[0];
      await expect(sub.getAssignee()).resolves.toBeUndefined();
    });

    it("getAssignee returns undefined when assignee link is absent (optional per spec)", async () => {
      const wire = wireTask();
      delete (wire.steps[0].sub_steps[0].links as any).assignee;
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wire);
      const task = await taskModule.getTask("t1", tokenGetParam);
      const sub = task.steps[0].subSteps[0];
      await expect(sub.getAssignee()).resolves.toBeUndefined();
    });
  });

  describe("ExternalWork.update", () => {
    it("PATCHes the external-work link and rehydrates", async () => {
      const wire = wireTask();
      (wire.steps[0].sub_steps[0].links as any).external_work =
        "https://api.cmp.optimizely.com/v3/tasks/t1/steps/step-1/sub-steps/sub-1/external-work";
      nock(WELCOME_API_BASE_URL).get("/tasks/t1").reply(200, wire);
      const task = await taskModule.getTask("t1", tokenGetParam);
      const sub = task.steps[0].subSteps[0];

      const externalWire = {
        identifier: "PROJ-1",
        title: "Ticket",
        status: "Open",
        url: "https://ext/PROJ-1",
        external_system: "jira",
        links: {
          self: "https://api.cmp.optimizely.com/v3/tasks/t1/steps/step-1/sub-steps/sub-1/external-work",
        },
      };
      nock(WELCOME_API_BASE_URL)
        .get("/tasks/t1/steps/step-1/sub-steps/sub-1/external-work")
        .reply(200, externalWire);
      const ext = (await sub.getExternalWork())!;

      nock(WELCOME_API_BASE_URL)
        .patch("/tasks/t1/steps/step-1/sub-steps/sub-1/external-work", {
          status: "Closed",
        })
        .reply(200, { ...externalWire, status: "Closed" });

      await ext.update({ status: "Closed" });
      expect(ext.status).toBe("Closed");
    });
  });

  describe("getTaskArticle / getTaskImage / getTaskVideo / getTaskRawFile", () => {
    const baseAssetLinks = {
      self: "https://api/x",
      task: "https://api.cmp.optimizely.com/v3/tasks/t1",
      drafts: null,
      web_urls: { self: "https://cmp/x", task: "https://cmp/task", drafts: null },
    };
    const baseAssetWire = {
      id: "a1",
      title: "asset",
      mime_type: "image/png",
      labels: [],
      created_at: "2024-01-01T00:00:00Z",
      modified_at: "2024-01-02T00:00:00Z",
      links: baseAssetLinks,
    };

    it("getTaskArticle returns a hydrated TaskArticle", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1/articles/a1").reply(200, {
        id: "a1",
        title: "Article",
        html_body: "<p>Hi</p>",
        url: null,
        labels: [],
        created_at: "2024-01-01T00:00:00Z",
        modified_at: "2024-01-02T00:00:00Z",
        links: {
          self: "https://api/article",
          task: "https://api/task",
          drafts: null,
          web_urls: {
            self: "https://cmp/article",
            task: "https://cmp/task",
            drafts: null,
          },
        },
      });
      const article = await taskModule.getTaskArticle("t1", "a1", tokenGetParam);
      expect(article).toBeInstanceOf(TaskArticle);
      expect(article.createdAt).toEqual(new Date("2024-01-01T00:00:00Z"));
    });

    it("getTaskImage returns a hydrated TaskImage", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1/images/a1").reply(200, {
        ...baseAssetWire,
        file_size: 123,
        image_resolution: { height: 100, width: 200 },
        url: "https://images/x",
      });
      const image = await taskModule.getTaskImage("t1", "a1", tokenGetParam);
      expect(image).toBeInstanceOf(TaskImage);
      expect(image.imageResolution.width).toBe(200);
    });

    it("getTaskVideo returns a hydrated TaskVideo", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1/videos/a1").reply(200, {
        ...baseAssetWire,
        file_size: 456,
        url: "https://videos/x",
      });
      const video = await taskModule.getTaskVideo("t1", "a1", tokenGetParam);
      expect(video).toBeInstanceOf(TaskVideo);
      expect(video.fileSize).toBe(456);
    });

    it("getTaskRawFile returns a hydrated TaskRawFile", async () => {
      nock(WELCOME_API_BASE_URL).get("/tasks/t1/raw-files/a1").reply(200, {
        ...baseAssetWire,
        file_size: 789,
        url: "https://files/x",
      });
      const raw = await taskModule.getTaskRawFile("t1", "a1", tokenGetParam);
      expect(raw).toBeInstanceOf(TaskRawFile);
      expect(raw.fileSize).toBe(789);
    });
  });
});

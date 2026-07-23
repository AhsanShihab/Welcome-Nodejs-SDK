import { Resource, ResourceCtor } from "./resource";
import { ExternalWork } from "./external-work";
import { User } from "./user";

interface Common {
  id: string;
  title: string;
  assigneeId: string | null;
  isCompleted: boolean;
  isInProgress: boolean;
  isSkipped: boolean;
  isExternal: boolean;
}

export interface TaskSubStepData extends Common {
  links: {
    self: string;
    task: string;
    externalWork: string | null;
    assignee?: string | null;
  };
}

export interface TaskSubStep extends Common {}
export class TaskSubStep extends Resource<TaskSubStepData> {
  static linkTargets: Record<string, ResourceCtor> = {
    externalWork: ExternalWork,
    assignee: User,
  };

  async update(payload: {
    assigneeId?: string | null;
    isCompleted?: true;
    isInProgress?: true;
  }) {
    await this._updateSelf(payload);
  }

  // `links.externalWork` is required nullable per spec.
  async getExternalWork(): Promise<ExternalWork | null> {
    return this._follow<ExternalWork>("externalWork");
  }

  // `links.assignee` is optional per spec (not in the required list); may be
  // absent, null, or a URL. Undefined signals "no assignee" to the caller.
  async getAssignee(): Promise<User | undefined> {
    if (!this.assigneeId) return;
    const user = await this._followOptional<User>("assignee");
    return user ?? undefined;
  }
}

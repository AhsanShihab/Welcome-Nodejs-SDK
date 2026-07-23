import { Resource } from "./resource";

interface Common {
  identifier: string | null;
  title: string | null;
  status: string | null;
  url: string | null;
  externalSystem: string;
}

export interface ExternalWorkData extends Common {
  links: {
    self: string;
  };
}

export interface ExternalWork extends Common {}
export class ExternalWork extends Resource<ExternalWorkData> {
  async update(payload: {
    identifier?: string | null;
    title?: string | null;
    status?: string | null;
    url?: string | null;
  }) {
    await this._updateSelf(payload);
  }
}

import { Attachment, AttachmentData } from "./attachment";
import { PaginatedResponse } from "./common/types";
import { createListClass } from "./list-factory";

export interface AttachmentListData extends PaginatedResponse {
  data: Array<AttachmentData>;
}

export class AttachmentList extends createListClass(Attachment) {}

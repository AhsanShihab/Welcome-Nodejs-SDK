import { Resource } from "./resource";

export interface AttachmentData {
  id: string;
  name: string;
  url: string;
}

export interface Attachment extends AttachmentData {}
export class Attachment extends Resource<AttachmentData> {}

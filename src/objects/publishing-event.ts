import { Resource, ResourceCtor } from "./resource";

interface IPublishingMetadata {
  id: string;
  links: {
    self: string;
  };
}

export interface PublishingMetadata {
  id: string;
}
export class PublishingMetadata extends Resource<IPublishingMetadata> {}

interface IAsset {
  id: string;
  type: "article" | "image" | "video" | "raw_file" | "structured_content";
  publishingMetadata: IPublishingMetadata[];
  links: {
    self: string;
  };
}

export interface Asset {
  id: string;
  type: IAsset["type"];
  publishingMetadata: PublishingMetadata[];
}
export class Asset extends Resource<IAsset> {
  static nested: Record<string, ResourceCtor> = {
    publishingMetadata: PublishingMetadata,
  };
}

export interface IPublishingEventData {
  id: string;
  assets: IAsset[];
  links: {
    self: string;
    publishingMetadata: string;
  };
}

export interface PublishingEvent {
  id: string;
  assets: Asset[];
}
export class PublishingEvent extends Resource<IPublishingEventData> {
  static nested: Record<string, ResourceCtor> = { assets: Asset };
}

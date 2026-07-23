import { Resource } from "./resource";

export interface IPublishingMetadataForAssetData {
  id: string;
  assetId: string;
  assetType: "article" | "image" | "video" | "raw_file" | "structured_content";
  status: "published" | "unpublished" | "synced" | "failed" | null;
  statusMessage: string | null;
  locale: string | null;
  publicUrl: string | null;
  publishingDestinationUpdatedAt: string | null;
  links: {
    self: string;
    publishingEvent: string;
    asset: string;
  };
}

interface Common {
  id: string;
  assetId: string;
  assetType: IPublishingMetadataForAssetData["assetType"];
  status: IPublishingMetadataForAssetData["status"];
  statusMessage: string | null;
  locale: string | null;
  publicUrl: string | null;
}

export interface PublishingMetadataForAsset extends Common {
  publishingDestinationUpdatedAt: Date | null;
}
export class PublishingMetadataForAsset extends Resource<IPublishingMetadataForAssetData> {
  static dateFields = ["publishingDestinationUpdatedAt"] as const;
}

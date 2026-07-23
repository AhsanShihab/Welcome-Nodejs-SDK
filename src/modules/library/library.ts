import { UploadedFile } from "../../objects/uploaded-file";
import { buildQueryString } from "../../util";
import { APICaller } from "../api-caller";
import {
  Folder,
  FolderList,
  LibraryArticle,
  LibraryAsset,
  LibraryAssetList,
  LibraryAssetVersion,
  LibraryImage,
  LibraryRawFile,
  LibraryVideo,
} from "../../objects/libray-objects";
import {
  FolderData,
  FolderListData,
  LibraryArticleData,
  LibraryAssetData,
  LibraryAssetListData,
  LibraryAssetVersionData,
  LibraryImageData,
  LibraryRawFileData,
  LibraryVideoData,
} from "../../objects/libray-objects/types";
import {
  GetAssetsOption,
  GetFoldersOption,
  ImageUpdatePayload,
  RawFileUpdatePayload,
  VideoUpdatePayload,
} from "./types";

export class Library {
  #apiCaller: APICaller;

  constructor(apiCaller: APICaller) {
    this.#apiCaller = apiCaller;
  }

  async getFolders(option: GetFoldersOption = {}, tokenGetParam?: any) {
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      `/folders${query}`,
      tokenGetParam
    );
    return new FolderList(
      response as FolderListData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async getFolderById(folderId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/folders/${folderId}`,
      tokenGetParam
    );
    return new Folder(response as FolderData, this.#apiCaller, tokenGetParam);
  }

  async getAssets(option: GetAssetsOption = {}, tokenGetParam?: any) {
    const query = buildQueryString(option);
    const response = await this.#apiCaller.get(
      `/assets${query}`,
      tokenGetParam
    );
    return new LibraryAssetList(
      response as LibraryAssetListData,
      this.#apiCaller,
      tokenGetParam
    );
  }

  async addAsset(uploadedFile: UploadedFile, tokenGetParam?: any) {
    const payload = {
      key: uploadedFile.key,
      title: uploadedFile.title,
    };
    const response = await this.#apiCaller.post(
      "/assets",
      payload,
      tokenGetParam
    );
    return new LibraryAsset(response as LibraryAssetData, this.#apiCaller, tokenGetParam);
  }

  async addAssetVersion(
    assetId: string,
    uploadedFile: UploadedFile,
    tokenGetParam?: any
  ) {
    const payload = {
      key: uploadedFile.key,
      title: uploadedFile.title,
    };
    const response = await this.#apiCaller.post(
      `/assets/${assetId}/versions`,
      payload,
      tokenGetParam
    );
    return new LibraryAssetVersion(response as LibraryAssetVersionData, this.#apiCaller, tokenGetParam);
  }

  async getArticle(articleId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/articles/${articleId}`,
      tokenGetParam
    );
    return new LibraryArticle(response as LibraryArticleData, this.#apiCaller, tokenGetParam);
  }

  async getImage(imageId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/images/${imageId}`,
      tokenGetParam
    );
    return new LibraryImage(response as LibraryImageData, this.#apiCaller, tokenGetParam);
  }

  async updateImage(
    imageId: string,
    update: ImageUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/images/${imageId}`,
      update,
      tokenGetParam
    );
    return new LibraryImage(response as LibraryImageData, this.#apiCaller, tokenGetParam);
  }

  async deleteImage(imageId: string, tokenGetParam?: any) {
    await this.#apiCaller.delete(`/images/${imageId}`, tokenGetParam);
  }

  async getVideo(videoId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/videos/${videoId}`,
      tokenGetParam
    );
    return new LibraryVideo(response as LibraryVideoData, this.#apiCaller, tokenGetParam);
  }

  async updateVideo(
    videoId: string,
    update: VideoUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/videos/${videoId}`,
      update,
      tokenGetParam
    );
    return new LibraryVideo(response as LibraryVideoData, this.#apiCaller, tokenGetParam);
  }

  async deleteVideo(videoId: string, tokenGetParam?: any) {
    await this.#apiCaller.delete(`/videos/${videoId}`, tokenGetParam);
  }

  async getRawFile(rawFileId: string, tokenGetParam?: any) {
    const response = await this.#apiCaller.get(
      `/raw-files/${rawFileId}`,
      tokenGetParam
    );
    return new LibraryRawFile(response as LibraryRawFileData, this.#apiCaller, tokenGetParam);
  }

  async updateRawFile(
    rawFileId: string,
    update: RawFileUpdatePayload,
    tokenGetParam?: any
  ) {
    const response = await this.#apiCaller.patch(
      `/raw-files/${rawFileId}`,
      update,
      tokenGetParam
    );
    return new LibraryRawFile(response as LibraryRawFileData, this.#apiCaller, tokenGetParam);
  }

  async deleteRawFile(rawFileId: string, tokenGetParam?: any) {
    await this.#apiCaller.delete(`/raw-files/${rawFileId}`, tokenGetParam);
  }
}

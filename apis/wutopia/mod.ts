import merge from "https://cdn.skypack.dev/lodash.merge@^4.6.2";
import { Md5 } from "https://deno.land/std/hash/md5.ts";

import { WutopiaCartoon, WutopiaChapter } from "./models.ts";
import type { WutopiaCartoonData, WutopiaChapterData } from "./types.ts";
import BaseAPI from "../base/mod.ts";

export default class WutopiaAPI extends BaseAPI {
  private lastUpdate?: string;

  constructor() {
    super({
      baseUrl: "https://www.wutopiacomics.com/",
    });
    this._mapCartoon = this._mapCartoon.bind(this);
    this._mapChapter = this._mapChapter.bind(this);
  }

  protected _fetch(
    url: Request | URL | string,
    init?: RequestInit,
  ): Promise<Response> {
    const defaultInit = {
      headers: {
        platform: "10",
      },
      method: "POST",
    };
    return fetch(url, merge(defaultInit, init)).then(
      (response: Response): Response => {
        if (response.status >= 400) {
          throw new Error(response.statusText);
        }
        return response;
      },
    );
  }

  public async getManga(cartoonId: string): Promise<WutopiaCartoon> {
    const endpointUrl = new URL("/mobile/cartoon-collection/get", this.baseUrl);
    const searchParams = new URLSearchParams();
    searchParams.append("id", cartoonId.toString());
    searchParams.append("linkId", "0");
    const response = await this._fetch(endpointUrl, { body: searchParams });
    const data = await response.json();
    return new WutopiaCartoon(data.cartoon);
  }

  public async getMangaList(pageNo = 1, pageSize = 50): Promise<string[]> {
    const endpointUrl = new URL(
      "/mobile/cartoon-collection/search-fuzzy",
      this.baseUrl,
    );
    const searchParams = new URLSearchParams();
    searchParams.append("order", "0");
    searchParams.append("pageNo", pageNo.toString());
    searchParams.append("pageSize", pageSize.toString());
    const response = await this._fetch(endpointUrl, { body: searchParams });
    const data = await response.json();
    return data.list.map(this._mapCartoon);
  }

  public async getChapter(chapterId: string): Promise<WutopiaChapter> {
    const endpointUrl = new URL("/mobile/chapter/get", this.baseUrl);
    const searchParams = new URLSearchParams();
    searchParams.append("id", chapterId.toString());
    searchParams.append("linkId", "0");
    const response = await this._fetch(endpointUrl, { body: searchParams });
    const data = await response.json();
    return new WutopiaChapter(data.chapter);
  }

  public async getChapterList(cartoonId: string): Promise<string[]> {
    const endpointUrl = new URL(
      "/mobile/cartoon-collection/list-chapter",
      this.baseUrl,
    );
    const searchParams = new URLSearchParams();
    searchParams.append("id", cartoonId.toString());
    searchParams.append("linkId", "0");
    searchParams.append("pageNo", "1");
    searchParams.append("pageSize", "99999");
    searchParams.append("sort", "0");
    const response = await this._fetch(endpointUrl, { body: searchParams });
    const data = await response.json();
    return data.list.map(this._mapChapter);
  }

  public async getUpdateList(): Promise<string[]> {
    const endpointUrl = new URL("/mobile/home-page/query", this.baseUrl);
    const searchParams = new URLSearchParams();
    searchParams.append("type", "8");
    searchParams.append("pageNo", "1");
    searchParams.append("pageSize", "15");
    const response = await this._fetch(endpointUrl, { body: searchParams });
    const data = await response.json();
    const cartoonList = data.list.map(this._mapCartoon);
    const md5 = new Md5().update(JSON.stringify(cartoonList)).toString();
    if (this.lastUpdate !== md5) {
      this.lastUpdate = md5;
      return cartoonList;
    }
    return [];
  }

  private _mapCartoon(cartoonData: WutopiaCartoonData): string {
    return cartoonData.id.toString();
  }

  private _mapChapter(chapterData: WutopiaChapterData): string {
    return chapterData.id.toString();
  }
}

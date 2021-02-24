import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import type { HTMLDocument } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import type { BaseAPIOptions } from "./types.ts";
import type { BaseChapter, BaseManga } from "./models.ts";

export default class BaseAPI {
  public baseUrl: string;

  constructor(options: BaseAPIOptions) {
    this.baseUrl = options.baseUrl;
  }

  protected _fetch(
    url: Request | URL | string,
    init?: RequestInit,
  ): Promise<Response> {
    return fetch(url, init).then((response: Response): Response => {
      if (response.status >= 400) {
        throw new Error(response.statusText);
      }
      return response;
    });
  }

  protected async _fetchHTML(
    url: Request | URL | string,
    init?: RequestInit,
  ): Promise<HTMLDocument | void> {
    const response = await this._fetch(url, init);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc || undefined;
  }
}

export interface BaseAPIInterface extends BaseAPI {
  getChapter(chapterId: string): Promise<BaseChapter | void>;
  getChapterList(mangaId: string): Promise<string[]>;
  getManga(mangaId: string): Promise<BaseManga | void>;
  getMangaList(pageNo: number): Promise<string[]>;
  getUpdateList(): Promise<string[]>;
}

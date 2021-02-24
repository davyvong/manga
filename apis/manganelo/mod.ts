import { Md5 } from "https://deno.land/std/hash/md5.ts";
import type { Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import { ManganeloChapter, ManganeloManga } from "./models.ts";
import BaseAPI from "../base/mod.ts";

export default class ManganeloAPI extends BaseAPI {
  private lastUpdate?: string;

  constructor() {
    super({
      baseUrl: "https://manganelo.com/",
    });
  }

  public async getChapter(chapterId: string): Promise<ManganeloChapter | void> {
    const endpointUrl = new URL(`/chapter/${chapterId}`, this.baseUrl);
    const doc = await this._fetchHTML(endpointUrl, {});
    return doc ? new ManganeloChapter({ doc, chapterId }) : undefined;
  }

  public async getChapterList(mangaId: string): Promise<string[]> {
    const endpointUrl = new URL(`/manga/${mangaId}`, this.baseUrl);
    const doc = await this._fetchHTML(endpointUrl, {});
    if (doc) {
      const chapterList: string[] = [];
      const matches = doc.querySelectorAll(".chapter-name");
      for (let i = 0; i < matches.length; i++) {
        const element = <Element> matches[i];
        const chapterId = element.getAttribute("href");
        if (chapterId) {
          chapterList.push(chapterId.substr(30));
        }
      }
      return chapterList;
    }
    return [];
  }

  public async getManga(mangaId: string): Promise<ManganeloManga | void> {
    const endpointUrl = new URL(`/manga/${mangaId}`, this.baseUrl);
    const doc = await this._fetchHTML(endpointUrl, {});
    return doc ? new ManganeloManga({ doc, mangaId }) : undefined;
  }

  public async getMangaList(pageNo = 1): Promise<string[]> {
    const endpointUrl = new URL(`/genre-all/${pageNo}`, this.baseUrl);
    const doc = await this._fetchHTML(endpointUrl, {});
    if (doc) {
      const mangaList = [];
      const matches = doc.querySelectorAll(".genres-item-name");
      for (let i = 0; i < matches.length; i++) {
        const element = <Element> matches[i];
        const mangaId = element.getAttribute("href");
        if (mangaId) {
          mangaList.push(mangaId.substr(28));
        }
      }
      return mangaList;
    }
    return [];
  }

  public async getUpdateList(): Promise<string[]> {
    const mangaList = await this.getMangaList();
    const md5 = new Md5().update(JSON.stringify(mangaList)).toString();
    if (this.lastUpdate !== md5) {
      this.lastUpdate = md5;
      return mangaList;
    }
    return [];
  }
}

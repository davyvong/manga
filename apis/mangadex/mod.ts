import type { Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import { MangaDexChapter, MangaDexManga } from "./models.ts";
import type { MangaDexChapterData } from "./types.ts";
import BaseAPI from "../base/mod.ts";

export default class MangaDexAPI extends BaseAPI {
  private lastUpdate: Set<string> = new Set();

  constructor() {
    super({
      baseUrl: "https://mangadex.org/",
    });
    this._reduceChapters = this._reduceChapters.bind(this);
  }

  public async getChapter(chapterId: string): Promise<MangaDexChapter> {
    const endpointUrl = new URL(`/api/v2/chapter/${chapterId}`, this.baseUrl);
    const response = await this._fetch(endpointUrl, {});
    const { data } = await response.json();
    return new MangaDexChapter(data);
  }

  public async getChapterList(mangaId: string): Promise<string[]> {
    const endpointUrl = new URL(
      `/api/v2/manga/${mangaId}/chapters`,
      this.baseUrl,
    );
    const response = await this._fetch(endpointUrl, {});
    const { data } = await response.json();
    return data.chapters.reduce(this._reduceChapters, []);
  }

  public async getManga(mangaId: string): Promise<MangaDexManga> {
    const endpointUrl = new URL(`/api/v2/manga/${mangaId}`, this.baseUrl);
    const response = await this._fetch(endpointUrl, {});
    const { data } = await response.json();
    return new MangaDexManga({ ...data, id: mangaId });
  }

  public async getMangaList(pageNo = 1): Promise<string[]> {
    const endpointUrl = new URL(`/titles/0/${pageNo}`, this.baseUrl);
    const doc = await this._fetchHTML(endpointUrl, {});
    if (doc) {
      const mangaList: string[] = [];
      const matches = doc.querySelectorAll(".manga-entry");
      for (let i = 0; i < matches.length; i++) {
        const element = <Element> matches[i];
        const mangaId = element.getAttribute("data-id");
        if (mangaId) {
          mangaList.push(mangaId);
        }
      }
      return mangaList;
    }
    return [];
  }

  public async getUpdateList(): Promise<string[]> {
    const endpointUrl = new URL("/updates", this.baseUrl);
    const doc = await this._fetchHTML(endpointUrl, {});
    if (doc) {
      const chapterList: string[] = [];
      const mangaList: Set<string> = new Set();
      let lastMangaId;
      const matches = doc.querySelectorAll(".text-truncate");
      for (let i = 0; i < Math.min(matches.length, 200); i++) {
        const element = <Element> matches[i];
        if (element.classList.contains("manga_title")) {
          const mangaHref = element.getAttribute("href");
          if (!mangaHref) continue;
          const mangaIdMatch = mangaHref.match(/(\d+)/g);
          if (!mangaIdMatch) continue;
          const [mangaId] = mangaIdMatch;
          if (!mangaId) continue;
          lastMangaId = mangaId;
        } else {
          const chapterHref = element.getAttribute("href");
          if (!chapterHref) continue;
          const chapterIdMatch = chapterHref.match(/(\d+)/g);
          if (!chapterIdMatch) continue;
          const [chapterId] = chapterIdMatch;
          if (!chapterId) continue;
          chapterList.push(chapterId);
          if (!this.lastUpdate.has(chapterId) && lastMangaId) {
            mangaList.add(lastMangaId);
          }
        }
      }
      this.lastUpdate = new Set(chapterList);
      return Array.from(mangaList);
    }
    return [];
  }

  private _reduceChapters(
    chapterList: string[],
    chapterData: MangaDexChapterData,
  ): string[] {
    if (chapterData.language === "gb") {
      chapterList.push(chapterData.id.toString());
    }
    return chapterList;
  }
}

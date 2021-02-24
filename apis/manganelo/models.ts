import type {
  Element,
  HTMLDocument,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import type { ManganeloChapterData, ManganeloMangaData } from "./types.ts";
import { BaseChapter, BaseManga } from "../base/models.ts";

export class ManganeloChapter extends BaseChapter {
  constructor(data: ManganeloChapterData, id?: string) {
    const [mangaId, chapterIndex] = data.chapterId.split("/chapter_");
    super({
      chapterIndex: Number(chapterIndex),
      pageList: [],
      serverUrl: "",
      sourceChapterId: data.chapterId,
      sourceMangaId: mangaId,
      title: ("Chapter " + chapterIndex).trim(),
    }, id);
    this._mapPageList = this._mapPageList.bind(this);
    const pageList = this._queryPageList(data.doc);
    if (pageList.length > 0) {
      const [firstPage] = pageList;
      this.serverUrl = this._lookupServerUrl(firstPage);
      this.pageList = pageList.map(
        this._mapPageList(this.serverUrl.length + 1),
      );
    }
  }

  private _lookupServerUrl(pageUrl: string): string {
    const urlParts = pageUrl.split("/");
    urlParts.pop();
    return urlParts.join("/");
  }

  private _mapPageList(length: number) {
    return function (pageUrl: string): string {
      return pageUrl.substring(length);
    };
  }

  private _queryPageList(doc: HTMLDocument): string[] {
    const selector = ".container-chapter-reader img";
    const matches = doc.querySelectorAll(selector);
    if (matches.length > 0) {
      const pageList = [];
      for (let i = 0; i < matches.length; i++) {
        const element = <Element> matches[i];
        const imageUrl = element.getAttribute("src");
        if (imageUrl) {
          pageList.push(imageUrl);
        }
      }
      return pageList;
    }
    return [];
  }
}

export class ManganeloManga extends BaseManga {
  constructor(data: ManganeloMangaData, id?: string) {
    super({
      author: "",
      description: "",
      genres: [],
      imageUrl: undefined,
      isFinished: undefined,
      isNSFW: undefined,
      sourceMangaId: data.mangaId,
      title: "",
    }, id);

    this.author = this._queryAuthor(data.doc);
    this.description = this._queryDescription(data.doc);
    this.genres = this._queryGenres(data.doc);
    this.imageUrl = this._queryImageUrl(data.doc);
    this.isFinished = this._queryIsFinished(data.doc);
    this.isNSFW = this._queryIsNSFW(data.doc);
    this.title = this._queryTitle(data.doc);
  }

  private _queryAuthor(doc: HTMLDocument): string {
    const selector = ".variations-tableInfo tbody tr .table-value .a-h";
    const matches = doc.querySelectorAll(selector);
    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const element = <Element> matches[i];
        const href = element.getAttribute("href");
        if (href && href.startsWith("https://manganelo.com/author/")) {
          return element.textContent.trim();
        }
      }
    }
    return "";
  }

  private _queryDescription(doc: HTMLDocument): string {
    const match = doc.querySelector(".panel-story-info-description");
    if (match) {
      return match.textContent.trim().substr(14);
    }
    return "";
  }

  private _queryGenres(doc: HTMLDocument): string[] {
    const selector = ".variations-tableInfo tbody tr .table-value .a-h";
    const matches = doc.querySelectorAll(selector);
    if (matches.length > 0) {
      const genres = [];
      for (let i = 0; i < matches.length; i++) {
        const element = <Element> matches[i];
        const href = element.getAttribute("href");
        if (href && href.startsWith("https://manganelo.com/genre-")) {
          genres.push(element.textContent.trim());
        }
      }
      return genres;
    }
    return [];
  }

  private _queryImageUrl(doc: HTMLDocument): string | undefined {
    const match = doc.querySelector(".info-image img");
    if (match) {
      return match.getAttribute("src") || undefined;
    }
    return undefined;
  }

  private _queryIsFinished(doc: HTMLDocument): boolean | undefined {
    const selector = ".variations-tableInfo tbody tr .table-label .info-status";
    const match = doc.querySelector(selector);
    if (match) {
      const { childNodes } = match.parentNode!.parentNode!;
      for (let i = 0; i < childNodes.length; i++) {
        if (!childNodes[i]) continue;
        const element = <Element> childNodes[i];
        if (element.className === "table-value") {
          return element.textContent.trim() === "Completed";
        }
      }
    }
    return undefined;
  }

  private _queryIsNSFW(doc: HTMLDocument): boolean | undefined {
    const nsfwGenres = ["Adult", "Ecchi"];
    return this._queryGenres(doc).some((genre: string): boolean =>
      nsfwGenres.includes(genre)
    );
  }

  private _queryTitle(doc: HTMLDocument): string {
    const match = doc.querySelector(".story-info-right > h1");
    if (match) {
      return match.textContent.trim();
    }
    return "";
  }
}

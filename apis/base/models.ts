import type { BaseChapterData, BaseMangaData } from "./types.ts";

export class BaseChapter {
  public id?: string;
  public chapterIndex: number;
  public nextChapterId?: string;
  public pageList: string[] = [];
  public previousChapterId?: string;
  public serverUrl: string;
  public sourceChapterId: string;
  public sourceMangaId: string;
  public sourceUploader?: string;
  public title: string;

  constructor(data: BaseChapterData, id?: string) {
    this.id = id;
    this.chapterIndex = data.chapterIndex;
    this.nextChapterId = data.nextChapterId;
    this.pageList = data.pageList;
    this.previousChapterId = data.previousChapterId;
    this.serverUrl = data.serverUrl;
    this.sourceChapterId = data.sourceChapterId;
    this.sourceMangaId = data.sourceMangaId;
    this.sourceUploader = data.sourceUploader;
    this.title = data.title;
  }
}

export class BaseManga {
  public author: string;
  public description: string;
  public genres: string[] = [];
  public id?: string;
  public imageUrl?: string;
  public isFinished?: boolean;
  public isNSFW?: boolean;
  public sourceMangaId: string;
  public title: string;

  constructor(data: BaseMangaData, id?: string) {
    this.author = data.author;
    this.description = data.description;
    this.genres = data.genres;
    this.id = id;
    this.imageUrl = data.imageUrl;
    this.isFinished = data.isFinished;
    this.isNSFW = data.isNSFW;
    this.sourceMangaId = data.sourceMangaId;
    this.title = data.title;
  }
}

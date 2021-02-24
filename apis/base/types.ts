export type BaseAPIOptions = {
  baseUrl: string;
};

export type BaseChapterData = {
  chapterIndex: number;
  nextChapterId?: string;
  pageList: string[];
  previousChapterId?: string;
  serverUrl: string;
  sourceChapterId: string;
  sourceMangaId: string;
  sourceUploader?: string;
  title: string;
};

export type BaseMangaData = {
  author: string;
  browseIndex?: number;
  description: string;
  genres: string[];
  imageUrl?: string;
  isFinished?: boolean;
  isNSFW?: boolean;
  sourceMangaId: string;
  title: string;
};

export type MangaDexGroupData = {
  id: number;
  name: string;
};

export type MangaDexChapterData = {
  chapter: string;
  comments: number;
  groups: MangaDexGroupData[];
  hash: string;
  id: number;
  language: string;
  mangaId: number;
  mangaTitle: string;
  pages?: string[];
  server?: string;
  serverFallback?: string;
  status: string;
  timestamp: number;
  title: string;
  uploader: number;
  views: number;
  volume: string;
};

export type MangaDexMangaData = {
  altTitles: string[];
  artist: string[];
  author: string[];
  comments: number;
  description: string;
  follows: number;
  id: number;
  isHentai: number;
  lastChapter: string;
  lastUploaded: number;
  lastVolume: unknown;
  links: Record<string, string>;
  mainCover: string;
  publication: {
    demographic: number;
    language: string;
    status: number;
  };
  rating: Record<string, number>;
  relations: unknown[];
  tags: number[];
  title: string;
  views: number;
};

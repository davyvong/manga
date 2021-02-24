import type { HTMLDocument } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

export type ManganeloChapterData = {
  chapterId: string;
  doc: HTMLDocument;
};

export type ManganeloMangaData = {
  doc: HTMLDocument;
  mangaId: string;
};

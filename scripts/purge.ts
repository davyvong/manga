import "https://deno.land/x/dotenv/load.ts";

import { ObjectId } from "https://deno.land/x/mongo@v0.12.1/mod.ts";
import type { WithID } from "https://deno.land/x/mongo@v0.12.1/ts/collection.ts";

import type { BaseChapter, BaseManga } from "../apis/base/models.ts";
import connectToMongoDB from "../utils/connect-to-mongo.ts";

const mongoDB = await connectToMongoDB();
const source = Deno.env.get("MONGODB_SOURCE")!;
const chapterCollection = mongoDB.collection<BaseChapter>(source + "Chapters");
const mangaCollection = mongoDB.collection<BaseManga>(source + "Mangas");

const limit = 500;

let skipChapter = 0;
let skipManga = 0;

const chapterOrphanMap: Record<string, boolean> = {};

async function deleteOrphanChapters(): Promise<void> {
  console.log(skipChapter, "querying chapter collection");
  const chapterList = await chapterCollection.aggregate([
    { $project: { _id: 1, sourceMangaId: 1, title: 1 } },
    { $skip: skipChapter },
    { $limit: limit },
  ]);
  skipChapter += limit;
  if (chapterList.length === 0) {
    return;
  }
  for (let i = 0; i < chapterList.length; i++) {
    const chapter = <BaseChapter & WithID> chapterList[i];
    if (chapterOrphanMap[chapter.sourceMangaId] === undefined) {
      const mangaCount = await chapterCollection.count(
        { sourceMangaId: chapter.sourceMangaId },
      );
      if (mangaCount === 0) {
        skipChapter -= 1;
        console.log(skipChapter - limit + i, "deleting", chapter.title.toLowerCase());
        await chapterCollection.deleteMany({ sourceMangaId: chapter.sourceMangaId });
      }
      chapterOrphanMap[chapter.sourceMangaId] = mangaCount === 0;
    }
  }
  deleteOrphanChapters();
}

async function deleteOrphanMangas(): Promise<void> {
  console.log(skipManga, "querying manga collection");
  const mangaList = await mangaCollection.aggregate([
    { $project: { _id: 1, sourceMangaId: 1, title: 1 } },
    { $skip: skipManga },
    { $limit: limit },
  ]);
  skipManga += limit;
  if (mangaList.length === 0) {
    return;
  }
  for (let i = 0; i < mangaList.length; i++) {
    const manga = <BaseManga & WithID> mangaList[i];
    const chapterCount = await chapterCollection.count(
      { sourceMangaId: manga.sourceMangaId },
    );
    if (chapterCount === 0) {
      skipManga--;
      console.log(skipManga - limit + i, "deleting", manga.title.toLowerCase());
      await mangaCollection.deleteOne({ sourceMangaId: manga.sourceMangaId });
    }
  }
  deleteOrphanMangas();
}

await chapterCollection.deleteMany({ pageList: { $exists: true, $size: 0 } });

deleteOrphanChapters();

import "https://deno.land/x/dotenv/load.ts";

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
  while (true) {
    console.log(`(${skipChapter})`);
    const chapterList = await chapterCollection.aggregate([
      { $project: { _id: 1, sourceMangaId: 1, title: 1 } },
      { $skip: skipChapter },
      { $limit: limit },
    ]);
    if (chapterList.length === 0) {
      break;
    }
    let adjustSkip = 0;
    for (let i = 0; i < chapterList.length; i++) {
      const chapter = <BaseChapter & WithID> chapterList[i];
      if (chapterOrphanMap[chapter.sourceMangaId] === undefined) {
        const manga = await mangaCollection.findOne(
          { sourceMangaId: chapter.sourceMangaId },
        );
        if (manga === null) {
          console.log(
            `${skipChapter} > delete(sourceMangaId: ${chapter.sourceMangaId})`,
          );
          await chapterCollection.deleteMany({
            sourceMangaId: chapter.sourceMangaId,
          });
          adjustSkip--;
        }
        chapterOrphanMap[chapter.sourceMangaId] = true;
      }
    }
    skipChapter += limit + adjustSkip;
  }
}

async function deleteOrphanMangas(): Promise<void> {
  while (true) {
    console.log(`(${skipManga})`);
    const mangaList = await mangaCollection.aggregate([
      { $project: { _id: 1, sourceMangaId: 1, title: 1 } },
      { $skip: skipManga },
      { $limit: limit },
    ]);
    if (mangaList.length === 0) {
      break;
    }
    let adjustSkip = 0;
    for (let i = 0; i < mangaList.length; i++) {
      const manga = <BaseManga & WithID> mangaList[i];
      const chapterCount = await chapterCollection.count(
        { sourceMangaId: manga.sourceMangaId },
      );
      if (chapterCount === 0) {
        console.log(
          `(${skipManga}) > delete(sourceMangaId: ${manga.sourceMangaId})`,
        );
        await mangaCollection.deleteOne({ sourceMangaId: manga.sourceMangaId });
        adjustSkip--;
      }
    }
    skipManga += limit + adjustSkip;
  }
}

await mangaCollection.deleteMany({ browseIndex: { $lt: 1607836968244 } });
await deleteOrphanChapters();

await chapterCollection.deleteMany({ pageList: { $exists: true, $size: 0 } });
await deleteOrphanMangas();

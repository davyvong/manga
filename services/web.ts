import "https://deno.land/x/dotenv/load.ts";

import { ObjectId } from "https://deno.land/x/mongo@v0.12.1/mod.ts";
import { Application, Router } from "https://deno.land/x/oak@v6.2.0/mod.ts";
import {
  adapterFactory,
  engineFactory,
  viewEngine,
} from "https://raw.githubusercontent.com/deligenius/view-engine/master/mod.ts";

import type { BaseChapter, BaseManga } from "../apis/base/models.ts";
import { reimportByChapterId, reimportByMangaId } from "../scripts/reimport.ts";
import connectToMongoDB from "../utils/connect-to-mongo.ts";

const app = new Application();
const router = new Router();

const oakAdapter = adapterFactory.getOakAdapter();
const ejsEngine = engineFactory.getEjsEngine();

app.use(viewEngine(oakAdapter, ejsEngine));

const mongoDB = await connectToMongoDB();
const source = Deno.env.get("MONGODB_SOURCE")!;
const chapterCollection = mongoDB.collection<BaseChapter>(source + "Chapters");
const mangaCollection = mongoDB.collection<BaseManga>(source + "Mangas");

router
  .get("/", async (context) => {
    context.response.redirect("/browse/1");
  })
  .get("/browse", (context) => {
    context.response.redirect("/browse/1");
  })
  .get("/browse/:pageNumber", async (context) => {
    const page = Number(context.params.pageNumber);
    const limit = 24;
    const skip = limit * (page - 1);
    const total = await mangaCollection.count();
    const last = Math.ceil(total / limit);
    const list = await mangaCollection.aggregate([
      {
        $project: {
          _id: 1,
          browseIndex: 1,
          description: 1,
          imageUrl: 1,
          isFinished: 1,
          title: 1,
        },
      },
      { $sort: { browseIndex: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    context.render(
      "./templates/manga-list.ejs",
      { last, limit, list, page, skip, total },
    );
  })
  .get("/chapters/:chapterId", async (context) => {
    const { chapterId } = context.params;
    await reimportByChapterId(chapterId!);
    const chapterDoc = await chapterCollection.findOne({ _id: ObjectId(chapterId!) });
    if (chapterDoc === null) return;
    const [previousChapter] = await chapterCollection.aggregate([
      {
        $match: {
          chapterIndex: { $lt: chapterDoc.chapterIndex },
          sourceMangaId: chapterDoc.sourceMangaId,
        },
      },
      { $project: { _id: 1, chapterIndex: 1 } },
      { $sort: { chapterIndex: -1 } },
      { $limit: 1 },
    ]);
    const [nextChapter] = await chapterCollection.aggregate([
      {
        $match: {
          chapterIndex: { $gt: chapterDoc.chapterIndex },
          sourceMangaId: chapterDoc.sourceMangaId,
        },
      },
      { $project: { _id: 1, chapterIndex: 1 } },
      { $sort: { chapterIndex: 1 } },
      { $limit: 1 },
    ]);
    const mangaDoc = await mangaCollection.findOne(
      { sourceMangaId: chapterDoc.sourceMangaId },
    );
    context.render(
      "./templates/chapter-detail.ejs",
      {
        chapter: chapterDoc,
        manga: mangaDoc,
        next: nextChapter,
        previous: previousChapter,
      },
    );
  })
  .get("/mangas/:mangaId", async (context) => {
    const { mangaId } = context.params;
    await reimportByMangaId(mangaId!);
    const mangaDoc = await mangaCollection.findOne({ _id: ObjectId(mangaId!) });
    if (mangaDoc === null) return;
    const chapters = await chapterCollection.aggregate([
      { $match: { sourceMangaId: mangaDoc.sourceMangaId } },
      { $project: { _id: 1, chapterIndex: 1, sourceUploader: 1, title: 1 } },
      { $sort: { chapterIndex: -1 } },
    ]);
    context.render(
      "./templates/manga-detail.ejs",
      { chapters, manga: mangaDoc },
    );
  })
  .get("/search", async (context) => {
    context.render("./templates/search-detail.ejs");
  })
  .get("/search/:keywords", async (context) => {
    const { keywords } = context.params;
    const results = await mangaCollection.aggregate([
      { $match: { $text: { $search: keywords! } } },
      { $sort: { score: { $meta: "textScore" } } },
      { $limit: 24 },
    ]);
    context.render("./templates/search-list.ejs", { keywords, list: results });
  });

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 3000 });

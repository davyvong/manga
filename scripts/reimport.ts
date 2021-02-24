import "https://deno.land/x/dotenv/load.ts";

import { ObjectId } from "https://deno.land/x/mongo@v0.12.1/mod.ts";

import type { BaseChapter, BaseManga } from "../apis/base/models.ts";
import RSMQ from "../packages/rsmq/mod.ts";
import connectToMongoDB from "../utils/connect-to-mongo.ts";
import connectToRedis from "../utils/connect-to-redis.ts";
import errorHandler from "../utils/error-handler.ts";
import isMongoId from "../utils/is-mongoid.ts";

const mongoDB = await connectToMongoDB();
const source = Deno.env.get("MONGODB_SOURCE")!;
const chapterCollection = mongoDB.collection<BaseChapter>(source + "Chapters");
const mangaCollection = mongoDB.collection<BaseManga>(source + "Mangas");

const redisClient = await connectToRedis();
const messageQueue = new RSMQ();
await messageQueue.connect({ client: redisClient });
const queueName = "mangadex";
await messageQueue.createQueue({ name: queueName });

export async function reimportById(id: string): Promise<void> {
  await reimportByChapterId(id).catch(errorHandler);
  await reimportByMangaId(id).catch(errorHandler);
}

export async function reimportByChapterId(id: string): Promise<boolean> {
  const chapterDoc = await chapterCollection.findOne({ _id: ObjectId(id) });
  if (!chapterDoc) return false;
  await sendMessage(source, { chapterId: chapterDoc.sourceChapterId });
  return true;
}

export async function reimportByMangaId(id: string): Promise<boolean> {
  const mangaDoc = await mangaCollection.findOne({ _id: ObjectId(id) });
  if (!mangaDoc) return false;
  await sendMessage(source, { mangaId: mangaDoc.sourceMangaId });
  return true;
}

async function sendMessage(
  queueName: string,
  message: Record<string, string>,
): Promise<void> {
  if (!await messageQueue.getQueue(queueName)) {
    await messageQueue.createQueue({ name: queueName });
  }
  await messageQueue.sendMessage(queueName, JSON.stringify(message));
}

if (Deno.args.length > 0) {
  for (let i = 0; i < Deno.args.length; i++) {
    const arg = Deno.args[i];
    if (isMongoId(arg)) {
      console.log(`importing ${arg}`);
      await reimportById(arg);
    }
  }
}

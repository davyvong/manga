import "https://deno.land/x/dotenv/load.ts";

import type { WithID } from "https://deno.land/x/mongo@v0.12.1/ts/collection.ts";

import type { BaseChapter } from "../apis/base/models.ts";
import TwitterAPI from "../apis/twitter/mod.ts";
import connectToMongoDB from "../utils/connect-to-mongo.ts";

const twitterAPI = new TwitterAPI({
  accessTokenKey: Deno.env.get("TWITTER_ACCESS_TOKEN")!,
  accessTokenSecret: Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")!,
  consumerKey: Deno.env.get("TWITTER_CONSUMER_API_KEY")!,
  consumerSecret: Deno.env.get("TWITTER_CONSUMER_API_SECRET")!,
});

const mongoDB = await connectToMongoDB();
const source = Deno.env.get("MONGODB_SOURCE")!;
const chapterCollection = mongoDB.collection<BaseChapter>(source + "Chapters");

const recipientList = Deno.env.get("TWITTER_RECIPIENTS")!.split(",");
const retryInterval = 5 * 60 * 1000;

let lastChapter: BaseChapter & WithID;

async function checkForLatest(): Promise<void> {
  console.log("fetching updates");
  const [chapter] = await chapterCollection.aggregate([
    { $match: { sourceMangaId: "31477" } },
    { $project: { _id: 1, chapterIndex: 1 } },
    { $sort: { chapterIndex: -1 } },
    { $limit: 1 },
  ]);
  if (!lastChapter) {
    lastChapter = chapter;
  }
  if (chapter.chapterIndex > lastChapter.chapterIndex) {
    lastChapter = chapter;
    const message =
      `Chapter ${chapter.chapterIndex} is out!\nmanga.davyvong.com/chapters/${chapter._id.$oid}`;
    for (let i = 0; i < recipientList.length; i++) {
      await twitterAPI.sendDirectMessage(message, recipientList[i]).catch(
        console.log,
      );
    }
  }
  setTimeout(checkForLatest, retryInterval);
}

checkForLatest();

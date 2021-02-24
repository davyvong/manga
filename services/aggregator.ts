import "https://deno.land/x/dotenv/load.ts";

import RSMQ from "../packages/rsmq/mod.ts";
import connectToRedis from "../utils/connect-to-redis.ts";

const redisClient = await connectToRedis();

const messageQueue = new RSMQ();
await messageQueue.connect({ client: redisClient });

const workerList = [
  "../workers/processors/mangadex.ts",
  "../workers/crawlers/mangadex.ts",
];

for (let i = 0; i < workerList.length; i++) {
  const fileUrl = new URL(workerList[i], import.meta.url).href;
  new Worker(fileUrl, { deno: true, type: "module" });
}

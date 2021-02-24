import type { Redis } from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import * as DenoRedis from "https://denopkg.com/keroxp/deno-redis/mod.ts";

export default async function connectToRedis(): Promise<Redis> {
  const redisClient = await DenoRedis.connect({
    hostname: Deno.env.get("REDIS_HOSTNAME")!,
    port: Deno.env.get("REDIS_PORT"),
  });
  return redisClient;
}

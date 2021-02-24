import type { Database } from "https://deno.land/x/mongo@v0.12.1/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.12.1/mod.ts";

export default async function connectToMongoDB(): Promise<Database> {
  const mongoClient = new MongoClient();
  mongoClient.connectWithUri(Deno.env.get("MONGODB_URI")!);
  const mongoDatabase = mongoClient.database(Deno.env.get("MONGODB_DATABASE")!);
  return mongoDatabase;
}

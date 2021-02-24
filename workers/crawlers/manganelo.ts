import BaseCrawler from "./base.ts";
import ManganeloAPI from "../../apis/manganelo/mod.ts";

const startPage = Deno.env.get("MANGANELO_START_PAGE");

new BaseCrawler({
  currentPage: startPage ? Number(startPage) : undefined,
  queueName: "manganelo",
  sourceAPI: new ManganeloAPI(),
}).start();

import BaseCrawler from "./base.ts";
import MangaDexAPI from "../../apis/mangadex/mod.ts";

const startPage = Deno.env.get("MANGADEX_START_PAGE");

new BaseCrawler({
  currentPage: startPage ? Number(startPage) : undefined,
  queueName: "mangadex",
  sourceAPI: new MangaDexAPI(),
  updateMode: true,
}).start();

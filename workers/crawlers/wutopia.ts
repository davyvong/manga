import BaseCrawler from "./base.ts";
import WutopiaAPI from "../../apis/wutopia/mod.ts";

const startPage = Deno.env.get("WUTOPIA_START_PAGE");

new BaseCrawler({
  currentPage: startPage ? Number(startPage) : undefined,
  queueName: "wutopia",
  sourceAPI: new WutopiaAPI(),
}).start();

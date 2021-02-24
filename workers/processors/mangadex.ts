import BaseProcessor from "./base.ts";
import MangaDexAPI from "../../apis/mangadex/mod.ts";

new BaseProcessor({
  queueName: "mangadex",
  sourceAPI: new MangaDexAPI(),
}).start();

import BaseProcessor from "./base.ts";
import ManganeloAPI from "../../apis/manganelo/mod.ts";

new BaseProcessor({
  queueName: "manganelo",
  sourceAPI: new ManganeloAPI(),
}).start();

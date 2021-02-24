import BaseProcessor from "./base.ts";
import WutopiaAPI from "../../apis/wutopia/mod.ts";

new BaseProcessor({
  queueName: "wutopia",
  sourceAPI: new WutopiaAPI(),
}).start();

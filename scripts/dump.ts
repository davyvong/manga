import { ensureDir } from "https://deno.land/std/fs/mod.ts";

import MangaDexAPI from "../apis/mangadex/mod.ts";
import ManganeloAPI from "../apis/manganelo/mod.ts";
import WutopiaAPI from "../apis/wutopia/mod.ts";

const AsyncFunction = (async () => {}).constructor;

const mangaDexAPI = new MangaDexAPI();
const manganeloAPI = new ManganeloAPI();
const wutopiaAPI = new WutopiaAPI();

const dumpsToWrite = [
  {
    callback: async () => await mangaDexAPI.getChapter("1045638"),
    path: "./dumps/MangaDex.getChapter.txt",
  },
  {
    callback: async () => await mangaDexAPI.getChapterList("31477"),
    path: "./dumps/MangaDex.getChapterList.txt",
  },
  {
    callback: async () => await mangaDexAPI.getManga("31477"),
    path: "./dumps/MangaDex.getManga.txt",
  },
  {
    callback: async () => await mangaDexAPI.getMangaList(1),
    path: "./dumps/MangaDex.getMangaList.txt",
  },
  {
    callback: async () => await manganeloAPI.getChapter("pn918005/chapter_122"),
    path: "./dumps/Manganelo.getChapter.txt",
  },
  {
    callback: async () => await manganeloAPI.getChapterList("pn918005"),
    path: "./dumps/Manganelo.getChapterList.txt",
  },
  {
    callback: async () => await manganeloAPI.getManga("pn918005"),
    path: "./dumps/Manganelo.getManga.txt",
  },
  {
    callback: async () => await manganeloAPI.getMangaList(1),
    path: "./dumps/Manganelo.getMangaList.txt",
  },
  {
    callback: async () => await wutopiaAPI.getManga("84"),
    path: "./dumps/Wutopia.getManga.txt",
  },
  {
    callback: async () => await wutopiaAPI.getMangaList(1),
    path: "./dumps/Wutopia.getMangaList.txt",
  },
  {
    callback: async () => await wutopiaAPI.getChapter("5361"),
    path: "./dumps/Wutopia.getChapter.txt",
  },
  {
    callback: async () => await wutopiaAPI.getChapterList("84"),
    path: "./dumps/Wutopia.getChapterList.txt",
  },
];

async function createDataDumps(): Promise<void> {
  await ensureDir("./dumps");
  for (let i = 0; i < dumpsToWrite.length; i++) {
    const { callback, path } = dumpsToWrite[i];
    try {
      const payload = callback instanceof AsyncFunction
        ? await callback()
        : callback();
      console.log("Writing", path);
      await Deno.writeTextFile(path, JSON.stringify(payload, null, 2));
    } catch (error) {
      console.warn(error);
    }
  }
  Deno.exit();
}

createDataDumps();

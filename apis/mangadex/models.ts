import type {
  MangaDexChapterData,
  MangaDexGroupData,
  MangaDexMangaData,
} from "./types.ts";
import { BaseChapter, BaseManga } from "../base/models.ts";
import decodeHTMLEntities from "../../utils/decode-html-entities.ts";

export class MangaDexChapter extends BaseChapter {
  constructor(data: MangaDexChapterData, id?: string) {
    super({
      chapterIndex: Number(data.chapter),
      pageList: [],
      serverUrl: "",
      sourceChapterId: data.id.toString(),
      sourceMangaId: data.mangaId.toString(),
      sourceUploader: "",
      title: (data.title || ("Chapter " + data.chapter)).trim(),
    }, id);
    this._reduceGroups = this._reduceGroups.bind(this);
    if (Array.isArray(data.pages)) {
      this.pageList = data.pages;
    }
    if ((data.serverFallback || data.server) && data.hash) {
      this.serverUrl = (data.serverFallback || data.server) + data.hash + "/";
    }
    this.sourceUploader = data.groups.reduce(this._reduceGroups, "");
  }

  private _reduceGroups(
    groupList: string,
    groupData: MangaDexGroupData,
  ): string {
    if (!groupData.name) {
      return groupList;
    }
    if (!groupList) {
      return groupData.name.trim();
    }
    return groupList + ", " + groupData.name.trim();
  }
}

export class MangaDexManga extends BaseManga {
  constructor(data: MangaDexMangaData, id?: string) {
    super({
      author: data.author.join(","),
      description: decodeHTMLEntities(data.description).trim(),
      genres: [],
      imageUrl: new URL(data.mainCover, "https://mangadex.org/").toString(),
      isNSFW: Boolean(data.isHentai),
      sourceMangaId: data.id.toString(),
      title: data.title,
    }, id);
    this._reduceGenres = this._reduceGenres.bind(this);
    this.description = this._splitDescription(this.description);
    this.genres = data.tags.reduce(this._reduceGenres, []);
    this.isFinished = this._lookupStatus(data.publication.status);
  }

  private _lookupGenre(genreId: number): string | undefined {
    switch (genreId) {
      case 2:
        return "Action";
      case 3:
        return "Adventure";
      case 5:
        return "Comedy";
      case 6:
        return "Cooking";
      case 8:
        return "Drama";
      case 9:
        return "Ecchi";
      case 10:
        return "Fantasy";
      case 11:
        return "Gyaru";
      case 12:
        return "Harem";
      case 13:
        return "Historical";
      case 14:
        return "Horror";
      case 16:
        return "Martial Arts";
      case 17:
        return "Mecha";
      case 18:
        return "Medical";
      case 19:
        return "Music";
      case 20:
        return "Mystery";
      case 22:
        return "Psychologic";
      case 23:
        return "Romance";
      case 24:
        return "School Life";
      case 25:
        return "Sci-Fi";
      case 28:
        return "Shoujo Ai";
      case 30:
        return "Shounen Ai";
      case 31:
        return "Slice of Life";
      case 32:
        return "Smut";
      case 33:
        return "Sports";
      case 34:
        return "Supernatural";
      case 35:
        return "Tragedy";
      case 37:
        return "Yaoi";
      case 38:
        return "Yuri";
      case 40:
        return "Video Games";
      case 41:
        return "Isekai";
      case 43:
        return "Anthology";
      case 49:
        return "Gore";
      case 50:
        return "Sexual Violence";
      case 51:
        return "Crime";
      case 52:
        return "Magical Girls";
      case 53:
        return "Philosophical";
      case 54:
        return "Superhero";
      case 55:
        return "Thriller";
      case 56:
        return "Wuxia";
      case 57:
        return "Aliens";
      case 58:
        return "Animals";
      case 59:
        return "Crossdressing";
      case 60:
        return "Demons";
      case 61:
        return "Deliquents";
      case 62:
        return "Genderswap";
      case 63:
        return "Ghosts";
      case 64:
        return "Monster Girls";
      case 65:
        return "Loli";
      case 66:
        return "Magic";
      case 67:
        return "Military";
      case 68:
        return "Monsters";
      case 69:
        return "Ninja";
      case 70:
        return "Office Workers";
      case 71:
        return "Police";
      case 72:
        return "Post-Apocalyptic";
      case 73:
        return "Reincarnation";
      case 74:
        return "Reverse-Harem";
      case 75:
        return "Samurai";
      case 76:
        return "Shota";
      case 77:
        return "Survival";
      case 78:
        return "Time Travel";
      case 79:
        return "Vampires";
      case 80:
        return "Traditional Games";
      case 81:
        return "Virtual Reality";
      case 82:
        return "Zombies";
      case 83:
        return "Incest";
      case 84:
        return "Mafia";
      case 85:
        return "Villainess";
    }
  }

  private _lookupStatus(statusId: number): boolean | undefined {
    switch (statusId) {
      case 1:
        return false;
      case 2:
        return true;
    }
  }

  private _lookupTag(tagId: number): string | undefined {
    switch (tagId) {
      case 1:
        return "4-Koma";
      case 4:
        return "Award Winning";
      case 7:
        return "Doujinshi";
      case 21:
        return "Oneshot";
      case 36:
        return "Long Strip";
      case 42:
        return "Adaptation";
      case 44:
        return "Web Comic";
      case 45:
        return "Full Color";
      case 46:
        return "User Created";
      case 47:
        return "Official Colored";
      case 48:
        return "Fan Colored";
    }
  }

  private _reduceGenres(genreList: string[], genreId: number): string[] {
    const genreName = this._lookupGenre(genreId);
    if (genreName) {
      genreList.push(genreName);
    }
    return genreList;
  }

  private _splitDescription(description: string): string {
    return description.split("[spoiler]")[0];
  }
}

import type {
  WutopiaCartoonData,
  WutopiaCartoonTypeData,
  WutopiaChapterData,
  WutopiaChapterPictureData,
} from "./types.ts";
import { BaseChapter, BaseManga } from "../base/models.ts";

export class WutopiaCartoon extends BaseManga {
  constructor(data: WutopiaCartoonData, id?: string) {
    super({
      author: data.author,
      description: data.content,
      genres: [],
      imageUrl: data.picUrl,
      isFinished: Boolean(data.isFinish),
      isNSFW: Boolean(data.isShowEighteenTag),
      sourceMangaId: data.id.toString(),
      title: data.name,
    }, id);
    this._reduceGenres = this._reduceGenres.bind(this);
    this.genres = data.cartoonTypes.reduce(this._reduceGenres, []);
  }

  private _lookupGenre(cartoonType: WutopiaCartoonTypeData): string {
    return cartoonType.name;
  }

  private _reduceGenres(
    genreList: string[],
    cartoonType: WutopiaCartoonTypeData,
  ): string[] {
    const genreName = this._lookupGenre(cartoonType);
    if (genreName) {
      genreList.push(genreName);
    }
    return genreList;
  }
}

export class WutopiaChapter extends BaseChapter {
  constructor(data: WutopiaChapterData, id?: string) {
    super({
      chapterIndex: data.chapterIndex,
      pageList: [],
      serverUrl: "",
      sourceChapterId: data.id.toString(),
      sourceMangaId: data.cartoonCollectionId.toString(),
      title: ("Chapter " + data.chapterIndex).trim(),
    }, id);
    if (data.picList) {
      const [firstPage] = data.picList;
      if (firstPage) {
        const [serverUrl] = firstPage.picUrl.split(firstPage.pic);
        this.serverUrl = serverUrl;
      }
      this.pageList = data.picList.map(this._mapPageList);
    }
  }

  private _mapPageList(pictureData: WutopiaChapterPictureData): string {
    return pictureData.pic + "@70Q";
  }
}

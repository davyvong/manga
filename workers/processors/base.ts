import type {
  Database,
  FilterType,
} from "https://deno.land/x/mongo@v0.12.1/mod.ts";

import type { BaseAPIInterface } from "../../apis/base/mod.ts";
import RSMQ from "../../packages/rsmq/mod.ts";
import type { RSMQMessage } from "../../packages/rsmq/types.ts";
import connectToMongoDB from "../../utils/connect-to-mongo.ts";
import connectToRedis from "../../utils/connect-to-redis.ts";
import errorHandler from "../../utils/error-handler.ts";

export type BaseProcessorOptions = {
  queueName: string;
  sourceAPI: BaseAPIInterface;
};

const source = Deno.env.get("MONGODB_SOURCE")!;

export default class BaseProcessor {
  protected isReady = false;
  protected isRunning = false;
  protected messageQueue = new RSMQ();
  protected mongoDB!: Database;
  protected updateMode = false;
  protected queueName: string;
  protected retryCount = 0;
  protected retryCountLimit = 3;
  protected sourceAPI: BaseAPIInterface;

  constructor(options: BaseProcessorOptions) {
    this.queueName = options.queueName;
    this.sourceAPI = options.sourceAPI;
    this.start = this.start.bind(this);
    this._processTask = this._processTask.bind(this);
  }

  private async _initialize(): Promise<void> {
    this.mongoDB = await connectToMongoDB();
    const redisClient = await connectToRedis();
    await this.messageQueue.connect({ client: redisClient });
    await this.messageQueue.createQueue({ name: this.queueName });
    this.isReady = true;
  }

  public setQueue(queueName: string): void {
    this.queueName = queueName;
  }

  public async start(): Promise<void> {
    if (!this.isReady) {
      await this._initialize();
      setTimeout(this.start, 1000);
      return;
    }
    this.isRunning = true;
    this._processTask();
  }

  public stop(): void {
    this.isRunning = false;
  }

  protected async _processTask(): Promise<void> {
    if (!this.isRunning) {
      setTimeout(this._processTask, 1000);
      return;
    }
    const task = await this.messageQueue.popMessage(this.queueName);
    if (!task) {
      setTimeout(this._processTask, 5000);
      return;
    }
    await this._retryTask(task);
    this._processTask();
  }

  protected async _processData(task: RSMQMessage): Promise<void> {
    const message = JSON.parse(task.message);
    if (message.mangaId) {
      await this._processMangaData(task);
    } else if (message.chapterId) {
      await this._processChapterData(task);
    }
  }

  protected async _processChapterData(task: RSMQMessage): Promise<void> {
    const message = JSON.parse(task.message);
    const chapter = await this.sourceAPI.getChapter(message.chapterId)
      .catch(errorHandler);
    if (!chapter) {
      await this._retryTask(task);
      return;
    }
    if (chapter.pageList.length === 0) {
      console.log("skipping", chapter.title.toLowerCase());
      return;
    }
    console.log("processing", chapter.title.toLowerCase());
    const chapterUpdateResults = await this._updateOne(
      source + "Chapters",
      {
        sourceChapterId: chapter.sourceChapterId,
        sourceMangaId: chapter.sourceMangaId,
      },
      { $set: chapter },
    );
    if (chapterUpdateResults.upsertedId) {
      console.log(
        "inserted",
        chapter.title.toLowerCase(),
        `(ch ${chapter.chapterIndex})`,
      );
      await this._updateOne(
        source + "Mangas",
        { sourceMangaId: chapter.sourceMangaId },
        { $set: { browseIndex: this._getBrowseIndex() } },
      );
    }
  }

  protected async _processMangaData(task: RSMQMessage): Promise<void> {
    const message = JSON.parse(task.message);
    const manga = await this.sourceAPI.getManga(message.mangaId)
      .catch(errorHandler);
    if (!manga) {
      await this._retryTask(task);
      return;
    }
    if (manga.isNSFW) {
      console.log("skipping", manga.title.toLowerCase());
      return;
    }
    let chapterList = await this.sourceAPI.getChapterList(message.mangaId)
      .catch(errorHandler);
    if (!chapterList) {
      await this._retryTask(task);
      return;
    }
    if (chapterList.length === 0) {
      console.log("skipping", manga.title.toLowerCase());
      return;
    }
    console.log("processing", manga.title.toLowerCase());
    const mangaUpdateResults = await this._updateOne(
      source + "Mangas",
      { sourceMangaId: manga.sourceMangaId },
      {
        $set: manga,
        $setOnInsert: { browseIndex: this._getBrowseIndex() },
      },
    );
    if (!mangaUpdateResults.upsertedId && message.limit) {
      chapterList = chapterList.slice(0, message.limit);
    }
    for (let i = 0; i < chapterList.length; i++) {
      const chapterId = chapterList[i];
      const chapter = await this.sourceAPI.getChapter(chapterId)
        .catch(errorHandler);
      if (!chapter || chapter.pageList.length === 0) {
        continue;
      }
      const chapterUpdateResults = await this._updateOne(
        source + "Chapters",
        {
          sourceChapterId: chapter.sourceChapterId,
          sourceMangaId: chapter.sourceMangaId,
        },
        { $set: chapter },
      );
      if (chapterUpdateResults.upsertedId) {
        console.log(
          "inserted",
          manga.title.toLowerCase(),
          `(ch ${chapter.chapterIndex})`,
        );
        await this._updateOne(
          source + "Mangas",
          { sourceMangaId: chapter.sourceMangaId },
          { $set: { browseIndex: this._getBrowseIndex() } },
        );
      }
    }
  }

  protected async _retryTask(task: RSMQMessage): Promise<void> {
    if (this.retryCount > this.retryCountLimit) {
      this.retryCount = 0;
      return;
    }
    this.retryCount++;
    await this._processData(task);
    this.retryCount = 0;
  }

  private _getBrowseIndex(): number {
    return new Date().getTime();
  }

  protected async _updateOne(
    collectionName: string,
    query: FilterType<unknown>,
    update: FilterType<unknown>,
  ) {
    return this.mongoDB.collection(collectionName).updateOne(
      query,
      update,
      { upsert: true },
    );
  }
}

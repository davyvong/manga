import type { BaseAPIInterface } from "../../apis/base/mod.ts";
import RSMQ from "../../packages/rsmq/mod.ts";
import connectToRedis from "../../utils/connect-to-redis.ts";

export type BaseCrawlerOptions = {
  currentPage?: number;
  queueName: string;
  sourceAPI: BaseAPIInterface;
  updateMode?: boolean;
};

export default class BaseCrawler {
  protected currentPage = 1;
  protected isReady = false;
  protected isRunning = false;
  protected messageQueue = new RSMQ();
  protected nextFetchInterval = 60000;
  protected updateMode = false;
  protected queueName: string;
  protected retryFetchInterval = 60000;
  protected sourceAPI: BaseAPIInterface;

  constructor(options: BaseCrawlerOptions) {
    if (options.currentPage !== undefined) {
      this.currentPage = Number(options.currentPage);
    }
    this.queueName = options.queueName;
    this.sourceAPI = options.sourceAPI;
    if (options.updateMode !== undefined) {
      this.updateMode = Boolean(options.updateMode);
    }
    this.start = this.start.bind(this);
    this._fetchBrowseData = this._fetchBrowseData.bind(this);
    this._fetchUpdateData = this._fetchUpdateData.bind(this);
  }

  private async _initialize(): Promise<void> {
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
    if (this.updateMode) {
      this._fetchUpdateData();
    } else {
      this._fetchBrowseData();
    }
  }

  public stop(): void {
    this.isRunning = false;
  }

  protected async _fetchBrowseData(): Promise<void> {
    if (!this.isRunning) {
      setTimeout(this._fetchBrowseData, 1000);
    }
    console.log(`fetching page ${this.currentPage}`);
    const mangaList = await this.sourceAPI.getMangaList(this.currentPage)
      .catch(console.warn);
    if (!mangaList) {
      setTimeout(this._fetchBrowseData, this.retryFetchInterval);
      return;
    }
    if (mangaList.length === 0) {
      this.updateMode = true;
      this._fetchUpdateData();
      return;
    }
    await this._sendMessages(mangaList);
    this.currentPage++;
    setTimeout(this._fetchBrowseData, this.nextFetchInterval);
  }

  protected async _fetchUpdateData(): Promise<void> {
    if (!this.isRunning) {
      setTimeout(this._fetchUpdateData, 1000);
    }
    console.log("fetching updates");
    const mangaList = await this.sourceAPI.getUpdateList().catch(console.warn);
    if (!mangaList) {
      setTimeout(this._fetchUpdateData, this.retryFetchInterval);
      return;
    }
    if (mangaList.length > 0) {
      console.log(`queuing ${mangaList.length} mangas`);
      await this._sendMessages(mangaList, 25);
    }
    setTimeout(this._fetchUpdateData, this.nextFetchInterval);
  }

  protected async _sendMessages(
    mangaList: string[],
    limit?: number,
  ): Promise<void> {
    for (let i = 0; i < mangaList.length; i++) {
      const mangaId = mangaList[i];
      await this.messageQueue.sendMessage(
        this.queueName,
        JSON.stringify({ limit, mangaId }),
      ).catch(console.warn);
    }
  }
}

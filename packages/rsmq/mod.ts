import type {
  RawReplyOrError,
  Redis,
} from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import * as DenoRedis from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import EventEmitter from "https://deno.land/std/node/events.ts";

import {
  changeMessageVisibilityScript,
  popMessageScript,
  receiveMessageScript,
} from "./scripts.ts";
import type {
  RSMQMessage,
  RSMQOptions,
  RSMQQueue,
  RSMQQueueOptions,
} from "./types.ts";
import { clamp, randomString } from "./utils.ts";

export default class RSMQ extends EventEmitter {
  private namespace = "rsmq";
  private redisClient!: Redis;
  private scriptHashes: Map<string, string> = new Map();

  public async connect(options: RSMQOptions): Promise<void> {
    if (options.namespace) {
      this.namespace = options.namespace;
    }
    if (options.client && options.client.constructor.name === "RedisImpl") {
      this.redisClient = options.client;
    } else {
      this.redisClient = await DenoRedis.connect({
        ...options,
        hostname: options.hostname!,
      });
    }
    if (this.redisClient.isConnected) {
      await this._loadScripts();
    }
  }

  private async _loadScripts(): Promise<void> {
    this.scriptHashes.set(
      "popMessage",
      await this.redisClient.scriptLoad(popMessageScript),
    );
    this.scriptHashes.set(
      "receiveMessage",
      await this.redisClient.scriptLoad(receiveMessageScript),
    );
    this.scriptHashes.set(
      "changeMessageVisibility",
      await this.redisClient.scriptLoad(changeMessageVisibilityScript),
    );
  }

  private _generateId(time: [string, string]): string {
    return Number(time[0] + time[1]).toString(36) + randomString(16);
  }

  private _getQueueListKey(): string {
    return `${this.namespace}:queues`;
  }

  private _getQueueKey(queueName: string): string {
    return `${this._getQueueListKey()}:${queueName}`;
  }

  private _getMessageListKey(queueName: string): string {
    return `${this._getQueueKey(queueName)}:messages`;
  }

  private _getTXResults(response: RawReplyOrError[]) {
    return response[response.length - 1][1];
  }

  private _buildQueue(options: RSMQQueueOptions): RSMQQueue {
    return {
      maxSize: 65536,
      timeout: 0,
      visibilityTimeout: 900000,
      ...this._buildQueueOptions(options),
    };
  }

  private _buildQueueOptions(options: RSMQQueueOptions): RSMQQueueOptions {
    const queueOptions = { ...options };
    if (queueOptions.maxSize != null) {
      queueOptions.maxSize = clamp(queueOptions.maxSize, -1, 65536);
    }
    if (queueOptions.timeout != null) {
      queueOptions.timeout = clamp(queueOptions.timeout, 0, 1800000);
    }
    if (queueOptions.visibilityTimeout != null) {
      queueOptions.visibilityTimeout = clamp(
        queueOptions.visibilityTimeout,
        0,
        1800000,
      );
    }
    return queueOptions;
  }

  private _buildMessage(
    response: [string, string, number, string],
  ): RSMQMessage {
    const [id, message, repeats, received] = response;
    return {
      id,
      message,
      received: Number(received),
      repeats,
      // sent: Number(parseInt(id.slice(0, 10), 36).toString().slice(0, 10)),
    };
  }

  public async createQueue(options: RSMQQueueOptions): Promise<boolean> {
    const queue = this._buildQueue(options);
    return this._createQueue(queue);
  }

  private async _createQueue(queue: RSMQQueue): Promise<boolean> {
    const key = this._getQueueKey(queue.name);
    const [timestamp] = await this.redisClient.time();
    const tx = this.redisClient.tx();
    tx.hsetnx(key, "created", timestamp);
    tx.hsetnx(key, "maxSize", queue.maxSize.toString());
    tx.hsetnx(key, "modified", timestamp);
    tx.hsetnx(key, "timeout", queue.timeout.toString());
    tx.hsetnx(key, "visibilityTimeout", queue.visibilityTimeout.toString());
    tx.sadd(this._getQueueListKey(), queue.name);
    const results = <Array<number>> this._getTXResults(await tx.flush());
    if (Array.isArray(results)) {
      return results.every((r) => r > 0);
    }
    return false;
  }

  public async deleteQueue(name: string): Promise<boolean> {
    return this._deleteQueue(name);
  }

  private async _deleteQueue(name: string): Promise<boolean> {
    const tx = this.redisClient.tx();
    tx.del(this._getQueueKey(name));
    tx.srem(this._getQueueListKey(), name);
    const results = <Array<number>> this._getTXResults(await tx.flush());
    if (Array.isArray(results)) {
      return results.every((r) => r > 0);
    }
    return false;
  }

  public async getQueue(name: string): Promise<RSMQQueue | void> {
    const queue = this._getQueue(name).catch(console.warn);
    if (queue) {
      return queue;
    }
    return undefined;
  }

  private async _getQueue(name: string): Promise<RSMQQueue | void> {
    const tx = this.redisClient.tx();
    const key = this._getQueueKey(name);
    tx.hmget(key, "maxSize", "timeout", "visibilityTimeout");
    tx.time();
    const results = <Array<Array<string>>> this._getTXResults(await tx.flush());
    if (!Array.isArray(results)) {
      return undefined;
    }
    const [fields, time] = results;
    if (!Array.isArray(fields) || fields.every((f) => f == null)) {
      return undefined;
    }
    const [maxSize, timeout, visibilityTimeout] = fields;
    const [timestamp] = time;
    return {
      maxSize: Number(maxSize),
      name,
      timeout: Number(timeout),
      timestamp: Number(timestamp),
      visibilityTimeout: Number(visibilityTimeout),
    };
  }

  public async updateQueue(options: RSMQQueueOptions): Promise<boolean> {
    if (await this.getQueue(options.name)) {
      const queueOptions = this._buildQueueOptions(options);
      return this._updateQueue(queueOptions);
    }
    return false;
  }

  private async _updateQueue(options: RSMQQueueOptions): Promise<boolean> {
    const key = this._getQueueKey(options.name);
    const [timestamp] = await this.redisClient.time();
    const tx = this.redisClient.tx();
    tx.hset(key, "modified", timestamp);
    for (const [k, v] of Object.entries(options)) {
      tx.hset(key, k, String(v));
    }
    const results = <Array<number>> this._getTXResults(await tx.flush());
    if (Array.isArray(results)) {
      return results.some((r) => r > 0);
    }
    return false;
  }

  public async getQueueList(): Promise<string[]> {
    return this._getQueueList();
  }

  private async _getQueueList(): Promise<string[]> {
    return this.redisClient.smembers(this._getQueueListKey());
  }

  public async sendMessage(
    queueName: string,
    message: string,
  ): Promise<string | void> {
    const queue = await this.getQueue(queueName);
    if (queue) {
      if (queue.maxSize !== -1 && queue.maxSize < message.length) {
        return undefined;
      }
      return this._sendMessage(queue, message);
    }
    return undefined;
  }

  private async _sendMessage(
    queue: RSMQQueue,
    message: string,
  ): Promise<string | void> {
    const key = this._getQueueKey(queue.name);
    const messageId = this._generateId(await this.redisClient.time());
    const futureTime = <number> queue.timestamp + queue.timeout;
    const tx = this.redisClient.tx();
    tx.zadd(this._getMessageListKey(queue.name), [[futureTime, messageId]]);
    tx.hset(key, messageId, message);
    tx.hincrby(key, "totalSent", 1);
    const results = <Array<number>> this._getTXResults(await tx.flush());
    if (Array.isArray(results) && results.every((r) => r > 0)) {
      return messageId;
    }
    return undefined;
  }

  public async receiveMessage(queueName: string): Promise<RSMQMessage | void> {
    const queue = await this.getQueue(queueName);
    if (queue) {
      return this._receiveMessage(queue);
    }
    return undefined;
  }

  private async _receiveMessage(queue: RSMQQueue): Promise<RSMQMessage | void> {
    const sha1 = this.scriptHashes.get("receiveMessage");
    if (sha1 && queue.timestamp) {
      const keys = [
        this._getQueueKey(queue.name),
        this._getMessageListKey(queue.name),
        queue.timestamp.toString(),
        (queue.timestamp + queue.visibilityTimeout).toString(),
      ];
      const results = <[string, string, number, string]> await this.redisClient
        .evalsha(sha1, keys, []);
      if (Array.isArray(results)) {
        return this._buildMessage(results);
      }
    }
    return undefined;
  }

  public async popMessage(queueName: string): Promise<RSMQMessage | void> {
    const queue = await this.getQueue(queueName);
    if (queue) {
      return this._popMessage(queue);
    }
    return undefined;
  }

  private async _popMessage(queue: RSMQQueue): Promise<RSMQMessage | void> {
    const sha1 = this.scriptHashes.get("popMessage");
    if (sha1 && queue.timestamp) {
      const keys = [
        this._getQueueKey(queue.name),
        this._getMessageListKey(queue.name),
        queue.timestamp.toString(),
      ];
      const results = <[string, string, number, string]> await this.redisClient
        .evalsha(sha1, keys, []);
      if (Array.isArray(results)) {
        return this._buildMessage(results);
      }
    }
    return undefined;
  }

  public async changeMessageVisibility(
    queueName: string,
    messageId: string,
    visibilityTimeout: number,
  ): Promise<boolean> {
    const queue = await this.getQueue(queueName);
    if (queue) {
      return this._changeMessageVisibility(queue, messageId, visibilityTimeout);
    }
    return false;
  }

  private async _changeMessageVisibility(
    queue: RSMQQueue,
    messageId: string,
    visibilityTimeout: number,
  ): Promise<boolean> {
    const sha1 = this.scriptHashes.get("changeMessageVisibility");
    if (sha1 && queue.timestamp) {
      const keys = [
        this._getMessageListKey(queue.name),
        messageId,
        (queue.timestamp + visibilityTimeout).toString(),
      ];
      const results = await this.redisClient.evalsha(sha1, keys, []);
      return Boolean(results);
    }
    return false;
  }

  public async deleteMessage(
    queueName: string,
    messageId: string,
  ): Promise<boolean> {
    const queue = await this.getQueue(queueName);
    if (queue) {
      return this._deleteMessage(queue.name, messageId);
    }
    return false;
  }

  private async _deleteMessage(
    queueName: string,
    messageId: string,
  ): Promise<boolean> {
    const tx = this.redisClient.tx();
    tx.zrem(this._getMessageListKey(queueName), messageId);
    tx.hdel(
      this._getQueueKey(queueName),
      messageId,
      `${messageId}:rc`,
      `${messageId}:fr`,
    );
    const results = <Array<number>> this._getTXResults(await tx.flush());
    if (Array.isArray(results)) {
      return results.every((r) => r > 0);
    }
    return false;
  }
}

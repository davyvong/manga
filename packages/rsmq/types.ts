import type { Redis } from "https://denopkg.com/keroxp/deno-redis/mod.ts";

export type RedisConnectOptions = {
  hostname?: string;
  port?: number | string;
  tls?: boolean;
  db?: number;
  password?: string;
  name?: string;
  maxRetryCount?: number;
  retryInterval?: number;
};

export type RSMQMessage = {
  id: string;
  message: string;
  received: number;
  repeats: number;
};

export type RSMQOptions = RedisConnectOptions & {
  client?: Redis;
  namespace?: string;
};

export type RSMQQueue = {
  created?: number;
  modified?: number;
  timeout: number;
  maxSize: number;
  name: string;
  timestamp?: number;
  visibilityTimeout: number;
};

export type RSMQQueueOptions = {
  maxSize?: number;
  name: string;
  timeout?: number;
  visibilityTimeout?: number;
};

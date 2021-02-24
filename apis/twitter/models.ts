import * as base64 from "https://denopkg.com/chiefbiiko/base64/mod.ts";
import * as hex from "https://deno.land/std/encoding/hex.ts";
import merge from "https://cdn.skypack.dev/lodash.merge@^4.6.2";

import type { TwitterAPIOptions } from "./types.ts";

import hmacSha1 from "../../utils/hmac-sha1.ts";

export class TwitterAPIBase {
  public baseUrl = "https://api.twitter.com/";

  private accessTokenKey: string;
  private accessTokenSecret: string;
  private consumerKey: string;
  private consumerSecret: string;
  private jsonEndpoints: string[] = ["1.1/direct_messages/events/new"];

  constructor(options: TwitterAPIOptions) {
    this.accessTokenKey = options.accessTokenKey;
    this.accessTokenSecret = options.accessTokenSecret;
    this.consumerKey = options.consumerKey;
    this.consumerSecret = options.consumerSecret;
    this._percentEncodeEntry = this._percentEncodeEntry.bind(this);
    this._sortByKey = this._sortByKey.bind(this);
  }

  protected async _fetch(
    url: URL | string,
    init?: RequestInit,
  ): Promise<Response> {
    const defaultInit = {
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    };
    const combinedInit = merge(defaultInit, init);
    const urlWithJSON = url.toString() + ".json";
    const includeSignature = this.jsonEndpoints.includes(url.toString());
    if (includeSignature) {
      const params = JSON.parse(combinedInit.body) || {};
      const authorization = await this._getAuthHeader(
        combinedInit.method,
        urlWithJSON,
        params,
      );
      merge(combinedInit, {
        headers: {
          authorization,
          "content-type": "application/x-www-form-urlencoded",
        },
      });
    } else {
      const authorization = await this._getAuthHeader(
        combinedInit.method,
        urlWithJSON,
      );
      merge(combinedInit, { headers: { authorization } });
    }
    return fetch(urlWithJSON, combinedInit).then(
      async (response: Response): Promise<Response> => {
        if (response.status >= 400) {
          throw new Error(response.statusText);
        }
        return response;
      },
    );
  }

  private async _getAuthHeader(
    method: string,
    url: string,
    params: Record<string, string> = {},
  ): Promise<string> {
    const initParams = this._getEntryArray(params);
    const oauthParams = this._getEntryArray(this._getOAuthData());
    const paramsWithOAuth = [...oauthParams, ...initParams]
      .map(this._percentEncodeEntry).sort(this._sortByKey);
    const oauthSignature = await this._getSignature(
      method,
      url,
      paramsWithOAuth,
    );
    const oauthValue = [
      ...oauthParams,
      { key: "oauth_signature", value: oauthSignature },
    ]
      .map(this._percentEncodeEntry)
      .sort(this._sortByKey)
      .map((pair) => `${pair.key}="${pair.value}"`)
      .join(", ");
    return "OAuth " + oauthValue;
  }

  private _getEntryArray(
    object: Record<string, unknown>,
  ): Record<string, string>[] {
    return Object.entries(object).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  }

  private _getNonce(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return hex.encodeToString(array);
  }

  private _getOAuthData(): Record<string, string> {
    return {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: this._getNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: this._getTimestamp(),
      oauth_token: this.accessTokenKey,
      oauth_version: "1.0",
    };
  }

  private async _getSignature(
    method: string,
    url: string,
    params: Record<string, string>[],
  ): Promise<string> {
    const query = params.map((pair: Record<string, string>) =>
      pair.key + "=" + pair.value
    ).join("&");
    const signatureBaseString = [method.toUpperCase(), url, query].map(
      this._percentEncode,
    ).join("&");
    const signatureParams = [this.consumerSecret, this.accessTokenSecret].map(
      this._percentEncode,
    ).join("&");
    const signatureUint8Array = hmacSha1(signatureBaseString, signatureParams);
    return base64.fromUint8Array(signatureUint8Array);
  }

  private _getTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  private _percentEncode(str: string): string {
    return encodeURIComponent(str).replace(
      /[!'()*]/g,
      (char) => "%" + char.charCodeAt(0).toString(16),
    );
  }

  private _percentEncodeEntry(
    entry: Record<string, unknown>,
  ): Record<string, string> {
    return {
      key: this._percentEncode(String(entry.key)),
      value: this._percentEncode(String(entry.value)),
    };
  }

  private _sortByKey(
    a: Record<string, string>,
    b: Record<string, string>,
  ): number {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  }
}

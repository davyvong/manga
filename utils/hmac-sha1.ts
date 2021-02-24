import { encode, Hash } from "https://deno.land/x/checksum@1.2.0/mod.ts";
import hmac from "https://raw.githubusercontent.com/denolibs/hmac/master/lib/mod.ts";

const hashSha1 = new Hash("sha1");

function hash(bytes: Uint8Array): Uint8Array {
  return hashSha1.digest(bytes).data;
}

export default function hmacSha1(data: string, key: string): Uint8Array {
  return hmac(encode(data), encode(key), hash, 64, 20);
}

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

export default function decodeHTMLEntities(encodedString: string): string {
  const document = new DOMParser().parseFromString(encodedString, "text/html");
  if (document) {
    return document.textContent;
  }
  return "";
}

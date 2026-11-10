import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";

const ssrDir = new URL("../.ssr/", import.meta.url);
const htmlFile = new URL("../dist/index.html", import.meta.url);
const marker = '<div id="root"></div>';

const { render } = await import(new URL("entry-server.js", ssrDir).href);
const html = await readFile(htmlFile, "utf8");

if (!html.includes(marker)) {
  throw new Error("Não achei <div id=\"root\"></div> em dist/index.html");
}

/* Cada script inline executável precisa ter o hash liberado na Content-Security-Policy do index.html. */
const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? "";
for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  const hash = `sha256-${createHash("sha256").update(code).digest("base64")}`;
  if (!csp.includes(hash)) {
    throw new Error(`Script inline sem hash na Content-Security-Policy. Coloque '${hash}' no script-src do index.html.`);
  }
}

await writeFile(htmlFile, html.replace(marker, `<div id="root">${render()}</div>`));
await rm(ssrDir, { recursive: true, force: true });

console.log("HTML pré-renderizado em dist/index.html");

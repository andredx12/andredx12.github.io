import { readFile, rm, writeFile } from "node:fs/promises";

const ssrDir = new URL("../.ssr/", import.meta.url);
const htmlFile = new URL("../dist/index.html", import.meta.url);
const marker = '<div id="root"></div>';

const { render } = await import(new URL("entry-server.js", ssrDir).href);
const html = await readFile(htmlFile, "utf8");

if (!html.includes(marker)) {
  throw new Error("Não achei <div id=\"root\"></div> em dist/index.html");
}

await writeFile(htmlFile, html.replace(marker, `<div id="root">${render()}</div>`));
await rm(ssrDir, { recursive: true, force: true });

console.log("HTML pré-renderizado em dist/index.html");

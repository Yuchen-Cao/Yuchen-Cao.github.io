import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist");
const files = [];

async function walk(directory) {
  for (const name of await readdir(directory)) {
    const full = path.join(directory, name);
    if ((await stat(full)).isDirectory()) await walk(full);
    else files.push(full);
  }
}

await walk(out);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const failures = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const required of ["<!doctype html>", "<title>", 'id="main"', 'name="description"', '<html lang="']) {
    if (!html.includes(required)) failures.push(`${path.relative(root, file)} is missing ${required}`);
  }
  if (html.includes('id=""')) failures.push(`${path.relative(root, file)} contains an empty id`);
  const hrefs = [...html.matchAll(/href="(\/[^"#?]*)/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (href.endsWith(".xml") || href.endsWith(".css")) continue;
    const target = href === "/" ? path.join(out, "index.html") : path.join(out, href.replace(/^\//, ""), href.includes(".") ? "" : "index.html");
    try { await stat(target); } catch { failures.push(`${path.relative(root, file)} has broken link ${href}`); }
  }

  const sources = [...html.matchAll(/(?:src)="(\/[^"?]*)/g)].map((match) => match[1]);
  for (const source of sources) {
    const target = path.join(out, source.replace(/^\//, ""));
    try { await stat(target); } catch { failures.push(`${path.relative(root, file)} has missing asset ${source}`); }
  }
}

const home = await readFile(path.join(out, "index.html"), "utf8");
const cards = [...home.matchAll(/<article class="post-card"[\s\S]*?<\/article>/g)];
if (!cards.length) failures.push("Homepage does not contain article cards");
for (const [index, card] of cards.entries()) {
  if (!/<p>[^<]+<\/p>/.test(card[0])) failures.push(`Homepage article card ${index + 1} has no visible summary`);
  if (!/data-language="(?:en|zh-CN)"/.test(card[0])) failures.push(`Homepage article card ${index + 1} has no supported language`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages and ${files.length} generated files.`);

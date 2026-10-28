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
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(ids).size !== ids.length) failures.push(`${path.relative(root, file)} contains duplicate IDs`);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.includes(decodeURIComponent(match[1]))) failures.push(`${path.relative(root, file)} has broken anchor #${match[1]}`);
  }
  if (html.includes('<html lang="en">') && /\p{Script=Han}/u.test(html)) failures.push(`${path.relative(root, file)} contains Chinese in an English page`);
  const hrefs = [...html.matchAll(/href="(\/[^"#?]*)/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (href.endsWith(".xml") || href.endsWith(".css")) continue;
    const target = href === "/" ? path.join(out, "index.html") : path.join(out, href.replace(/^\//, ""), href.includes(".") ? "" : "index.html");
    try { await stat(target); } catch { failures.push(`${path.relative(root, file)} has broken link ${href}`); }
  }

  const sources = [...html.matchAll(/(?:src|poster)="(\/[^"?#]*)/g)].map((match) => match[1]);
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

// Each language has its own server-rendered entry points and feed.
for (const prefix of ['', 'en/']) {
  const expectedLanguage = prefix ? 'en' : 'zh-CN';
  for (const route of ['', 'writing/', 'topics/', 'about/']) {
    const html = await readFile(path.join(out, prefix, route, 'index.html'), 'utf8');
    if (!html.includes(`<html lang="${expectedLanguage}">`)) failures.push(`Wrong language at /${prefix}${route}`);
    for (const language of ['en', 'zh-CN']) if (!html.includes(`rel="alternate" hreflang="${language}"`)) failures.push(`Missing ${language} alternate at /${prefix}${route}`);
  }
  const feed = await readFile(path.join(out, prefix, 'feed.xml'), 'utf8');
  if (!feed.includes(`<language>${expectedLanguage}</language>`)) failures.push(`Wrong feed language at /${prefix}feed.xml`);
  if (prefix && /\p{Script=Han}/u.test(feed)) failures.push('English feed contains Chinese');
}

for (const slug of ['astra-robotics', 'astra-robotics-en']) {
  const html = await readFile(path.join(out, 'writing', slug, 'index.html'), 'utf8');
  const other = slug === 'astra-robotics' ? 'astra-robotics-en' : 'astra-robotics';
  if (!html.includes(`href="/writing/${other}/"`)) failures.push(`${slug} is missing its translation switch`);
  for (let n = 1; n <= 16; n++) if (!html.includes(`id="figure-${n}"`)) failures.push(`${slug} is missing figure ${n}`);
  for (let n = 1; n <= 23; n++) if (!html.includes(`id="ref-${n}"`)) failures.push(`${slug} is missing reference ${n}`);
  const citation = html.match(/<code id="article-bibtex">([\s\S]*?)<\/code>/)?.[1] || '';
  if (!citation || /\p{Script=Han}/u.test(citation) || !citation.includes(`/writing/${slug}/`)) failures.push(`${slug} has an invalid English BibTeX citation`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages and ${files.length} generated files.`);

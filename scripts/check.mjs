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
  for (const required of ["<!doctype html>", "<title>", 'id="main"', 'name="description"']) {
    if (!html.includes(required)) failures.push(`${path.relative(root, file)} is missing ${required}`);
  }
  const hrefs = [...html.matchAll(/href="(\/[^"#?]*)/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (href.endsWith(".xml") || href.endsWith(".css")) continue;
    const target = href === "/" ? path.join(out, "index.html") : path.join(out, href.replace(/^\//, ""), href.includes(".") ? "" : "index.html");
    try { await stat(target); } catch { failures.push(`${path.relative(root, file)} has broken link ${href}`); }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML pages and ${files.length} generated files.`);


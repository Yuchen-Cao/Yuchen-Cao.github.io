import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Run after the site build: node scripts/export-report.mjs [output-html]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const input = path.join(dist, "writing/astra-robotics/index.html");
const siteOrigin = "https://Yuchen-Cao.github.io";
const articleUrl = `${siteOrigin}/writing/astra-robotics/`;
const defaultOutput = path.resolve(root, "../outputs/astra-report/astra-robotics-preview.html");
const downloadOutput = path.join(dist, "astra-robotics-preview.html");
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/export-report.mjs [output-html]\nBuild the site first. Also writes dist/astra-robotics-preview.html.");
  process.exit(0);
}
if (args.length > 1 || args[0]?.startsWith("--")) {
  throw new Error("Expected at most one output HTML path. Use --help for usage.");
}
const output = args[0] ? path.resolve(args[0]) : defaultOutput;
if ([output, downloadOutput].includes(input)) {
  throw new Error("The export must not overwrite the built article.");
}

const mimeTypes = {
  ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".webp": "image/webp",
};
const files = new Map();
const stats = { stylesheets: 0, scripts: 0, images: 0, navigationLinks: 0 };

function decodeAttribute(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const hex = /^&#x/i.test(entity);
    return String.fromCodePoint(parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10));
  });
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function attributePattern(name) {
  return new RegExp(`(\\s${name}\\s*=\\s*)(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
}

function attribute(tag, name) {
  const match = tag.match(attributePattern(name));
  return match ? decodeAttribute(match[2] ?? match[3] ?? match[4]) : null;
}

function replaceAttribute(tag, name, value) {
  return tag.replace(attributePattern(name), (_match, prefix) => `${prefix}"${escapeAttribute(value)}"`);
}

function localFile(reference) {
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return null;
  const url = new URL(reference, articleUrl);
  const filename = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
  const relative = path.relative(dist, filename);
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error(`Asset path leaves the build directory: ${reference}`);
  }
  return filename;
}

async function readAsset(filename) {
  if (!files.has(filename)) {
    files.set(filename, readFile(filename).catch((error) => {
      throw new Error(`Cannot embed ${path.relative(root, filename)}. Run the site build first.`, { cause: error });
    }));
  }
  return files.get(filename);
}

async function transformTag(tag) {
  if (/^<script\b/i.test(tag)) {
    const opening = tag.match(/^<script\b(?:[^>"']|"[^"]*"|'[^']*')*>/i)[0];
    const src = attribute(opening, "src");
    const filename = localFile(src);
    if (!filename) return tag;
    const code = (await readAsset(filename)).toString("utf8").replace(/<\/script/gi, "<\\/script");
    // Deferred classic scripts are placed after the entire document's content.
    // Inline scripts ignore `defer`, so leaving them in the head would run too early.
    const deferred = /\sdefer(?:\s|=|>)/i.test(opening) && attribute(opening, "type") !== "module";
    const attrs = opening.slice("<script".length, -1)
      .replace(attributePattern("src"), "")
      .replace(/\s(?:defer|async)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?(?=\s|$)/gi, "")
      .replace(attributePattern("integrity"), "")
      .replace(attributePattern("crossorigin"), "");
    const inline = `<script${attrs} data-embedded-source="${escapeAttribute(src)}">\n${code}\n</script>`;
    stats.scripts++;
    if (deferred) return { deferred: inline };
    return inline;
  }
  if (/^<link\b/i.test(tag)) {
    const href = attribute(tag, "href");
    const filename = localFile(href);
    if (filename && attribute(tag, "rel")?.split(/\s+/).includes("stylesheet")) {
      const css = (await readAsset(filename)).toString("utf8").replace(/<\/style/gi, "<\\/style");
      const media = attribute(tag, "media");
      stats.stylesheets++;
      return `<style data-embedded-source="${escapeAttribute(href)}"${media ? ` media="${escapeAttribute(media)}"` : ""}>\n${css}\n</style>`;
    }
    if (filename) return replaceAttribute(tag, "href", new URL(href, articleUrl).href);
  }
  if (/^<img\b/i.test(tag)) {
    const src = attribute(tag, "src");
    const filename = localFile(src);
    if (filename) {
      const mime = mimeTypes[path.extname(filename).toLowerCase()];
      if (!mime) throw new Error(`Unknown image format: ${src}`);
      const data = await readAsset(filename);
      stats.images++;
      return replaceAttribute(tag, "src", `data:${mime};base64,${data.toString("base64")}`);
    }
  }
  if (/^<(?:video|source)\b/i.test(tag)) {
    // Keep large rollout files hosted; the portable HTML uses durable site URLs.
    for (const name of ['src', 'data-src', 'poster']) {
      const reference = attribute(tag, name);
      if (localFile(reference)) tag = replaceAttribute(tag, name, new URL(reference, articleUrl).href);
    }
    return tag;
  }
  if (/^<(?:a|area)\b/i.test(tag)) {
    const href = attribute(tag, "href");
    if (localFile(href)) {
      stats.navigationLinks++;
      return replaceAttribute(tag, "href", new URL(href, articleUrl).href);
    }
  }
  return tag;
}

let html;
try {
  html = await readFile(input, "utf8");
} catch (error) {
  throw new Error("Built report not found. Run npm run build before exporting.", { cause: error });
}

// Tokenize only the generated page's resource/navigation tags. Keep comments and
// existing raw-text blocks intact so tag-like text inside code is never rewritten.
const tokens = /<!--[\s\S]*?-->|<script\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/script\s*>|<style\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/style\s*>|<(?:link|img|a|area|video|source)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const matches = [...html.matchAll(tokens)];
const replacements = await Promise.all(matches.map((match) => transformTag(match[0])));
const deferredScripts = [];
let cursor = 0;
html = matches.map((match, index) => {
  const before = html.slice(cursor, match.index);
  cursor = match.index + match[0].length;
  const replacement = replacements[index];
  if (typeof replacement === "object") {
    deferredScripts.push(replacement.deferred);
    return before;
  }
  return before + replacement;
}).join("") + html.slice(cursor);
if (deferredScripts.length) {
  if (!/<\/body\s*>/i.test(html)) throw new Error("Built report is missing its closing body tag.");
  html = html.replace(/<\/body\s*>/i, () => `${deferredScripts.join("\n")}\n</body>`);
}

for (const filename of new Set([output, downloadOutput])) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, html, "utf8");
  console.log(`Exported ${filename} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB)`);
}
console.log(`Embedded ${stats.stylesheets} stylesheets, ${stats.scripts} scripts, ${stats.images} images; linked ${stats.navigationLinks} site destinations.`);

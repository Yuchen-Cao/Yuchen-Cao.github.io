import { readFile, writeFile, readdir, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";
import config from "../site.config.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist");

const escapeHtml = (value = "") =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const slugify = (value) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function parseDocument(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };
  const data = {};
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (value === "true") value = true;
    if (value === "false") value = false;
    data[key] = value;
  }
  return { data, body: match[2].trim() };
}

function inline(text) {
  let value = escapeHtml(text);
  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  value = value.replace(/\$([^$]+)\$/g, '<span class="inline-math">$1</span>');
  value = value.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
  return value;
}

function markdown(source) {
  const lines = source.split("\n");
  const html = [];
  let paragraph = [];
  let list = null;
  let code = false;
  let codeLanguage = "";
  let codeLines = [];
  let equation = false;
  let equationLines = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };

  for (const line of lines) {
    if (line.trim() === "$$") {
      flushParagraph(); closeList();
      if (!equation) {
        equation = true; equationLines = [];
      } else {
        html.push(`<div class="equation">${escapeHtml(equationLines.join(" "))}</div>`);
        equation = false;
      }
      continue;
    }
    if (equation) { equationLines.push(line.trim()); continue; }
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      flushParagraph(); closeList();
      if (!code) {
        code = true; codeLanguage = fence[1].trim(); codeLines = [];
      } else {
        html.push(`<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        code = false;
      }
      continue;
    }
    if (code) { codeLines.push(line); continue; }
    if (!line.trim()) { flushParagraph(); closeList(); continue; }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); closeList();
      const level = heading[1].length;
      html.push(`<h${level} id="${slugify(heading[2])}">${inline(heading[2])}</h${level}>`);
      continue;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (list !== "ul") { closeList(); html.push("<ul>"); list = "ul"; }
      html.push(`<li>${inline(unordered[1])}</li>`);
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (list !== "ol") { closeList(); html.push("<ol>"); list = "ol"; }
      html.push(`<li>${inline(ordered[1])}</li>`);
      continue;
    }
    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph(); closeList(); html.push(`<blockquote>${inline(quote[1])}</blockquote>`); continue;
    }
    closeList(); paragraph.push(line.trim());
  }
  flushParagraph(); closeList();
  if (code) html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  if (equation) html.push(`<div class="equation">${escapeHtml(equationLines.join(" "))}</div>`);
  return html.join("\n");
}

function readingTime(body) {
  const words = body.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function nav(current) {
  return config.nav.map((item) => `<a href="${item.href}"${current === item.href ? ' aria-current="page"' : ""}>${item.label}</a>`).join("");
}

function layout({ title, description, body, current = "", type = "website", canonical = "/" }) {
  const fullTitle = title === config.siteName ? title : `${title} — ${config.shortName}`;
  const url = new URL(canonical, config.url).href;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(config.author)}">
  <meta name="theme-color" content="#0b6e69">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteName)}" href="/feed.xml">
  <link rel="stylesheet" href="/assets/styles.css">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="${escapeHtml(config.siteName)} home"><span class="brand-mark">YC</span><span>${escapeHtml(config.siteName)}</span></a>
    <nav class="site-nav" aria-label="Primary">${nav(current)}<button class="theme-toggle" type="button" data-theme-toggle>Dark</button></nav>
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer"><span>© ${new Date().getUTCFullYear()} ${escapeHtml(config.author)}. Notes in public.</span><span><a href="${config.github}">GitHub</a> · <a href="/feed.xml">RSS</a></span></footer>
  <script src="/assets/main.js" defer></script>
</body>
</html>`;
}

function postMeta(post) {
  const tags = post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  return `<div class="meta"><time datetime="${post.date}">${formatDate(post.date)}</time><span>${post.readingTime}</span>${tags}</div>`;
}

function card(post) {
  return `<article class="post-card" data-post-card data-tags="${post.tags.map(slugify).join("|")}">${postMeta(post)}<h3><a href="${post.url}">${escapeHtml(post.title)}</a></h3><p>${escapeHtml(post.description)}</p><a class="read-link" href="${post.url}" aria-label="Read ${escapeHtml(post.title)}">Read essay</a></article>`;
}

async function writePage(route, html) {
  const directory = route === "/" ? out : path.join(out, route.replace(/^\//, ""));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, "assets"), path.join(out, "assets"), { recursive: true });
await writeFile(path.join(out, ".nojekyll"), "");

const postFiles = (await readdir(path.join(root, "content/posts"))).filter((file) => file.endsWith(".md"));
const posts = [];
for (const file of postFiles) {
  const { data, body } = parseDocument(await readFile(path.join(root, "content/posts", file), "utf8"));
  const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
  posts.push({ ...data, body, slug, url: `/writing/${slug}/`, tags: String(data.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean), readingTime: readingTime(body) });
}
posts.sort((a, b) => b.date.localeCompare(a.date));

for (const post of posts) {
  const article = `<div class="shell"><header class="article-header">${postMeta(post)}<h1>${escapeHtml(post.title)}</h1><p class="article-deck">${escapeHtml(post.description)}</p></header><article class="prose">${markdown(post.body)}</article><div class="article-footer">Thanks for reading. If this line of work overlaps with yours, feel free to continue the conversation on <a href="${config.github}">GitHub</a>.</div></div>`;
  await writePage(post.url, layout({ title: post.title, description: post.description, body: article, current: "/writing/", type: "article", canonical: post.url }));
}

const featured = posts.find((post) => post.featured) || posts[0];
const allTags = [...new Set(posts.flatMap((post) => post.tags))].sort();
const home = `<div class="shell">
  <section class="hero"><div><p class="eyebrow">Research notebook · Agentic intelligence</p><h1>Models that reason <em>in time.</em></h1><p class="hero-copy">I write about language model agents, temporal reasoning, and the systems required when intelligence has to interact with a world that does not wait for the next turn.</p></div><aside class="hero-aside"><p><strong>Current questions</strong></p><p>How should an agent represent elapsed time?</p><p>When should interaction logic live in the model rather than the harness?</p><p>How do asynchronous events revise a model's belief state?</p></aside></section>
  <section class="section"><div class="section-head"><div><p class="section-label">Featured essay</p><h2>Start here</h2></div><p class="section-intro">A working argument for why token order, interaction steps, and wall-clock time should not be treated as the same variable.</p></div><article class="featured"><div class="featured-index">01</div><div>${postMeta(featured)}<h3><a href="${featured.url}">${escapeHtml(featured.title)}</a></h3><p>${escapeHtml(featured.description)}</p><a class="read-link" href="${featured.url}">Read the essay</a></div></article></section>
  <section class="section"><div class="section-head"><div><p class="section-label">Latest writing</p><h2>Notes & arguments</h2></div><p class="section-intro">Technical ideas in progress: concrete enough to test, open enough to revise.</p></div><div class="filters" aria-label="Filter posts"><button class="filter" data-filter="all" aria-pressed="true">All</button>${allTags.map((tag) => `<button class="filter" data-filter="${slugify(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`).join("")}</div><div class="post-list">${posts.map(card).join("")}</div></section>
</div>`;
await writePage("/", layout({ title: config.siteName, description: config.description, body: home, canonical: "/" }));

const writing = `<div class="shell"><header class="page-header"><p class="eyebrow">Writing</p><h1>Essays and research notes</h1><p>Arguments, implementation-level observations, and paper readings around agentic and embodied intelligence.</p></header><div class="post-list">${posts.map(card).join("")}</div><div style="height:6rem"></div></div>`;
await writePage("/writing/", layout({ title: "Writing", description: "Essays and research notes by Yuchen Cao.", body: writing, current: "/writing/", canonical: "/writing/" }));

const topicCounts = allTags.map((tag) => ({ tag, count: posts.filter((post) => post.tags.includes(tag)).length }));
const topics = `<div class="shell"><header class="page-header"><p class="eyebrow">Topics</p><h1>Recurring questions</h1><p>The themes connecting individual notes, from temporal representations to the system boundary around a model.</p></header><div class="topic-grid">${topicCounts.map(({ tag, count }) => `<div class="topic-card"><h2>${escapeHtml(tag)}</h2><span class="topic-count">${count} ${count === 1 ? "essay" : "essays"}</span></div>`).join("")}</div></div>`;
await writePage("/topics/", layout({ title: "Topics", description: "Topics covered in YC Research Notes.", body: topics, current: "/topics/", canonical: "/topics/" }));

const aboutDoc = parseDocument(await readFile(path.join(root, "content/pages/about.md"), "utf8"));
const about = `<div class="shell"><header class="page-header"><p class="eyebrow">About</p><h1>Research in public</h1><p>${escapeHtml(aboutDoc.data.description)}</p></header><article class="prose">${markdown(aboutDoc.body)}</article></div>`;
await writePage("/about/", layout({ title: "About", description: aboutDoc.data.description, body: about, current: "/about/", canonical: "/about/" }));

const notFound = `<div class="shell"><header class="page-header"><p class="eyebrow">404</p><h1>This page moved—or never existed.</h1><p>Return to the <a href="/">research notebook</a> or browse the <a href="/writing/">writing archive</a>.</p></header></div>`;
await writeFile(path.join(out, "404.html"), layout({ title: "Page not found", description: "Page not found.", body: notFound, canonical: "/404.html" }));

const rssItems = posts.map((post) => `<item><title>${escapeHtml(post.title)}</title><link>${new URL(post.url, config.url).href}</link><guid>${new URL(post.url, config.url).href}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join("");
await writeFile(path.join(out, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeHtml(config.siteName)}</title><link>${config.url}</link><description>${escapeHtml(config.description)}</description>${rssItems}</channel></rss>`);

const routes = ["/", "/writing/", "/topics/", "/about/", ...posts.map((post) => post.url)];
await writeFile(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${new URL(route, config.url).href}</loc></url>`).join("")}</urlset>`);
await writeFile(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);

console.log(`Built ${posts.length} posts and ${routes.length} routes into dist/`);

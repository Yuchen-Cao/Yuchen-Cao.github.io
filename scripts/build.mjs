import { readFile, writeFile, readdir, mkdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import config from "../site.config.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist");

const escapeHtml = (value = "") =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const headingSlug = (value) => value.normalize("NFKC").toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "") || "section";

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
  const headingIds = new Map();
  let paragraph = [], list = null, code = false, codeLanguage = "", codeLines = [], equation = false, equationLines = [];
  const flushParagraph = () => { if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`); paragraph = []; };
  const closeList = () => { if (list) html.push(`</${list}>`); list = null; };
  const uniqueHeadingId = (text) => {
    const base = headingSlug(text), count = headingIds.get(base) || 0;
    headingIds.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };

  for (const line of lines) {
    if (line.trim() === "$$") {
      flushParagraph(); closeList();
      if (!equation) { equation = true; equationLines = []; }
      else { html.push(`<div class="equation" role="math">${escapeHtml(equationLines.join(" "))}</div>`); equation = false; }
      continue;
    }
    if (equation) { equationLines.push(line.trim()); continue; }
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      flushParagraph(); closeList();
      if (!code) { code = true; codeLanguage = fence[1].trim(); codeLines = []; }
      else {
        const language = codeLanguage ? ` data-language="${escapeHtml(codeLanguage)}"` : "";
        const className = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
        html.push(`<pre${language}><code${className}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        code = false;
      }
      continue;
    }
    if (code) { codeLines.push(line); continue; }
    if (!line.trim()) { flushParagraph(); closeList(); continue; }
    const video = line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+\.mp4|\/[^\s)]*\.mp4)\)$/i);
    if (video) {
      flushParagraph(); closeList();
      const [, label, source] = video;
      const poster = source.replace(/\.mp4$/i, ".jpg");
      const posterAttribute = source.startsWith("/") && existsSync(path.join(root, poster.slice(1))) ? ` poster="${escapeHtml(poster)}"` : "";
      html.push(`<figure class="article-video"><video controls playsinline preload="none" aria-label="${escapeHtml(label)}"${posterAttribute}><source src="${escapeHtml(source)}" type="video/mp4"><a href="${escapeHtml(source)}">${escapeHtml(label || "MP4")}</a></video></figure>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) { flushParagraph(); closeList(); html.push("<hr>"); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); closeList();
      const level = heading[1].length;
      html.push(`<h${level} id="${uniqueHeadingId(heading[2])}">${inline(heading[2])}</h${level}>`);
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
    if (quote) { flushParagraph(); closeList(); html.push(`<blockquote><p>${inline(quote[1])}</p></blockquote>`); continue; }
    closeList(); paragraph.push(line.trim());
  }
  flushParagraph(); closeList();
  if (code) html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  if (equation) html.push(`<div class="equation" role="math">${escapeHtml(equationLines.join(" "))}</div>`);
  return html.join("\n");
}

function languageOf(data, body) {
  if (data.lang) return String(data.lang).toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  return (body.match(/\p{Script=Han}/gu)?.length || 0) > 80 ? "zh-CN" : "en";
}

function readingTime(body, lang) {
  const hanCharacters = body.match(/\p{Script=Han}/gu)?.length || 0;
  const latinWords = body.replace(/\p{Script=Han}/gu, " ").trim().split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;
  const minutes = Math.max(1, Math.ceil(hanCharacters / 450 + latinWords / 220));
  return lang === "zh-CN" ? `${minutes} 分钟阅读` : `${minutes} min read`;
}

function formatDate(date, lang = "en") {
  const locale = lang === "zh-CN" ? "zh-CN" : "en";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: lang === "zh-CN" ? "long" : "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function nav(current) {
  return config.nav.map((item) => `<a href="${item.href}"${current === item.href ? ' aria-current="page"' : ""}>${item.label}</a>`).join("");
}

function layout({ title, description, body, current = "", type = "website", canonical = "/", lang = "en", alternates = [] }) {
  const fullTitle = title === config.siteName ? title : `${title} — ${config.shortName}`;
  const url = new URL(canonical, config.url).href;
  const alternateLinks = alternates.map((item) => `\n  <link rel="alternate" hreflang="${item.lang}" href="${new URL(item.url, config.url).href}">`).join("");
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(config.author)}">
  <meta name="theme-color" content="#f7f6f2">
  <link rel="canonical" href="${url}">${alternateLinks}
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteName)}" href="/feed.xml">
  <link rel="stylesheet" href="/assets/styles.css">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content / 跳至正文</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="${escapeHtml(config.siteName)} home"><span class="brand-mark">YC</span><span class="brand-name">${escapeHtml(config.siteName)}</span></a>
    <nav class="site-nav" aria-label="Primary navigation">${nav(current)}<button class="theme-toggle" type="button" data-theme-toggle aria-label="Use dark theme">◐</button></nav>
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer"><span>© ${new Date().getUTCFullYear()} ${escapeHtml(config.author)} · Research notes in public</span><span><a href="${config.github}">GitHub</a><a href="/feed.xml">RSS</a></span></footer>
  <script src="/assets/main.js" defer></script>
</body>
</html>`;
}

function postMeta(post, { showTags = true } = {}) {
  const tags = showTags ? post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") : "";
  const language = post.lang === "zh-CN" ? "中文" : "EN";
  return `<div class="meta"><span class="language-badge">${language}</span><time datetime="${post.date}">${formatDate(post.date, post.lang)}</time><span>${post.readingTime}</span>${tags}</div>`;
}

function cardTranslation(post) {
  const action = post.lang === "zh-CN" ? "阅读全文" : "Read article";
  const hidden = post.lang === "en" ? "" : " hidden";
  return `<div class="post-card-content" lang="${post.lang}" data-card-translation data-language="${post.lang}"${hidden}>${postMeta(post)}<h3><a href="${post.url}">${escapeHtml(post.title)}</a></h3><p>${escapeHtml(post.description)}</p><a class="read-link" href="${post.url}" aria-label="${action}: ${escapeHtml(post.title)}">${action}</a></div>`;
}

function card(group, index) {
  const tags = [...new Set(group.variants.flatMap((post) => post.tags))];
  return `<article class="post-card" data-post-card data-tags="${tags.map(slugify).join("|")}">
    <span class="post-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>${group.variants.map(cardTranslation).join("")}
  </article>`;
}

function filterControls(allTags) {
  const topics = allTags.map((tag) => `<button class="filter" data-filter="${slugify(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`).join("");
  return `<div class="filter-toolbar"><div class="reading-language" role="group" aria-label="Reading language / 阅读语言"><span>Read in / 阅读语言</span><button data-language-choice="en" aria-pressed="true">English</button><button data-language-choice="zh-CN" aria-pressed="false">中文</button></div><div class="filters" aria-label="Filter articles"><button class="filter" data-filter="all" aria-pressed="true">All topics / 全部主题</button>${topics}</div></div>`;
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
  const lang = languageOf(data, body);
  posts.push({ ...data, body, lang, slug, url: `/writing/${slug}/`, tags: String(data.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean), readingTime: readingTime(body, lang) });
}
posts.sort((a, b) => b.date.localeCompare(a.date));

const groupMap = new Map();
for (const post of posts) {
  const key = post.translationKey || post.slug;
  if (!groupMap.has(key)) groupMap.set(key, { key, date: post.date, variants: [] });
  groupMap.get(key).variants.push(post);
}
const postGroups = [...groupMap.values()];
for (const group of postGroups) group.variants.sort((a, b) => a.lang.localeCompare(b.lang));

function translationsFor(post) {
  if (!post.translationKey) return [];
  return posts.filter((candidate) => candidate.translationKey === post.translationKey).sort((a, b) => a.lang.localeCompare(b.lang));
}

function languageSwitch(post, translations) {
  if (translations.length < 2) return "";
  const label = post.lang === "zh-CN" ? "阅读语言" : "Read in";
  const options = translations.map((translation) => {
    const name = translation.lang === "zh-CN" ? "中文" : "English";
    return translation.slug === post.slug
      ? `<span aria-current="page">${name}</span>`
      : `<a href="${translation.url}" hreflang="${translation.lang}" lang="${translation.lang}">${name}</a>`;
  }).join("");
  return `<nav class="language-switch" aria-label="${label}"><span class="language-switch-label">${label}</span>${options}</nav>`;
}

function featuredTranslation(post) {
  const hidden = post.lang === "en" ? "" : " hidden";
  return `<div class="featured-translation" lang="${post.lang}" data-card-translation data-language="${post.lang}"${hidden}><div class="featured-side"><span>${post.lang === "zh-CN" ? "编辑精选" : "Editor’s pick"}</span><span>${post.lang === "zh-CN" ? "中文" : "English"}</span></div><div>${postMeta(post, { showTags: false })}<h3><a href="${post.url}">${escapeHtml(post.title)}</a></h3><p>${escapeHtml(post.description)}</p><a class="read-link" href="${post.url}">${post.lang === "zh-CN" ? "阅读全文" : "Read article"}</a></div></div>`;
}

for (const post of posts) {
  const translations = translationsFor(post);
  const closing = post.lang === "zh-CN" ? `感谢阅读。如果你也在思考这些问题，欢迎在 <a href="${config.github}">GitHub</a> 继续交流。` : `Thanks for reading. If this line of work overlaps with yours, continue the conversation on <a href="${config.github}">GitHub</a>.`;
  const article = `<div class="article-shell" lang="${post.lang}"><header class="article-header">${postMeta(post)}${languageSwitch(post, translations)}<h1>${escapeHtml(post.title)}</h1><p class="article-deck">${escapeHtml(post.description)}</p></header><article class="prose">${markdown(post.body)}</article><div class="article-footer">${closing}</div></div>`;
  await writePage(post.url, layout({ title: post.title, description: post.description, body: article, current: "/writing/", type: "article", canonical: post.url, lang: post.lang, alternates: translations }));
}

const featuredGroup = postGroups.find((group) => group.variants.some((post) => post.featured)) || postGroups[0];
const allTags = [...new Set(posts.flatMap((post) => post.tags))].sort();
const home = `<div class="shell">
  <section class="hero"><p class="eyebrow">Research notebook · 研究思考笔记</p><div class="hero-grid"><h1>Thinking about agents<br><em>beyond the turn.</em></h1><div><p class="hero-copy">关于语言模型 Agent、时间推理与具身智能的技术文章。记录那些发生在模型、工具与真实世界交界处的问题。</p><p class="hero-copy-en">Technical essays on language-model agents, temporal reasoning, and embodied intelligence.</p></div></div><div class="research-lines"><span>Agentic systems</span><span>Temporal reasoning</span><span>Embodied intelligence</span></div></section>
  <section class="section featured-section"><div class="section-head"><div><p class="section-label">Featured / 精选</p><h2>One idea to start with</h2></div></div><article class="featured" data-featured>${featuredGroup.variants.map(featuredTranslation).join("")}</article></section>
  <section class="section"><div class="section-head"><div><p class="section-label">Latest writing / 最新文章</p><h2>Ideas, with the argument visible.</h2></div><p class="section-intro">每个主题只显示一次；可切换阅读语言，或按研究主题筛选。</p></div>${filterControls(allTags)}<div class="post-list">${postGroups.map(card).join("")}</div></section>
</div>`;
await writePage("/", layout({ title: config.siteName, description: config.description, body: home, canonical: "/" }));

const writing = `<div class="shell"><header class="page-header"><p class="eyebrow">Writing / 文章</p><h1>Research notes,<br>arguments in progress.</h1><p>关于 Agent、时间推理和具身系统的长文与研究笔记。Switch reading language or browse by topic.</p></header>${filterControls(allTags)}<div class="post-list archive-list">${postGroups.map(card).join("")}</div></div>`;
await writePage("/writing/", layout({ title: "Writing", description: "Technical essays and research notes on agentic and embodied intelligence.", body: writing, current: "/writing/", canonical: "/writing/" }));

const topicCounts = allTags.map((tag) => ({ tag, groups: postGroups.filter((group) => group.variants.some((post) => post.tags.includes(tag))) }));
const topics = `<div class="shell"><header class="page-header"><p class="eyebrow">Topics / 主题</p><h1>Recurring questions</h1><p>跨越单篇文章、持续推进的研究线索。</p></header><div class="topic-grid">${topicCounts.map(({ tag, groups }) => `<a class="topic-card" href="/writing/?filter=${slugify(tag)}"><span class="topic-count">${groups.length} ${groups.length === 1 ? "article" : "articles"}</span><h2>${escapeHtml(tag)}</h2><p>${groups.slice(0, 2).map((group) => escapeHtml(group.variants.find((post) => post.lang === "en")?.title || group.variants[0].title)).join(" · ")}</p></a>`).join("")}</div></div>`;
await writePage("/topics/", layout({ title: "Topics", description: "Topics covered in YC Research Notes.", body: topics, current: "/topics/", canonical: "/topics/" }));

const aboutDoc = parseDocument(await readFile(path.join(root, "content/pages/about.md"), "utf8"));
const about = `<div class="article-shell"><header class="page-header"><p class="eyebrow">About</p><h1>Research in public</h1><p>${escapeHtml(aboutDoc.data.description)}</p></header><article class="prose">${markdown(aboutDoc.body)}</article></div>`;
await writePage("/about/", layout({ title: "About", description: aboutDoc.data.description, body: about, current: "/about/", canonical: "/about/" }));

const notFound = `<div class="shell"><header class="page-header"><p class="eyebrow">404</p><h1>This page moved—or never existed.</h1><p>Return to the <a href="/">research notebook</a> or browse the <a href="/writing/">writing archive</a>.</p></header></div>`;
await writeFile(path.join(out, "404.html"), layout({ title: "Page not found", description: "Page not found.", body: notFound, canonical: "/404.html" }));

const feedPosts = postGroups.map((group) => group.variants.find((post) => post.lang === "en") || group.variants[0]);
const rssItems = feedPosts.map((post) => `<item><title>${escapeHtml(post.title)}</title><link>${new URL(post.url, config.url).href}</link><guid>${new URL(post.url, config.url).href}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join("");
await writeFile(path.join(out, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeHtml(config.siteName)}</title><link>${config.url}</link><description>${escapeHtml(config.description)}</description>${rssItems}</channel></rss>`);
const routes = ["/", "/writing/", "/topics/", "/about/", ...posts.map((post) => post.url)];
await writeFile(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${new URL(route, config.url).href}</loc></url>`).join("")}</urlset>`);
await writeFile(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);
console.log(`Built ${posts.length} posts and ${routes.length} routes into dist/`);

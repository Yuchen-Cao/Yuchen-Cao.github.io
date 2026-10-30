import { readFile, writeFile, readdir, mkdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import config from "../site.config.mjs";
import { renderReport } from "./report.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist");
const styleVersion = createHash("sha256").update(await readFile(path.join(root, "assets/styles.css"))).digest("hex").slice(0, 12);
const mainScriptVersion = createHash("sha256").update(await readFile(path.join(root, "assets/main.js"))).digest("hex").slice(0, 12);
const brandLogoVersion = createHash("sha256").update(await readFile(path.join(root, "assets/korat-logo.png"))).digest("hex").slice(0, 12);
const reportStyles = ['report.css', 'report-figures.css', 'report-concepts.css', 'report-charts.css', 'report-cases.css'];
const reportStyleHash = createHash('sha256');
for (const file of reportStyles) reportStyleHash.update(await readFile(path.join(root, 'assets', file)));
const reportStyleVersion = reportStyleHash.digest('hex').slice(0, 12);
const reportScriptVersion = createHash('sha256').update(await readFile(path.join(root, 'assets/report.js'))).update(await readFile(path.join(root, 'assets/report-figures.js'))).update(await readFile(path.join(root, 'assets/report-cases.js'))).digest('hex').slice(0, 12);

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

const isEnglish = (lang) => lang === "en";
const localePath = (route, lang) => isEnglish(lang) ? `/en${route}` : route;
const localize = (lang, english, chinese) => isEnglish(lang) ? english : chinese;

function nav(current, lang) {
  return config.nav.map((item) => `<a href="${localePath(item.href, lang)}"${current === item.href ? ' aria-current="page"' : ""}>${escapeHtml(isEnglish(lang) ? item.label : item.labelZh)}</a>`).join("");
}

function siteLanguageSwitch(lang, alternates, canonical) {
  return `<div class="site-language-switch" role="group" aria-label="${localize(lang, 'Site language', '网站语言')}">${['zh-CN', 'en'].map((language) => {
    const target = alternates.find((item) => item.lang === language)?.url || localePath('/', language);
    const label = language === 'en' ? 'EN' : '中';
    const name = language === 'en' ? 'English' : localize(lang, 'Chinese', '中文');
    return `<a href="${language === lang ? canonical : target}" data-site-language="${language}" lang="${language}" hreflang="${language}" aria-label="${name}"${language === lang ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('')}</div>`;
}

function contactPanel(lang) {
  const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
  const triggerContent = isEnglish(lang)
    ? 'Contact<svg class="contact-toggle-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>';
  return `<details class="site-contact" data-contact>
      <summary class="contact-trigger${isEnglish(lang) ? '' : ' contact-trigger-icon'}" aria-controls="contact-panel" aria-label="${localize(lang, 'Contact', '联系我')}" title="${localize(lang, 'Contact', '联系我')}">${triggerContent}</summary>
      <section class="contact-panel" id="contact-panel" aria-labelledby="contact-title">
        <div class="contact-heading"><div><p class="contact-eyebrow">${escapeHtml(config.author)}</p><h2 id="contact-title">${localize(lang, "Let’s talk.", '聊聊想法。')}</h2></div><button class="contact-close" type="button" data-contact-close aria-label="${localize(lang, 'Close contact panel', '关闭联系面板')}" hidden><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div>
        <p class="contact-intro">${localize(lang, 'Happy to chat about anything that interests you.', '欢迎交流任何感兴趣的话题。')}</p>
        <div class="contact-method"><span class="contact-label">Email</span><div class="contact-value-row"><a class="contact-email" href="mailto:${escapeHtml(config.email)}" aria-label="${localize(lang, 'Email', '发送邮件至')} ${escapeHtml(config.email)}">${escapeHtml(config.email)}<span aria-hidden="true">↗</span></a><button class="contact-copy" type="button" data-contact-copy="${escapeHtml(config.email)}" data-contact-kind="email" aria-label="${localize(lang, 'Copy email address', '复制邮箱地址')}" title="${localize(lang, 'Copy email address', '复制邮箱地址')}" hidden>${copyIcon}</button></div></div>
        <div class="contact-method"><span class="contact-label">WeChat</span><div class="contact-value-row"><span class="contact-value">${escapeHtml(config.wechat)}</span><button class="contact-copy contact-copy-wechat" type="button" data-contact-copy="${escapeHtml(config.wechat)}" data-contact-kind="wechat" aria-label="${localize(lang, 'Copy WeChat ID', '复制微信号')}" hidden><span>${localize(lang, 'Copy ID', '复制微信号')}</span>${copyIcon}</button></div></div>
        <p class="contact-hint">${localize(lang, 'Click the email to write, or find me on WeChat.', '点击邮箱写信，或在微信搜索我的微信号。')}</p>
        <p class="contact-status" role="status" aria-live="polite" aria-atomic="true" data-contact-status></p>
      </section>
    </details>`;
}

function layout({ title, description, body, current = "", type = "website", canonical = "/", lang = "zh-CN", alternates = [], report = false, draft = false }) {
  const fullTitle = title === config.siteName ? title : `${title} — ${config.shortName}`;
  const url = new URL(canonical, config.url).href;
  const alternateLinks = alternates.map((item) => `\n  <link rel="alternate" hreflang="${item.lang}" href="${new URL(item.url, config.url).href}">`).join("");
  const feed = localePath('/feed.xml', lang);
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${escapeHtml(config.author)}">
  <meta name="theme-color" content="#fdf6e3">
  <link rel="canonical" href="${url}">${alternateLinks}
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteName)}" href="${feed}">
  <script>try{const t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'}catch{if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'}</script>
  <link rel="stylesheet" href="/assets/styles.css?v=${styleVersion}">
  ${report ? reportStyles.map(file => `<link rel="stylesheet" href="/assets/${file}?v=${reportStyleVersion}">`).join('') : ''}
  ${draft ? '<meta name="robots" content="noindex, nofollow">' : ''}
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="${isEnglish(lang) ? 'en_US' : 'zh_CN'}">
  <meta name="twitter:card" content="summary">
</head>
<body>
  <a class="skip-link" href="#main">${localize(lang, 'Skip to content', '跳至正文')}</a>
  <header class="site-header">
    <a class="brand" href="${localePath('/', lang)}" aria-label="${escapeHtml(config.siteName)} ${localize(lang, 'home', '首页')}"><img class="brand-logo" src="/assets/korat-logo.png?v=${brandLogoVersion}" width="38" height="38" alt=""><span class="brand-name">${escapeHtml(config.author)}</span></a>
    <nav class="site-nav" aria-label="${localize(lang, 'Primary navigation', '主导航')}">${nav(current, lang)}${siteLanguageSwitch(lang, alternates, canonical)}<button class="theme-toggle" type="button" data-theme-toggle aria-label="${localize(lang, 'Use dark theme', '切换深色主题')}">◐</button></nav>
    ${contactPanel(lang)}
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer"><span>© ${new Date().getUTCFullYear()} ${escapeHtml(config.author)} · ${localize(lang, 'Research notes in public', '公开的研究思考笔记')}</span><span><a href="${config.github}">GitHub</a><a href="${feed}">RSS</a></span></footer>
  <script src="/assets/main.js?v=${mainScriptVersion}" defer></script>
</body>
</html>`;
}

function postMeta(post, { showTags = true } = {}) {
  const tags = showTags ? post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") : "";
  const language = post.lang === "zh-CN" ? "中文" : "EN";
  return `<div class="meta"><span class="language-badge">${language}</span><time datetime="${post.date}">${formatDate(post.date, post.lang)}</time><span>${post.readingTime}</span>${tags}</div>`;
}

function cardTranslation(post, isDefault) {
  const action = post.lang === "zh-CN" ? "阅读全文" : "Read article";
  const hidden = isDefault ? "" : " hidden";
  return `<div class="post-card-content" lang="${post.lang}" data-card-translation data-language="${post.lang}"${hidden}>${postMeta(post)}<h3><a href="${post.url}">${escapeHtml(post.title)}</a></h3><p>${escapeHtml(post.description)}</p><a class="read-link" href="${post.url}" aria-label="${action}: ${escapeHtml(post.title)}">${action}</a></div>`;
}

function localizedPost(group, lang) {
  return group.variants.find((post) => post.lang === lang) || (lang === 'zh-CN' ? group.variants[0] : undefined);
}

function card(group, index, lang) {
  const post = localizedPost(group, lang);
  if (!post) return '';
  return `<article class="post-card" data-post-card data-tags="${post.tags.map(slugify).join("|")}">
    <span class="post-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>${cardTranslation(post, true)}
  </article>`;
}

function filterControls(allTags, lang) {
  const topics = allTags.map((tag) => `<button class="filter" data-filter="${slugify(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`).join("");
  return `<div class="filter-toolbar"><div class="filters" aria-label="${localize(lang, 'Filter articles by topic', '按主题筛选文章')}"><button class="filter" data-filter="all" aria-pressed="true">${localize(lang, 'All topics', '全部主题')}</button>${topics}</div></div>`;
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
  if (post.draft) continue;
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
    const name = translation.lang === "zh-CN" ? localize(post.lang, "Chinese", "中文") : "English";
    return translation.slug === post.slug
      ? `<span aria-current="page">${name}</span>`
      : `<a href="${translation.url}" data-site-language="${translation.lang}" hreflang="${translation.lang}">${name}</a>`;
  }).join("");
  return `<nav class="language-switch" aria-label="${label}"><span class="language-switch-label">${label}</span>${options}</nav>`;
}

function recentTranslation(post, isDefault) {
  const hidden = isDefault ? "" : " hidden";
  return `<div class="featured-translation" lang="${post.lang}" data-card-translation data-language="${post.lang}"${hidden}><div class="featured-side"><span>${localize(post.lang, "Featured essay", "Featured essay<br>精选长文")}</span><span>${post.lang === "zh-CN" ? "中文 · Chinese" : "English"}</span></div><div>${postMeta(post, { showTags: false })}<h2><a href="${post.url}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.description)}</p><a class="read-link" href="${post.url}">${post.lang === "zh-CN" ? "阅读全文" : "Read article"}</a></div></div>`;
}

for (const post of posts) {
  const translations = translationsFor(post);
  const closing = post.lang === "zh-CN" ? `感谢阅读。如果你也在思考这些问题，欢迎在 <a href="${config.github}">GitHub</a> 继续交流。` : `Thanks for reading. If this line of work overlaps with yours, continue the conversation on <a href="${config.github}">GitHub</a>.`;
  const article = post.layout === 'report' ? renderReport(post, { languageSwitch: languageSwitch(post, translations) }).replace(/src="(\/assets\/report(?:-figures|-cases)?\.js)"/g, `src="$1?v=${reportScriptVersion}"`) : `<div class="article-shell" lang="${post.lang}"><header class="article-header">${postMeta(post)}${languageSwitch(post, translations)}<h1>${escapeHtml(post.title)}</h1><p class="article-deck">${escapeHtml(post.description)}</p></header><article class="prose">${markdown(post.body)}</article><div class="article-footer">${closing}</div></div>`;
  await writePage(post.url, layout({ title: post.title, description: post.description, body: article, current: "/writing/", type: "article", canonical: post.url, lang: post.lang, alternates: translations, report: post.layout === 'report', draft: post.draft }));
}

const aboutDocs = {
  en: parseDocument(await readFile(path.join(root, 'content/pages/about.md'), 'utf8')),
  'zh-CN': parseDocument(await readFile(path.join(root, 'content/pages/about-zh.md'), 'utf8'))
};
const aggregateRoutes = ['/', '/writing/', '/topics/', '/about/'];
for (const lang of ['zh-CN', 'en']) {
  const groups = postGroups.filter((group) => localizedPost(group, lang));
  const recentPost = localizedPost(groups[0], lang);
  const allTags = [...new Set(groups.flatMap((group) => localizedPost(group, lang).tags))].sort();
  const localizedLayout = (route, options) => layout({ ...options, lang, canonical: localePath(route, lang), alternates: ['zh-CN', 'en'].map((language) => ({lang: language, url: localePath(route, language)})) });
  const home = `<div class="shell">
    <section class="hero"><p class="eyebrow">${localize(lang, 'Research notebook', 'Research notebook · 研究思考笔记')}</p><div class="hero-grid"><h1>Thinking about physical agents<br><em>beyond the turn.</em></h1><div><p class="hero-copy">${localize(lang, 'Technical essays on language-model agents, temporal reasoning, and embodied intelligence.', '关于语言模型 Agent、时间推理与具身智能的技术文章。记录那些发生在模型、工具与真实世界交界处的问题。')}</p><p class="hero-copy-en">${localize(lang, 'Questions at the intersection of models, tools, and the physical world.', 'Technical essays on language-model agents, temporal reasoning, and embodied intelligence.')}</p></div></div><div class="research-lines"><span>Agentic systems</span><span>Temporal reasoning</span><span>Embodied intelligence</span></div></section>
    <section class="section featured-section" aria-label="${localize(lang, 'Featured essay', '精选长文')}"><article class="featured" data-featured>${recentTranslation(recentPost, true)}</article></section>
    <section class="section"><div class="section-head"><div><p class="section-label">${localize(lang, 'Latest writing', 'Latest writing / 最新文章')}</p><h2>Ideas, with the argument visible.</h2></div><p class="section-intro">${localize(lang, 'Essays on agents, time, and the physical world. Browse the latest notes or follow a research topic.', '每个主题只显示一次；可切换网站语言，或按研究主题筛选。')}</p></div>${filterControls(allTags, lang)}<div class="post-list">${groups.map((group, i) => card(group, i, lang)).join('')}</div></section>
  </div>`;
  await writePage(localePath('/', lang), localizedLayout('/', { title: config.siteName, description: localize(lang, config.description, config.descriptionZh), body: home }));

  const writing = `<div class="shell"><header class="page-header"><p class="eyebrow">${localize(lang, 'Writing', 'Writing / 文章')}</p><h1>Research notes,<br>arguments in progress.</h1><p>${localize(lang, 'Long-form essays and research notes on agents, temporal reasoning, and embodied systems. Browse by topic or switch the site language.', '关于 Agent、时间推理和具身系统的长文与研究笔记。可按主题浏览，或切换网站语言。')}</p></header>${filterControls(allTags, lang)}<div class="post-list archive-list">${groups.map((group, i) => card(group, i, lang)).join('')}</div></div>`;
  await writePage(localePath('/writing/', lang), localizedLayout('/writing/', { title: localize(lang, 'Writing', '文章'), description: localize(lang, 'Technical essays and research notes on agentic and embodied intelligence.', '关于 Agent 与具身智能的技术文章和研究笔记。'), body: writing, current: '/writing/' }));

  const topicCounts = allTags.map((tag) => ({ tag, groups: groups.filter((group) => localizedPost(group, lang).tags.includes(tag)) }));
  const topics = `<div class="shell"><header class="page-header"><p class="eyebrow">${localize(lang, 'Topics', 'Topics / 主题')}</p><h1>Recurring questions</h1><p>${localize(lang, 'Research threads that connect ideas across essays.', '跨越单篇文章、持续推进的研究线索。')}</p></header><div class="topic-grid">${topicCounts.map(({ tag, groups }) => `<a class="topic-card" href="${localePath('/writing/', lang)}?filter=${slugify(tag)}"><span class="topic-count">${groups.length} ${localize(lang, groups.length === 1 ? 'article' : 'articles', '篇文章')}</span><h2>${escapeHtml(tag)}</h2><p>${groups.slice(0, 2).map((group) => escapeHtml(localizedPost(group, lang).title)).join(' · ')}</p></a>`).join('')}</div></div>`;
  await writePage(localePath('/topics/', lang), localizedLayout('/topics/', { title: localize(lang, 'Topics', '主题'), description: localize(lang, 'Topics covered in Yuchen Cao’s research notes.', 'Yuchen Cao 的研究笔记关注的主题。'), body: topics, current: '/topics/' }));

  const aboutDoc = aboutDocs[lang];
  const about = `<div class="article-shell"><header class="page-header"><p class="eyebrow">${localize(lang, 'About', 'About / 关于')}</p><h1>${localize(lang, 'Research in public', '公开记录研究思考')}</h1><p>${escapeHtml(aboutDoc.data.description)}</p></header><article class="prose">${markdown(aboutDoc.body)}</article></div>`;
  await writePage(localePath('/about/', lang), localizedLayout('/about/', { title: localize(lang, 'About', '关于'), description: aboutDoc.data.description, body: about, current: '/about/' }));

  const feedPosts = groups.map((group) => localizedPost(group, lang));
  const rssItems = feedPosts.map((post) => `<item><title>${escapeHtml(post.title)}</title><link>${new URL(post.url, config.url).href}</link><guid>${new URL(post.url, config.url).href}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join('');
  await writeFile(path.join(out, localePath('/feed.xml', lang)), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeHtml(config.siteName)}</title><link>${new URL(localePath('/', lang), config.url).href}</link><language>${lang}</language><description>${escapeHtml(localize(lang, config.description, config.descriptionZh))}</description>${rssItems}</channel></rss>`);
}

const notFound = `<div class="shell"><header class="page-header"><p class="eyebrow">404</p><h1>This page moved—or never existed.</h1><p>Return to the <a href="/en/">research notebook</a> or browse the <a href="/en/writing/">writing archive</a>.</p></header></div>`;
await writeFile(path.join(out, '404.html'), layout({ title: 'Page not found', description: 'Page not found.', body: notFound, canonical: '/404.html', lang: 'en' }));

const routes = [...aggregateRoutes, ...aggregateRoutes.map((route) => localePath(route, 'en')), ...posts.filter(post => !post.draft).map((post) => post.url)];
await writeFile(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${new URL(route, config.url).href}</loc></url>`).join("")}</urlset>`);
await writeFile(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);
console.log(`Built ${posts.length} posts and ${routes.length} routes into dist/`);

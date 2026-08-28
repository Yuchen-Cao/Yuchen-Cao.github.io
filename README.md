# YC — Research Notes

The source for [Yuchen-Cao.github.io](https://Yuchen-Cao.github.io): a bilingual research blog about agentic language models, temporal reasoning, and embodied intelligence.

The site uses a tiny zero-dependency static generator. Posts are Markdown, the generated site is plain HTML/CSS/JavaScript, and GitHub Actions publishes it to GitHub Pages.

## Write a post

Create `content/posts/YYYY-MM-DD-your-post-slug.md`:

```md
---
title: Your post title
date: 2026-08-14
lang: en
description: One sentence used on cards and in search previews.
tags: Agents, Temporal Reasoning
featured: false
---

# Your post title

Start writing here.
```

Supported Markdown includes headings, paragraphs, ordered and unordered lists, blockquotes, fenced code blocks, links, bold, emphasis, and inline code.

Use `lang: en` or `lang: zh-CN` to give each post localized dates, reading time, labels, and typography. Existing post URLs remain based on the filename slug, so metadata and template changes do not alter permalinks.

## Preview locally

Node.js 20 or newer is the only requirement.

```bash
npm run build
npm run check
npm run serve
```

Then open `http://localhost:4173`.

## Publish on GitHub Pages

1. Create a public repository named exactly `Yuchen-Cao.github.io`.
2. Push this project to its `main` branch.
3. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. The included workflow builds, checks, and deploys the site after every push to `main`.

The final URL will be `https://Yuchen-Cao.github.io`.

## Personalize

- Edit identity, description, links, and canonical URL in `site.config.mjs`.
- Edit the About page in `content/pages/about.md`.
- Adjust the visual system in `assets/styles.css`.
- Replace or revise the two launch essays before sharing the site publicly.

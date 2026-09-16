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

### Videos in posts

Put MP4 files in `assets/videos/<post-slug>/`. A standalone Markdown image line ending in `.mp4` renders as an inline video player:

```md
![Video description](/assets/videos/robodojo-gpt6-trajectories/cover_blocks_gpt6_mixed.mp4)

*Optional caption or viewing notes.*
```

Players have playback controls, work inline on mobile, and load the video when the reader chooses to play. If a `.jpg` with the same basename exists next to a local video, it is used as the preview image. Keep videos and their preview images alongside the post in the repository; the build copies them into the published site.

The RoboDojo article is editable at `content/posts/2026-09-16-robodojo-gpt6-trajectories.md`, with its English translation in `content/posts/2026-09-16-robodojo-gpt6-trajectories-en.md`. Edit these Markdown files directly, then build and upload the repository through the existing publishing workflow. Both versions share the five selected videos used in the article; the original experiment directory is not needed by the website.

Use `lang: en` or `lang: zh-CN` to give each post localized dates, reading time, labels, and typography. Existing post URLs remain based on the filename slug, so metadata and template changes do not alter permalinks.

To pair two language versions of the same article, give both files the same `translationKey`:

```md
translationKey: beyond-the-turn-based-agent
```

Paired posts appear only once on the homepage and writing archive. The reading-language control switches the card title, summary, metadata, and destination URL, while each article page links directly to its alternate-language version.

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

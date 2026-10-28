import { readFileSync } from 'node:fs';
import { renderFigure } from './report-figures.mjs';
import { renderVideoCases } from './report-cases.mjs';

const escape = (s = '') => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const refs = JSON.parse(readFileSync(new URL('../content/reports/astra-references.json', import.meta.url), 'utf8'));
const notes = JSON.parse(readFileSync(new URL('../content/reports/astra-notes.json', import.meta.url), 'utf8'));
const sectionLabels = ['Overview · 三种策略','01 · ICL 与探索预算','02 · 通用控制的边界','03 · Policy 的系统解剖','04 · 轨迹中的泛化','05 · 物理时间的约束','06 · 殊途同归？'];

export function renderReport(post) {
  const counts = {}, backrefs = {}, seen = new Set(), toc = [];
  let section = -1, paragraphIndex = 0;
  function registerCitation(n) {
    counts[n] = (counts[n] || 0) + 1;
    const id = `cite-${n}-${counts[n]}`;
    (backrefs[n] ||= []).push(id);
    return id;
  }
  function marginSource(n, cited = false) {
    const ref = refs[n];
    const number = cited ? `<a id="${registerCitation(n)}" href="#ref-${n}" aria-label="参考文献 ${n}：${escape(ref.short)}">${n}</a>` : n;
    const metadata = [ref.venue, ref.year || '2026'].filter(Boolean).join(' · ');
    return `<div class="margin-source"><span class="margin-number">${number}</span><span>${escape(ref.short).replace(/\.$/,'')}. <a href="${escape(ref.url)}" target="_blank" rel="noopener">${escape(ref.title)} <span class="reference-external" aria-hidden="true">↗</span></a><span class="source-year">${escape(metadata)}</span></span></div>`;
  }
  function inline(s) {
    let t = escape(s).replace(/&lt;br\s*\/?&gt;/g, '<br>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1 ↗</a>');
    t = t.replace(/\[(\d+)\]/g, (_, n) => {
      if (!refs[n]) return `[${n}]`;
      const id = registerCitation(n);
      return `<sup class="citation"><a id="${id}" href="#ref-${n}" aria-label="参考文献 ${n}：${escape(refs[n].short)}">${n}</a></sup>`;
    });
    return t;
  }
  function row(html, raw = '', extra = '') {
    const id = `paragraph-${++paragraphIndex}`;
    let side = '';
    for (const n of [...raw.matchAll(/\[(\d+)\]/g)].map(m=>m[1])) {
      if (seen.has(n) || !refs[n]) continue;
      seen.add(n);
      side += marginSource(n);
    }
    for (const note of notes) if (raw.includes(note.match)) {
      if (note.references) {
        for (const n of note.references) if (refs[n]) {
          side += marginSource(n, true);
          seen.add(String(n));
        }
        continue;
      }
      side += `<div class="margin-comment">${note.kind === '' ? '' : `<span class="comment-label">${escape(note.kind || '阅读旁注')}</span>`}<p>${inline(note.text)}</p>${note.url ? `<a class="note-source" href="${escape(note.url)}" target="_blank" rel="noopener">查看来源 ↗</a>` : ''}</div>`;
    }
    return `<div class="report-row ${extra}" id="${id}"><div class="report-content">${html}</div>${side ? `<aside class="report-margin" aria-label="来源与旁注">${side}</aside>` : ''}</div>`;
  }
  function citeFigure(html) {
    const normalize=url=>url.split('#')[0].replace('/pdf/','/abs/').replace(/\.pdf$/,'').replace(/\/$/,'');
    return html.replace(/<figcaption>([\s\S]*?)<\/figcaption>/g,(_,caption)=>'<figcaption>'+caption.replace(/<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g,(link,url)=>{
      const ref=Object.entries(refs).find(([,r])=>normalize(r.url)===normalize(url));
      const externalLink=!/^https?:\/\//.test(url)||link.includes('↗')?link:link.replace('</a>',' <span class="reference-external" aria-hidden="true">↗</span></a>');
      return ref?externalLink+inline(`[${ref[0]}]`):externalLink;
    })+'</figcaption>');
  }
  function renderBlocks(source) {
    const lines = source.trim().split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {i++; continue;}
      if (line === ':::takeaways') {
        const body=[]; i++; while(i<lines.length && lines[i].trim()!==':::')body.push(lines[i++]); i++;
        const ps=body.join('\n').split(/\n\s*\n/).filter(Boolean);
        out.push(row(`<section class="takeaways" id="takeaways"><div class="callout-kicker"><span>THE BIG PICTURE</span><span>01—06</span></div><h2>Key takeaways <span>& insights</span></h2><ol>${ps.map(p=>`<li>${inline(p)}</li>`).join('')}</ol></section>`,body.join('\n')));
        continue;
      }
      const fig=line.match(/^:::figure (\d+)$/);
      if(fig) {
        const number=Number(fig[1]);
        const failureHtml=number===6?`<figure lang="en" class="failure-gallery" id="figure-6"><span class="figure-kicker">FIG. 06 · FAILURE CASES</span><h4 lang="en">Failures that persist with more budget</h4><button class="figure-zoom" type="button" data-figure-zoom aria-label="Enlarge failure cases"><img src="/assets/astra-report/failure-cases.png" loading="lazy" alt="SenseNova failure cases: physical verification, recovery from irreversible actions, and long-horizon progress"></button><figcaption><b>图 6.</b> SenseNova 的失败案例：从左到右依次为物理状态验证、不可逆动作后的恢复，以及长时程任务中的进度保持。箭头指向执行前后的关键状态；即使提供 ICL 与扩展预算，仍可能发生这些失败。来源：${inline('[1]')}。</figcaption><dialog class="figure-lightbox" aria-label="Failure cases"><button type="button" data-figure-close aria-label="Close enlarged image">Close ×</button><img src="/assets/astra-report/failure-cases.png" alt="Three categories of SenseNova failure cases"></dialog></figure>`:'';
        out.push(row(number===6?failureHtml:citeFigure(renderFigure(number)), '', 'figure-row')); i++;continue;
      }
      if(line===':::video-cases') {
        const body=[];i++;while(i<lines.length&&lines[i].trim()!==':::')body.push(lines[i++]);i++;
        out.push(row(renderVideoCases(), '', 'figure-row report-row-wide'));continue;
      }
      const h = line.match(/^(#{2,3})\s+(.+)$/);
      if (h) {
        const level=h[1].length;
        let id;
        if(level===2){section++;id=`section-${section}`;seen.clear();toc.push({id,label:sectionLabels[section]||h[2],level:2});}
        else {id='section-'+(h[2].match(/^\d+\.\d+/)?.[0] || `subheading-${toc.length + 1}`);toc.push({id,label:h[2],level:3});}
        out.push(row(`<h${level} id="${id}"${level===2?' class="chapter-heading"':''}>${level===2?`<span class="chapter-number">${section===0?'OVERVIEW':String(section).padStart(2,'0')}</span>`:''}${inline(h[2].replace(level===2?/^\d+\s+/:/^$/,''))}${section>=4&&level===2?'<span class="section-status">撰写中</span>':''}</h${level}>`, '', 'heading-row'));i++;continue;
      }
      if(line.startsWith('|')) {
        const rows=[];while(i<lines.length&&lines[i].trim().startsWith('|'))rows.push(lines[i++].trim());
        const cells=r=>r.slice(1,-1).split('|').map(c=>c.trim());
        const head=cells(rows[0]); const data=rows.slice(2);
        out.push(row(`<div class="report-table-wrap" tabindex="0" role="region" aria-label="数据表，可横向滚动"><table><thead><tr>${head.map(c=>`<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${data.map(r=>`<tr>${cells(r).map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,rows.join('\n')));continue;
      }
      if(/^[-*] /.test(line)) {
        const ls=[];while(i<lines.length&&/^[-*] /.test(lines[i].trim()))ls.push(lines[i++].trim().slice(2));
        out.push(row(`<ul>${ls.map(s=>`<li>${inline(s)}</li>`).join('')}</ul>`,ls.join('\n')));continue;
      }
      if(line.startsWith(':::')) throw new Error(`Unknown report directive: ${line}`);
      const p=[];
      while(i<lines.length&&lines[i].trim()&&!/^(#{2,3} |:::|\|)/.test(lines[i]))p.push(lines[i++].trim());
      const raw=p.join(' ');
      out.push(row(raw==='【WIP】'?'<div class="wip-marker">WIP · 本节保留当前提纲，后续继续补充。</div>':`<p>${inline(raw)}</p>`,raw));
    }
    return out.join('\n');
  }
  const body=renderBlocks(post.body);
  const bibtex = `@misc{cao2026astrarobotics,
  author = {Cao, Yuchen},
  title = {{${post.title}}},
  year = {2026},
  month = oct,
  date = {${post.date}},
  url = {https://yuchen-cao.github.io/writing/astra-robotics/}
}`;
  const articleCitation = `<section id="cite-this-article" class="report-cite" aria-labelledby="cite-this-article-title"><div class="bibtex-heading"><div><span class="figure-kicker">BIBTEX</span><h2 id="cite-this-article-title">Cite this article</h2></div><div class="bibtex-copy"><span class="bibtex-copy-status" data-bibtex-status role="status" aria-live="polite"></span><button type="button" data-copy-bibtex aria-controls="article-bibtex" aria-label="复制本文 BibTeX" hidden>复制</button></div></div><pre tabindex="0" aria-label="本文 BibTeX 引用"><code id="article-bibtex">${escape(bibtex)}</code></pre></section>`;
  const bibliography=Object.entries(refs).filter(([n])=>backrefs[n]).map(([n,r])=>`<li id="ref-${n}"><span class="reference-index">${n}</span><div>${escape(r.authors || r.short).replace(/\.$/,'')}. <a href="${escape(r.url)}" target="_blank" rel="noopener">${escape(r.title)} <span class="reference-external" aria-hidden="true">↗</span></a>. ${escape(r.venue || '')}${r.venue?', ':''}${escape(r.year||'2026')}. <span class="reference-backlinks">${backrefs[n].map((id,i)=>`<a href="#${id}" aria-label="返回引用 ${n}，第 ${i+1} 处">正文${backrefs[n].length>1?i+1:''}</a>`).join(' ')}</span></div></li>`).join('');
  return `<div class="report" lang="zh-CN"><aside class="report-toc"><a class="toc-home" href="/writing/">← Research notes</a><p class="toc-label">IN THIS ESSAY</p><nav aria-label="文章导航"><a href="#takeaways">Key takeaways</a>${toc.map(t=>`<a href="#${t.id}" class="toc-level-${t.level}">${escape(t.label)}</a>`).join('')}<a href="#references">References</a><a href="#cite-this-article">Cite this article</a></nav><div class="reading-progress"><span>READING PROGRESS</span><div><i></i></div></div></aside><div class="report-body"><header class="report-row report-hero" id="report-top"><div class="report-content"><div class="report-eyebrow">RESEARCH ESSAY <span>·</span> EMBODIED INTELLIGENCE</div><h1>Astra Robotics 大考<span>大模型离真正的机器人大脑<br class="desktop-break">还有多远？</span></h1><p class="report-deck">${escape(post.description)}</p><div class="report-byline"><span>Yuchen Cao</span><time datetime="${post.date}">2026.10.27</time><span>${escape(post.readingTime)}</span><span class="draft-badge">项目草稿</span></div><div class="source-chips"><a href="${refs[1].url}">01 SenseNova ↗</a><a href="${refs[2].url}">02 Galbot ↗</a><a href="${refs[3].url}">03 Astranomy ↗</a></div></div></header>${body}${row(`<section id="references" class="report-references"><span class="figure-kicker">SOURCES & FURTHER READING</span><h2>References</h2><ol>${bibliography}</ol></section>`)}${row(articleCitation)}<footer class="report-end">这是一份持续更新的研究笔记。<a href="#report-top">回到顶部 ↑</a></footer></div></div><script src="/assets/report.js" defer></script><script src="/assets/report-figures.js" defer></script><script src="/assets/report-cases.js" defer></script>`;
}

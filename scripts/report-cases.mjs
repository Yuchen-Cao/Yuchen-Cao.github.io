import { readFileSync } from 'node:fs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MEDIA_ROOT = '/assets/astra-report/rollouts/';
const STRATEGIES = ['Astra Native', 'RFM-Assisted', 'π0.5'];
const paragraphs = value => (Array.isArray(value) ? value : String(value || '').split(/\n\s*\n/)).filter(Boolean).map(text => `<p>${esc(text).replace(/\n/g, '<br>')}</p>`).join('');
const durationLabel = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function renderVideoCases(language = 'zh') {
  const isEnglish = language === 'en';
  const cases = JSON.parse(readFileSync(new URL(`../content/reports/astra-cases${isEnglish ? '-en' : ''}.json`, import.meta.url), 'utf8'));
  let media = [];
  try {
    const manifest = JSON.parse(readFileSync(new URL('../assets/astra-report/rollouts/media.json', import.meta.url), 'utf8'));
    media = Array.isArray(manifest) ? manifest : manifest.files || [];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const metadata = new Map(media.map(item => [item.file, item]));
  const ids = new Set();
  for (const item of cases) {
    if (!/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id)) throw new Error(`Invalid rollout case id: ${item.id}`);
    ids.add(item.id);
    if (item.cards.length !== 3 || item.cards.some((card, i) => card.strategy !== STRATEGIES[i] || !/^[a-zA-Z0-9_-]+\.mp4$/.test(card.file))) {
      throw new Error(`Invalid rollout cards in ${item.id}`);
    }
  }
  const openIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M11 3h6v6m0-6-9 9M8 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4"/></svg>';
  const reflection = item => item.reflection ? `<aside class="rvc-reflection"><h6>Case reflection</h6>${paragraphs(item.reflection)}</aside>` : '';
  const panels = cases.map((item, caseIndex) => {
    // Short observations fit beside the two taller clips; longer observations
    // stay under their own strategies so the third column remains readable.
    const notesLength = item.cards.reduce((sum, card) => sum + String(card.comment || '').length, 0);
    const useCommentRail = notesLength > 0 && notesLength <= (isEnglish ? 280 : 95);
    const rail = useCommentRail ? `<aside class="rvc-comment-rail" aria-label="Comparison notes">${item.cards.filter(card => card.comment).map(card => `<div class="rvc-rail-entry"><h6>${esc(card.strategy)}</h6>${paragraphs(card.comment)}</div>`).join('')}</aside>` : '';
    const cards = item.cards.map((card, cardIndex) => {
      const info = metadata.get(card.file) || {};
      // All supplied Astra clips are 1280×680; all π0.5 clips are 1920×360.
      const width = Number(info.width) || (cardIndex === 2 ? 1920 : 1280);
      const height = Number(info.height) || (cardIndex === 2 ? 360 : 680);
      const duration = Number(info.duration) || 0;
      const file = MEDIA_ROOT + encodeURIComponent(card.file);
      const poster = MEDIA_ROOT + encodeURIComponent(info.poster || card.file.replace(/\.mp4$/, '.jpg'));
      const videoId = `rvc-${item.id}-video-${cardIndex}`;
      return `<article class="rvc-card rvc-strategy-${cardIndex}" data-rvc-card>
        <header class="rvc-card-heading"><h5 id="${videoId}-title">${esc(card.strategy)}</h5><div class="rvc-video-meta"><button type="button" class="rvc-open" data-rvc-open aria-label="Enlarge ${esc(card.strategy)} video" title="Enlarge">${openIcon}</button></div></header>
        <video class="rvc-video" id="${videoId}" width="${width}" height="${height}" style="--rvc-aspect:${width}/${height}" controls playsinline muted preload="none" poster="${esc(poster)}"${caseIndex === 0 ? ` src="${esc(file)}"` : ''} data-src="${esc(file)}" aria-labelledby="${videoId}-title"${duration ? ` data-duration="${duration}"` : ''}></video>
        <div class="rvc-playback" data-rvc-playback hidden><button type="button" data-rvc-play aria-label="Play ${esc(card.strategy)} video">Play</button><input type="range" min="0" max="${duration || 100}" step="0.1" value="0" data-rvc-seek aria-label="Seek ${esc(card.strategy)} video"${duration ? '' : ' disabled'}><output data-rvc-time aria-label="Playback time">0:00 / ${duration ? durationLabel(duration) : '–:––'}</output></div>
        <div class="rvc-error" data-rvc-error hidden><p>Video could not be loaded.</p><button type="button" data-rvc-retry>Retry</button><button type="button" data-rvc-open>Open video</button></div>
        ${!useCommentRail && card.comment ? `<div class="rvc-comment">${paragraphs(card.comment)}</div>` : ''}
        ${cardIndex === 2 ? rail + reflection(item) : ''}
      </article>`;
    }).join('');
    return `<div class="rvc-panel" id="rvc-panel-${item.id}" role="tabpanel" aria-labelledby="rvc-tab-${item.id}" tabindex="0" data-rvc-panel${caseIndex ? ' hidden' : ''}><div class="rvc-panel-heading"><span>CASE ${String(caseIndex + 1).padStart(2, '0')}</span><p>${esc(item.subtitle)}</p></div><div class="rvc-grid">${cards}</div></div>`;
  }).join('');
  return `<figure class="rvc-comparison" id="rollout-cases" aria-labelledby="rollout-cases-title" data-rvc>
    <div class="rvc-shell"><header class="rvc-heading"><h4 id="rollout-cases-title">Rollout comparisons</h4><div class="rvc-controls"><button type="button" data-rvc-toggle>Play all</button><button type="button" data-rvc-restart>Restart all</button></div></header>
      <div class="rvc-tabs" role="tablist" aria-label="Rollout cases" aria-orientation="horizontal">${cases.map((item, i) => `<button type="button" id="rvc-tab-${item.id}" role="tab" aria-controls="rvc-panel-${item.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-rvc-tab>${esc(item.title)}</button>`).join('')}</div>
      ${panels}<p class="rvc-status" role="status" aria-live="polite" data-rvc-status hidden></p>
    </div><figcaption>${isEnglish ? 'Policy comparisons in RoboDojo simulation: execution trajectories and behavioral observations for Astra Native, RFM-Assisted, and π0.5 on the same tasks.' : 'RoboDojo 仿真实验中的策略对照。Astra Native、RFM-Assisted 与 π0.5 在相同任务上的执行轨迹与行为观察。'}</figcaption>
  </figure>`;
}

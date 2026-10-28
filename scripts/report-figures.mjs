/* Figures for the Astra report. Values are transcribed from the linked primary
   sources. Every diagram remains readable before client-side enhancement. */
import { readFileSync } from 'node:fs';
import { createConceptFigures } from './report-concepts.mjs';
import { createChartFigures } from './report-charts.mjs';
import { englishFigureCaptions } from './report-locales.mjs';
const DATA = JSON.parse(readFileSync(new URL('../assets/astra-report/figures-data.json', import.meta.url), 'utf8'));
const SOURCE = {
  gen: 'https://generalistai.com/blog/gen-1.5',
  sense: 'https://www.sensenova.ai/has-gpt-6-astra-achieved-embodied-intelligence',
  galbot: 'https://arxiv.org/pdf/2609.38537',
  astra: 'https://research.nvidia.com/labs/srl/projects/astranomy/',
  wam: 'https://nvlabs.github.io/LongLive/Long-WAM/#planning',
};
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source = (key, label) => `<a href="${SOURCE[key]}">${label}</a>`;
const note = text => `<p class="rf-note">${text}</p>`;
function createFigureRenderer(language) {
const isEnglish = language === 'en';
const captions = isEnglish ? englishFigureCaptions({ source, DATA }) : {};
function figure(n,title,body,caption){return `<figure class="report-figure" id="figure-${n}" aria-labelledby="figure-${n}-title"><div class="rf-surface" lang="en"><div class="rf-heading"><span class="rf-kicker">FIG. ${String(n).padStart(2,'0')}</span><h4 id="figure-${n}-title">${title}</h4></div>${body}</div><figcaption><strong>${isEnglish ? 'Figure' : '图'} ${n}.</strong> ${captions[n] ?? caption}</figcaption></figure>`;}
function tabs(id, items, defaultIndex=0, orientation='horizontal') {
  return `<div class="rf-tabs" data-rf-tabs><div class="rf-controls" role="tablist" aria-label="Figure views" aria-orientation="${orientation}">${items.map((t,i)=>`<button type="button" id="${id}-tab-${i}" role="tab" data-rf-tab="${id}-${i}" aria-controls="${id}-${i}" aria-selected="${i===defaultIndex}" tabindex="${i===defaultIndex?0:-1}">${t.label}</button>`).join('')}</div>${items.map((t,i)=>`<div class="rf-panel" id="${id}-${i}" role="tabpanel" aria-labelledby="${id}-tab-${i}" tabindex="0" data-rf-panel><div class="rf-panel-title">${t.label}</div>${t.html}</div>`).join('')}</div>`;
}
function chart(id, rows, series, opts={}){
  const unit=opts.unit??'%', groups=[...new Set(rows.map(r=>r.group).filter(Boolean))];
  return `<div class="rf-chart" data-rf-chart><div class="rf-chart-toolbar"><div class="rf-legend">${series.map((s,i)=>`<span><i class="rf-swatch rf-c${opts.colors?.[i]??i}"></i>${esc(s)}</span>`).join('')}</div>${groups.length>1?`<label>${esc(opts.filterTitle||'Task group')} <select data-rf-filter aria-label="${esc(opts.filterLabel||'Filter task groups')}"><option value="all">All</option>${groups.map(g=>`<option value="${esc(g)}"${opts.defaultGroup===g?' selected':''}>${esc(g)}</option>`).join('')}</select></label>`:''}</div><div class="rf-chart-rows">${rows.map((row,ri)=>`<div class="rf-chart-row" data-rf-group="${esc(row.group||'')}" data-rf-row><div class="rf-row-label">${esc(row.label)}${row.sub?`<small>${esc(row.sub)}</small>`:''}</div><div class="rf-bars">${row.values.map((v,si)=>`<div class="rf-bar-line"><span class="rf-series-label">${esc(series[si])}</span><div class="rf-track"><div class="rf-bar rf-c${opts.colors?.[si]??si}" style="--rf-value:${v==null?0:v}%" tabindex="0" aria-label="${esc(`${row.label}; ${series[si]}: ${v==null?'Not reported':v+unit}${row.details?.[si]?`; ${row.details[si]}`:''}`)}" data-rf-value="${esc(`${row.label} · ${series[si]}: ${v==null?'Not reported':v+unit}${row.details?.[si]?` · ${row.details[si]}`:''}`)}"><span class="rf-bar-fill"></span></div></div><span class="rf-value">${v==null?'—':v}${v==null?'':unit}</span></div>`).join('')}</div></div>`).join('')}</div><div class="rf-chart-axis" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100${unit}</span></div><output class="rf-detail" data-rf-detail aria-live="polite">${esc(opts.detail||'')}</output></div>`;
}
const genTasks=[['Take money out of a wallet',60.7,83.3],['Fold and flatten paper',50,69.3],['Unscrew a jar lid',60,94.5],['Stack two cups',67,75],['Sweep debris with a brush',37.3,99],['Open a book cover',54.7,82.7],['Sweep a block into a bowl',60.8,71.2],['Flip a phone',78,81],['Unzip a pencil case',55.5,86],['Remove a suction cup',64,86]];

function physicalFigure() {
  const markerScene = (done=false) => `<svg class="rf-icl-scene" viewBox="0 0 220 88" role="img" aria-label="${done?'Target: pen inside the cup':'A pen and cup in a new scene'}"><path d="M15 71H205" stroke="var(--rf-line)" stroke-width="1.5"/><path d="M145 38l5 32h36l5-32" fill="var(--accent-soft, #e2eeea)" stroke="var(--rf-green)" stroke-width="2"/><ellipse cx="168" cy="38" rx="23" ry="5" fill="none" stroke="var(--rf-green)" stroke-width="2"/><path d="${done?'M166 14l3 44':'M38 58l53-23'}" stroke="var(--rf-orange)" stroke-width="8" stroke-linecap="round"/>${done?'':'<path d="M103 31Q128 13 148 26" fill="none" stroke="var(--rf-muted)" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M141 25l8 2-3-7" fill="none" stroke="var(--rf-muted)" stroke-width="1.5"/>'}</svg>`;
  const languageInput = `<span class="rf-icl-label">EXAMPLE 01 · CONTEXT</span><div class="rf-icl-qa"><span>Q: Who wrote Romeo and Juliet?</span><span>A: William Shakespeare</span></div><div class="rf-icl-new"><span class="rf-icl-label">NEW INPUT</span><div class="rf-icl-qa"><span>Q: Who wrote War and Peace?</span><span>A: <span class="rf-icl-blank">…</span></span></div></div>`;
  const physicalInput = `<span class="rf-icl-label">DEMO 01 · CONTEXT</span><div class="rf-icl-sensor"><span>Obs. <i>o₁</i></span><span>Action <i>a₁</i></span><b>→</b><span>Obs. <i>o₂</i></span><span>Action <i>a₂</i></span><b>…</b></div><small class="rf-icl-caption">Sensor data + action trajectories</small><div class="rf-icl-new"><span class="rf-icl-label">NEW INPUT</span><div class="rf-icl-scene-line">${markerScene()}<small class="rf-icl-caption">New initial state<br>Live observations</small></div></div>`;
  const model = name => `<span class="rf-icl-frozen">Frozen θ</span><div><strong class="rf-icl-model-name">${name}</strong><span class="rf-icl-model-sub">Pretrained model</span></div><small>0 gradient updates<br>at evaluation</small>`;
  const languageOutput = `<span class="rf-icl-label">CONTINUATION</span><div class="rf-icl-answer">Leo Tolstoy</div><small class="rf-icl-caption">Answer the new question</small>`;
  const physicalOutput = `<span class="rf-icl-label">ACTION CONTINUATION</span><div class="rf-icl-scene-line">${markerScene(true)}<div><div class="rf-icl-action">aₜ → aₜ₊₁ → …</div><small class="rf-icl-caption">Put the pen in the cup</small></div></div>`;
  const column = (domain,kind,input,modelName,output,step) => `<section class="rf-icl-column"><header class="rf-icl-domain"><strong>${domain}</strong><span>${kind}</span></header><div class="rf-icl-grid"><div class="rf-icl-cell rf-icl-context${step===0?' rf-icl-focused':''}">${input}</div><span class="rf-icl-arrow" aria-hidden="true">↓</span><div class="rf-icl-cell rf-icl-model${step===1?' rf-icl-focused':''}">${model(modelName)}</div><span class="rf-icl-arrow" aria-hidden="true">↓</span><div class="rf-icl-cell rf-icl-result${step===2?' rf-icl-focused':''}">${output}</div></div></section>`;
  const explanations = [
    'Examples and a new input share one context. One-shot uses one example; few-shot adds more. Physical prompts use observations and action trajectories.',
    'Pretraining builds transferable knowledge. At evaluation, weights stay fixed and examples guide inference through the context.',
    'The model continues from a new input: the language model answers a new question; the embodied model acts from live observations.'
  ];
  const panels = ['01 Input','02 Frozen model','03 Output'].map((label,step)=>({label,html:`<div class="rf-icl-comparison" data-focus="${step}"><div class="rf-icl-domains">${column('Language model','One-shot / few-shot evaluation',languageInput,'LLM',languageOutput,step)}${column('Embodied model','Physical one-shot evaluation',physicalInput,'GEN-1.5',physicalOutput,step)}</div><p class="rf-icl-explanation">${explanations[step]}</p></div>`}));
  return figure(2,'From language few-shot to physical one-shot',tabs('rf-physical-icl',panels),`${source('gen','GEN-1.5，Figure 1')} 与 <a href="https://arxiv.org/abs/2005.14165">GPT-3</a> 的 in-context learning 评测方式。两者都将示例放入上下文，保持预训练权重固定，并在新输入上评测；物理提示的示例由传感器观测与动作轨迹组成。`);
}

function genFigure(){return figure(3,'Physical ICL: from demonstrations to success',tabs('rf-gen',[
{label:'Ten tasks',html:chart('gen-tasks',genTasks.map(t=>({label:t[0],values:t.slice(1),group:t[0]})),['ICL · 12-second demo','10 gradient updates · 5 minutes of data'])},
  {label:'Average performance',html:chart('gen-summary',[{label:'One-shot ICL',values:[59],details:['±10 percentage points, standard deviation; no weight updates']},{label:'Few-shot fine-tuning',values:[83],details:['±9 percentage points, standard deviation; 10 gradient updates']}],['Reported mean'])+note('One-shot ICL: 59 ± 10%. Fine-tuning with 5 minutes of data per task and 10 gradient updates: 83 ± 9%. ± denotes standard deviation.')}
],1),`数据来自 ${source('gen','GEN-1.5')} 的任务结果与正文。单位：任务成功率（%）。任务图对比 12 秒示教上下文与 5 分钟数据、10 次梯度更新；正文的 59 ± 10% / 83 ± 9% 分别对应 one-shot ICL 与 fine-tuning，± 表示标准差。`);}

function timelineFigure() {
  const controls = '<button type="button" data-rf-time-mode="simulation" aria-pressed="true">Paused simulation</button><button type="button" data-rf-time-mode="sync" aria-pressed="false">Synchronous robot</button><button type="button" data-rf-time-mode="async" aria-pressed="false">Asynchronous robot</button>';
  const lane = (label,key,blocks,extra='') => `<div class="rf-time-lane ${extra}"><span>${label}</span><div data-rf-lane="${key}">${blocks.map(([left,width,text,active])=>`<i style="left:${left}%;width:${width}%"${active?' class="rf-world-active"':''}>${text}</i>`).join('')}</div></div>`;
  const timeline = lane('Observation','obs',[[0,6,'O₁'],[48,6,'O₂'],[94,6,'O₃']])
    +lane('Reasoning','reason',[[7,28,'R₁'],[55,28,'R₂']])
    +lane('Action','action',[[36,11,'A₁'],[84,10,'A₂']])
    +lane('Physical time','world',[[0,36,'Paused'],[36,11,'Runs',true],[47,37,'Paused'],[84,10,'Runs',true],[94,6,'Paused']],'rf-world-lane');
  return figure(16,'Does the world wait for reasoning?',`<div class="rf-time-widget" data-rf-time><div class="rf-controls">${controls}</div><label class="rf-time-slider">Time <input type="range" min="0" max="100" value="30" step="1" aria-label="Scrub the timeline" data-rf-time-range><output data-rf-time-position>30 / 100</output></label><div class="rf-timeline" data-rf-timeline><div class="rf-time-cursor" style="--rf-progress:.3" data-rf-time-cursor></div>${timeline}</div><output class="rf-time-status" data-rf-time-status aria-live="polite">Paused simulation: reasoning runs while physical time is paused.</output>${note('Simulation pauses during reasoning; a synchronous robot waits for its next action while the world keeps moving; asynchronous execution overlaps observation, reasoning, and control.')}</div>`,`暂停仿真、同步真机与异步交互的时间关系。横轴为归一化的墙钟时间；Physical time 一行标明环境时间是冻结还是推进，异步模式展示观测、推理与控制的并行关系。`);
}

function verifiedPromptFigure() {
  const d = DATA.astranomy.prompt;
  const panels = d.tabs.map(t => ({
    label: t.label,
    html: `<pre class="rf-prompt-code" lang="en" aria-label="${esc(t.label)} original prompt" tabindex="0">${esc(t.original_text)}</pre>`
  }));
  return figure(14, 'Prompt variants', tabs('rf-prompt-inspector', panels), `Base execution timing; gripper and camera geometry. Source: <a href="${d.inspector_source_url}">Astranomy</a>. <a href="${d.original_text_provenance.license_asset}">Prompt license</a>.`);
}

const { policyFigure, iclFigure, verifiedHistoryFigure } = createConceptFigures({DATA,figure,source,esc,note,tabs});
const { budgetFigure, robocasaFigure, wamFigure, tactileFigure, dexterityFigure, ablationFigure } = createChartFigures({DATA,figure,source,esc,note,tabs,chart});

return function renderFigure(index){switch(Number(index)){
case 1:return policyFigure();case 2:return physicalFigure();case 3:return genFigure();case 4:return iclFigure();case 5:return budgetFigure();
case 6:return '';case 7:return tactileFigure();case 8:return dexterityFigure();case 9:return robocasaFigure();case 10:return wamFigure();
case 11:return ablationFigure(11,'action','Action representation: EEF vs. joint');case 12:return verifiedHistoryFigure();case 13:return ablationFigure(13,'history','History: recent observations and interaction memory');case 14:return verifiedPromptFigure();case 15:return ablationFigure(15,'prompt','Prompt: embodiment and camera information');case 16:return timelineFigure();
default:throw new Error(`Unknown report figure ${index}`);
}}

}

const renderers = { zh: createFigureRenderer('zh'), en: createFigureRenderer('en') };
export function renderFigure(index, language = 'zh') {
  return renderers[language === 'en' ? 'en' : 'zh'](index);
}

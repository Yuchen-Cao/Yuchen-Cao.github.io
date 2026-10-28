/* Data charts for the Astra report. Shared helpers keep enhancement optional. */
import { reportIcon } from './report-icons.mjs';

// SenseNova's official chart categories, not inferred from benchmark names:
// https://www.sensenova.ai/gpt-6/assets/js/charts.js?v=20261021n (CAT / CATS).
const PLATFORMS = {
  'LIBERO-Long++': ['arm', 'Arm'],
  'LIBERO-PRO': ['arm', 'Arm'],
  'LIBERO-Ultra-Long': ['arm', 'Arm'],
  RoboDojo: ['arm', 'Arm'],
  RoboLab: ['arm', 'Arm'],
  DexJoCo: ['hand', 'Dexterous hand'],
  Bench2Dex: ['hand', 'Dexterous hand'],
  SIMPLE: ['humanoid', 'Humanoid'],
  BEHAVIOR: ['mobile', 'Mobile platform'],
  'VLN-CE-RxR': ['navigation', 'Navigation'],
  'VLN-CE-R2R': ['navigation', 'Navigation'],
  'LHPR-VLN': ['navigation', 'Navigation'],
};

export function createChartFigures({ DATA, figure, source, esc, note, tabs, chart }) {
  function verticalChart(id, rows, series, opts = {}) {
    const unit = opts.unit ?? '%';
    const groups = [...new Set(rows.map(row => row.group).filter(Boolean))];
    const colors = opts.colors || series.map((_, i) => i);
    const label = opts.metric || (unit === '%' ? 'Success rate (%)' : 'Score (0–100)');
    const filter = groups.length > 1 ? `<label>${esc(opts.filterTitle || 'Group')} <select data-rf-filter aria-label="${esc(opts.filterLabel || 'Task group')}"><option value="all">All</option>${groups.map(group => `<option value="${esc(group)}"${opts.defaultGroup === group ? ' selected' : ''}>${esc(group)}</option>`).join('')}</select></label>` : '';
    return `<div class="rf-chart rc-vertical ${opts.className || ''}" id="${esc(id)}" data-rf-chart>
      <div class="rf-chart-toolbar"><div class="rf-legend">${series.map((name, i) => `<span><i class="rf-swatch rf-c${colors[i]}"></i>${esc(name)}</span>`).join('')}</div>${filter}</div>
      <div class="rc-v-unit">${esc(label)}</div>
      <div class="rc-v-grid" style="--rc-columns:${opts.columns || Math.min(rows.length, 4)}">
        ${rows.map((row, ri) => `<div class="rc-v-row" data-rf-row data-rf-group="${esc(row.group || '')}">
          <div class="rc-v-plot"><div class="rc-v-ticks" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div><div class="rc-v-bars" style="--rc-series:${series.length}">
            ${row.values.map((value, si) => {
              const description = `${row.label} · ${series[si]}: ${value == null ? 'Not reported' : value + unit}${row.details?.[si] ? ` · ${row.details[si]}` : ''}`;
              return `<div class="rc-v-bar-wrap rf-c${colors[si]}" style="--rc-height:${value == null ? 0 : value}%"><div class="rc-v-bar${value == null ? ' rc-v-missing' : ''}" tabindex="0" role="img" aria-label="${esc(description)}" data-rf-value="${esc(description)}"><span class="rc-v-fill"></span></div><span class="rc-v-value" aria-hidden="true">${value == null ? '—' : value}</span></div>`;
            }).join('')}
          </div></div>
          <div class="rc-v-label" id="${esc(id)}-label-${ri}">${row.icon ? `<span class="rc-platform-icon" title="${esc(row.group)}" aria-label="${esc(row.group)}">${reportIcon(row.icon)}</span>` : ''}<strong>${esc(row.label)}</strong>${row.sub ? `<small>${esc(row.sub)}</small>` : ''}</div>
        </div>`).join('')}
      </div><output class="rf-detail" data-rf-detail aria-live="polite"${opts.detail ? '' : ' hidden'}>${esc(opts.detail || '')}</output>
    </div>`;
  }

  const compact = body => `<div class="rc-compact">${body}</div>`;
  const study = (title, meta, body) => `<section class="rc-study"><header class="rc-study-heading"><h5>${esc(title)}</h5><span>${esc(meta)}</span></header>${body}</section>`;

  function budgetFigure() {
    const curves = DATA.studies.sensenova.exact_data.budget_curves;
    const rows = curves.map(curve => {
      const [icon, group] = PLATFORMS[curve.name] || ['robot', 'Other'];
      return { label: curve.name, icon, group, values: [1, 10].map(budget => curve.points.find(point => point.budget === budget)?.success_pct ?? null) };
    });
    return figure(5, 'Interaction budget: standard vs. 10×', tabs('rf-budget', [
      { label: '1× vs. 10×', html: verticalChart('budget', rows, ['1× standard budget', '10× budget'], { columns: 6, className: 'rc-budget', filterTitle: 'Platform', filterLabel: 'Benchmark platform' }) },
      { label: 'Measured budget points', html: compact(chart('budget-points', curves.flatMap(curve => curve.points.map(point => ({ label: `${curve.name} · ${point.budget}×`, values: [point.success_pct], group: curve.name }))), ['Success rate'], { filterTitle: 'Benchmark', filterLabel: 'Benchmark', defaultGroup: 'RoboDojo' })) },
    ]), `${source('sense', 'SenseNova，Figure 4')} 的推理预算与成功率。单位：成功率（%）；预算倍率指环境动作步数，扩展同一个 episode，不重置环境。BEHAVIOR 未测 10×。`);
  }

  function robocasaFigure() {
    const rows = DATA.studies.galbot.exact_data.robocasa.rows.map((row, i) => ({ label: i === 3 ? 'Overall' : row[0], values: row.slice(1), group: i === 2 ? 'Unseen' : i === 3 ? 'Overall' : 'Seen' }));
    return figure(9, 'RoboCasa365: seen tasks and unseen compositions', verticalChart('robocasa', rows, ['π0.5', 'Astra Direct', 'Astra Hybrid']), `数据来自 ${source('galbot', 'Galbot，Table 6')}。单位：成功率（%）；每个 split 选取 5 个任务，每任务 5 个 episode。Composite unseen 中 Direct 为 56%，Hybrid 为 36%，π0.5 为 4%。`);
  }

  function wamFigure() {
    const data = DATA.studies.longwam.exact_data;
    const methods = data.rows.filter(row => row[0] !== 'pi0.5');
    const pair = data.rows.filter(row => row[0] === 'Long-WAM' || row[0] === 'Long-WAM + GPT-6 Astra');
    const labels = ['Atomic seen', 'Composite seen', 'Composite unseen', 'Overall'];
    const rowsFor = selected => labels.map((label, i) => ({ label, values: selected.map(method => method[i + 1]), group: i === 2 ? 'Unseen' : i === 3 ? 'Overall' : 'Seen' }));
    return figure(10, 'Long-WAM: planning with Astra', tabs('rf-wam', [
      { label: 'Four strategies', html: verticalChart('wam-all', rowsFor(methods), ['GPT-6 Astra', 'π0.5 + Astra', 'Long-WAM', 'Long-WAM + Astra'], { colors: [3, 0, 1, 2], className: 'rc-four-series' }) },
      { label: 'Effect of adding Astra', html: verticalChart('wam-pair', rowsFor(pair), ['Long-WAM', 'Long-WAM + Astra'], { colors: [1, 2] }) },
    ], 1), `数据来自 ${source('wam', 'Long-WAM，RoboCasa365 planning')}。单位：成功率（%）。同一 Human300 训练的 Long-WAM checkpoint、2.4 秒视觉历史；加入 Astra 时不再训练策略。Overall 对 50 个任务汇总（18 个 Atomic-Seen、16 个 Composite-Seen、16 个 Composite-Unseen）。`);
  }

  function tactileFigure() {
    const yang = study('Yang et al.', '10 trials / condition', verticalChart('touch-yang', [{ label: 'Insert Hole · UniVTAC', values: [60, 100], details: ['6 / 10 successes', '10 / 10 successes'] }], ['Vision only', 'Vision + tactile RGB']) + note('Tactile signals are supplied as RGB images.'));
    const wang = study('Wang et al.', '100 trials / condition', verticalChart('touch-wang', [{ label: 'Insert Hole', values: [31, 99], details: ['31 / 100 successes', '99 / 100 successes'] }], ['Vision + proprioception', '+ tactile input + references']) + note('The ablation removes both tactile observations and references; Task Skills match the observations available in each condition.'));
    return figure(7, 'Tactile feedback: two independent insertion studies', `<div class="rc-paired rc-tactile">${yang}${wang}</div>`, `两项独立仿真实验，单位为成功率（%）。<a href="${DATA.studies.tactalent.url}">Yang et al.，Table 1</a> 每条件 10 次，60% → 100%；<a href="${DATA.studies.gpt_tactile_policy.url}">Wang et al.，Table 3</a> 每条件 100 次，31% → 99%。`);
  }

  function dexterityFigure() {
    const data = DATA.studies.galbot.exact_data.dexterity;
    const groups = ['Transport & storage', 'Transport & storage', 'Transport & storage', 'Contact & alignment', 'Transport & storage', 'Transport & storage', 'Contact & alignment', 'Contact & alignment', 'Contact & alignment', 'Contact & alignment'];
    return figure(8, 'Dexterity: high-level corrections and motion priors', compact(tabs('rf-dexterity', [
      { label: 'Task results', html: chart('dexterity', data.rows.map((row, i) => ({ label: row[0], values: row.slice(1), group: groups[i] })), ['π0.5', 'Astra Direct', 'Astra Hybrid'], { unit: '', detail: 'Subgoal completion score (0–100).' }) },
      { label: 'Overall mean', html: chart('dexterity-mean', [{ label: 'Mean across 10 tasks', values: data.mean }], ['π0.5', 'Astra Direct', 'Astra Hybrid'], { unit: '' }) + note('Hybrid uses unchanged π0.5 actions for 88.02% of execution steps and Astra corrections for 11.98%.') },
    ])), `数据：${source('galbot', 'Galbot，Table 3')}。指标是子目标完成分数（0–100）；每任务 5 个 case。π0.5 / Direct / Hybrid 平均为 44.2 / 16.6 / 61.6。`);
  }

  function ablationFigure(n, key, title) {
    const data = DATA.astranomy[key];
    const policies = ['Direct Policy', 'Agentic Policy'];
    const panels = policies.map((policy, pi) => {
      const rows = data.rows.filter(row => row.policy === policy);
      const metadata = `${rows[0].tasks} tasks · ${rows[0].episodes} episodes / condition`;
      const body = compact(chart(`astra-${key}-${pi}`, rows.map(row => ({
        label: row.label,
        values: [row.sr, row.score],
        details: [row.successes != null ? `${row.successes} / ${row.episodes} successes` : `${row.tasks} tasks · ${row.episodes} episodes`, 'Mean score including partial completion'],
      })), ['SR (%)', 'Score (/100)'], { unit: '' }));
      return { label: policy, html: study(policy, metadata, body) };
    });
    const body = key === 'action'
      ? tabs(`rf-${key}-metric`, panels)
      : `<div class="rc-paired rc-ablation">${panels.map(panel => panel.html).join('')}</div>`;
    const caption = key === 'history' ? data.result_caption_zh : key === 'prompt'
      ? 'Prompt 几何信息消融。Direct Policy 的成功率从 Base 的 19.3% 提升到同时提供夹爪和相机几何信息时的 72.7%；Agentic Policy 的对应变化为 83.3% 至 86.0%。每配置包含 30 个任务、150 个 episode。SR 为成功率，Score 包含部分完成得分。'
      : data.caption_zh;
    return figure(n, title, body, `${caption} 数据：<a href="${data.source_url}">Astranomy 原图</a>。`);
  }

  return { budgetFigure, robocasaFigure, wamFigure, tactileFigure, dexterityFigure, ablationFigure };
}

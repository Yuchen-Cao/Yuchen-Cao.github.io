/* Data charts for the Astra report. Shared helpers keep enhancement optional. */
import { reportIcon } from './report-icons.mjs';

// SenseNova's official chart categories, not inferred from benchmark names:
// https://www.sensenova.ai/gpt-6/assets/js/charts.js?v=20261021n (CAT / CATS).
const PLATFORMS = {
  'LIBERO-Long++': ['arm', '机械臂'],
  'LIBERO-PRO': ['arm', '机械臂'],
  'LIBERO-Ultra-Long': ['arm', '机械臂'],
  RoboDojo: ['arm', '机械臂'],
  RoboLab: ['arm', '机械臂'],
  DexJoCo: ['hand', '灵巧手'],
  Bench2Dex: ['hand', '灵巧手'],
  SIMPLE: ['humanoid', '人形机器人'],
  BEHAVIOR: ['mobile', '移动平台'],
  'VLN-CE-RxR': ['navigation', '导航'],
  'VLN-CE-R2R': ['navigation', '导航'],
  'LHPR-VLN': ['navigation', '导航'],
};

export function createChartFigures({ DATA, figure, source, esc, note, tabs, chart }) {
  function verticalChart(id, rows, series, opts = {}) {
    const unit = opts.unit ?? '%';
    const groups = [...new Set(rows.map(row => row.group).filter(Boolean))];
    const colors = opts.colors || series.map((_, i) => i);
    const label = opts.metric || (unit === '%' ? '成功率 (%)' : '分数 (0–100)');
    const filter = groups.length > 1 ? `<label>${esc(opts.filterTitle || '任务分组')} <select data-rf-filter aria-label="${esc(opts.filterLabel || '筛选任务分组')}"><option value="all">全部</option>${groups.map(group => `<option value="${esc(group)}"${opts.defaultGroup === group ? ' selected' : ''}>${esc(group)}</option>`).join('')}</select></label>` : '';
    return `<div class="rf-chart rc-vertical ${opts.className || ''}" id="${esc(id)}" data-rf-chart>
      <div class="rf-chart-toolbar"><div class="rf-legend">${series.map((name, i) => `<span><i class="rf-swatch rf-c${colors[i]}"></i>${esc(name)}</span>`).join('')}</div>${filter}</div>
      <div class="rc-v-unit">${esc(label)}</div>
      <div class="rc-v-grid" style="--rc-columns:${opts.columns || Math.min(rows.length, 4)}">
        ${rows.map((row, ri) => `<div class="rc-v-row" data-rf-row data-rf-group="${esc(row.group || '')}">
          <div class="rc-v-plot"><div class="rc-v-ticks" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div><div class="rc-v-bars" style="--rc-series:${series.length}">
            ${row.values.map((value, si) => {
              const description = `${row.label} · ${series[si]}：${value == null ? '未报告' : value + unit}${row.details?.[si] ? ` · ${row.details[si]}` : ''}`;
              return `<div class="rc-v-bar-wrap rf-c${colors[si]}" style="--rc-height:${value == null ? 0 : value}%"><div class="rc-v-bar${value == null ? ' rc-v-missing' : ''}" tabindex="0" role="img" aria-label="${esc(description)}" data-rf-value="${esc(description)}"><span class="rc-v-fill"></span></div><span class="rc-v-value" aria-hidden="true">${value == null ? '—' : value}</span></div>`;
            }).join('')}
          </div></div>
          <div class="rc-v-label" id="${esc(id)}-label-${ri}">${row.icon ? `<span class="rc-platform-icon" title="${esc(row.group)}" aria-label="${esc(row.group)}">${reportIcon(row.icon)}</span>` : ''}<strong>${esc(row.label)}</strong>${row.sub ? `<small>${esc(row.sub)}</small>` : ''}</div>
        </div>`).join('')}
      </div><output class="rf-detail" data-rf-detail aria-live="polite">${esc(opts.detail || '悬停或用 Tab 聚焦柱形，查看具体条件与数值。')}</output>
    </div>`;
  }

  const compact = body => `<div class="rc-compact">${body}</div>`;
  const study = (title, meta, body) => `<section class="rc-study"><header class="rc-study-heading"><h5>${esc(title)}</h5><span>${esc(meta)}</span></header>${body}</section>`;

  function budgetFigure() {
    const curves = DATA.studies.sensenova.exact_data.budget_curves;
    const rows = curves.map(curve => {
      const [icon, group] = PLATFORMS[curve.name] || ['robot', '其他'];
      return { label: curve.name, icon, group, values: [1, 10].map(budget => curve.points.find(point => point.budget === budget)?.success_pct ?? null) };
    });
    return figure(5, '交互预算：标准步数与 10× 上限', tabs('rf-budget', [
      { label: '1× / 10× 对比', html: verticalChart('budget', rows, ['1× 标准预算', '10× 预算'], { columns: 6, className: 'rc-budget', filterTitle: '平台类型', filterLabel: '按平台类型筛选 benchmark' }) },
      { label: '各任务的实测预算点', html: compact(chart('budget-points', curves.flatMap(curve => curve.points.map(point => ({ label: `${curve.name} · ${point.budget}×`, values: [point.success_pct], group: curve.name }))), ['成功率'], { filterLabel: '选择预算曲线对应任务', defaultGroup: 'RoboDojo', detail: '选择任务，查看报告中的各个实测预算点。' })) },
    ]), `${source('sense', 'SenseNova，Figure 4')} 的推理预算与成功率。单位：成功率（%）；预算倍率指环境动作步数，扩展同一个 episode，不重置环境。BEHAVIOR 未测 10×。`);
  }

  function robocasaFigure() {
    const rows = DATA.studies.galbot.exact_data.robocasa.rows.map((row, i) => ({ label: i === 3 ? 'Overall' : row[0], values: row.slice(1), group: i === 2 ? '未见' : i === 3 ? '总体' : '已见' }));
    return figure(9, 'RoboCasa365：见过的任务与未见组合', verticalChart('robocasa', rows, ['π0.5', 'Astra Direct', 'Astra Hybrid']), `数据来自 ${source('galbot', 'Galbot，Table 6')}。单位：成功率（%）；每个 split 选取 5 个任务，每任务 5 个 episode。Composite unseen 中 Direct 为 56%，Hybrid 为 36%，π0.5 为 4%。`);
  }

  function wamFigure() {
    const data = DATA.studies.longwam.exact_data;
    const methods = data.rows.filter(row => row[0] !== 'pi0.5');
    const pair = data.rows.filter(row => row[0] === 'Long-WAM' || row[0] === 'Long-WAM + GPT-6 Astra');
    const labels = ['Atomic seen', 'Composite seen', 'Composite unseen', 'Overall'];
    const rowsFor = selected => labels.map((label, i) => ({ label, values: selected.map(method => method[i + 1]), group: i === 2 ? '未见' : i === 3 ? '总体' : '已见' }));
    return figure(10, 'Long-WAM：加入 Astra 后的规划收益', tabs('rf-wam', [
      { label: '四种策略', html: verticalChart('wam-all', rowsFor(methods), ['GPT-6 Astra', 'π0.5 + Astra', 'Long-WAM', 'Long-WAM + Astra'], { colors: [3, 0, 1, 2], className: 'rc-four-series' }) },
      { label: '聚焦引入 Astra 的变化', html: verticalChart('wam-pair', rowsFor(pair), ['Long-WAM', 'Long-WAM + Astra'], { colors: [1, 2] }) },
    ], 1), `数据来自 ${source('wam', 'Long-WAM，RoboCasa365 planning')}。单位：成功率（%）。同一 Human300 训练的 Long-WAM checkpoint、2.4 秒视觉历史；加入 Astra 时不再训练策略。Overall 对 50 个任务汇总（18 个 Atomic-Seen、16 个 Composite-Seen、16 个 Composite-Unseen）。`);
  }

  function tactileFigure() {
    const yang = study('Yang et al.', '每条件 10 次', verticalChart('touch-yang', [{ label: 'Insert Hole · UniVTAC', values: [60, 100], details: ['6 / 10 次成功', '10 / 10 次成功'] }], ['仅视觉', '视觉 + 触觉 RGB']) + note('触觉通过 RGB 图像接口输入。'));
    const wang = study('Wang et al.', '每条件 100 次', verticalChart('touch-wang', [{ label: 'Insert Hole', values: [31, 99], details: ['31 / 100 次成功', '99 / 100 次成功'] }], ['视觉 + 本体状态', '加入触觉观测与参考']) + note('消融同时移除触觉观测与触觉参考，各条件使用与观测匹配的 Task Skill。'));
    return figure(7, '触觉反馈：两个独立的插孔实验', `<div class="rc-paired rc-tactile">${yang}${wang}</div>`, `两项独立仿真实验，单位为成功率（%）。<a href="${DATA.studies.tactalent.url}">Yang et al.，Table 1</a> 每条件 10 次，60% → 100%；<a href="${DATA.studies.gpt_tactile_policy.url}">Wang et al.，Table 3</a> 每条件 100 次，31% → 99%。`);
  }

  function dexterityFigure() {
    const data = DATA.studies.galbot.exact_data.dexterity;
    const groups = ['搬运与收纳', '搬运与收纳', '搬运与收纳', '接触与对齐', '搬运与收纳', '搬运与收纳', '接触与对齐', '接触与对齐', '接触与对齐', '接触与对齐'];
    return figure(8, 'Dexterity：高层修正与低层控制先验', compact(tabs('rf-dexterity', [
      { label: '按操作类型查看', html: chart('dexterity', data.rows.map((row, i) => ({ label: row[0], values: row.slice(1), group: groups[i] })), ['π0.5', 'Astra Direct', 'Astra Hybrid'], { unit: '', detail: '条形表示子目标完成分数（0–100）。' }) },
      { label: '总体均值', html: chart('dexterity-mean', [{ label: '10 个任务平均', values: data.mean }], ['π0.5', 'Astra Direct', 'Astra Hybrid'], { unit: '' }) + note('Hybrid 约 88.02% 的执行步沿用未修改的 π0.5 动作，11.98% 由 Astra 修正；占比按执行步数计算。') },
    ])), `数据：${source('galbot', 'Galbot，Table 3')}。指标是子目标完成分数（0–100）；每任务 5 个 case。π0.5 / Direct / Hybrid 平均为 44.2 / 16.6 / 61.6。可按操作类型筛选任务。`);
  }

  function ablationFigure(n, key, title) {
    const data = DATA.astranomy[key];
    const policies = ['Direct Policy', 'Agentic Policy'];
    const panels = policies.map((policy, pi) => {
      const rows = data.rows.filter(row => row.policy === policy);
      const metadata = `${rows[0].tasks} tasks · ${rows[0].episodes} episodes / 条件`;
      const body = compact(chart(`astra-${key}-${pi}`, rows.map(row => ({
        label: row.label,
        values: [row.sr, row.score],
        details: [row.successes != null ? `${row.successes} / ${row.episodes} 次成功` : `${row.tasks} tasks · ${row.episodes} episodes`, '包含部分完成的平均得分'],
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

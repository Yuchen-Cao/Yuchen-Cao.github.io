import { reportIcon } from './report-icons.mjs';

/* Layout-only views: the verified data and citation helpers stay with the report. */
export function createConceptFigures({ DATA, figure, source, esc, note, tabs }) {
  const icon = reportIcon;
  const arrow = (label = '') => `<div class="rc-arrow" aria-hidden="true"><span>↓</span>${label ? `<small>${label}</small>` : ''}</div>`;
  const node = (kind, label, detail = '', tone = '') => `<div class="rc-node ${tone ? `rc-tone-${tone}` : ''}">${icon(kind)}<div><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ''}</div></div>`;
  const robot = (kind, label, detail = '') => `<div class="rc-robot">${icon(kind)}<strong>${label}</strong>${detail ? `<small>${detail}</small>` : ''}</div>`;
  const disclosure = (label, body) => `<details class="rc-disclosure"><summary>${label}</summary><div>${body}</div></details>`;

  function policyFigure() {
    const policies = [
      {
        title: 'Direct Policy', subtitle: 'Predict the actions',
        core: node('brain', 'Astra', 'EEF / joint action targets', 'green'),
        action: 'Action chunk', robot: 'robot', robotLabel: 'Robot + controller',
        detail: 'Astra maps task instructions and observations to action targets. The controller executes them and returns new observations. An EEF interface can still use inverse kinematics and low-level control.'
      },
      {
        title: 'Agentic Policy', subtitle: 'Reason, act, observe',
        core: node('brain', 'Astra + harness', 'Plan · tools · persistent history', 'green'),
        action: 'Tool calls', robot: 'robot', robotLabel: 'Robot environment',
        detail: 'Astra interacts through a harness that retains plans and tool interactions. Fresh observations and execution feedback inform the next action and replan.'
      },
      {
        title: 'RFM-assisted', subtitle: 'Reason with a motion prior',
        core: `<div class="rc-policy-pair">${node('brain', 'Astra', 'Plan · review · correct', 'green')}<span aria-hidden="true">↕</span>${node('motion', 'RFM / VLA / WAM', 'Learned motion prior', 'blue')}</div>`,
        action: 'Robot actions', robot: 'robot', robotLabel: 'Robot + controller',
        detail: 'Astra works with a learned robot policy. The policy can propose actions or carry out lower-level motion; Astra supplies higher-level reasoning, review or corrections. The division of work depends on the implementation.'
      }
    ];
    const body = `<div class="rc-policy-grid" lang="en">${policies.map((p, i) => `<section class="rc-policy-column"><header class="rc-column-heading"><span class="rc-step">0${i + 1}</span><h5>${p.title}</h5><p>${p.subtitle}</p></header>${node('eye', 'Observations + task', 'Images · state · instruction', 'blue')}${arrow()}<div class="rc-policy-core">${p.core}</div>${arrow(p.action)}${robot(p.robot, p.robotLabel)}<div class="rc-feedback">↶ Observation &amp; feedback</div>${disclosure('Inside the control loop', p.detail)}</section>`).join('')}</div>`;
    return figure(1, 'Three paths to a robot policy', body, `三类控制方案的概念归纳。箭头表示信息与动作流向。具体实现参考 ${source('galbot', 'Galbot')} 与 ${source('astra', 'Astranomy')}。`);
  }

  function iclFigure() {
    const contents = [
      ['book', 'Task guidance', 'Task-specific instructions and constraints.'],
      ['motion', 'Motion references', 'Reusable motion references for the task.'],
      ['camera', 'Visual references', 'Visual examples to consult during execution.'],
      ['code', 'Executable helpers', 'Helper code that can be called when needed.'],
      ['check', 'Checks & recovery', 'Checks and recovery guidance for task execution.'],
      ['text', 'Metadata & provenance', 'Information about the package and its sources.']
    ];
    const knowledge = `<div class="rc-knowledge"><header>${icon('package')}<div><strong>Knowledge package <i>K</i></strong><small>Prepared once · frozen before evaluation</small></div></header><div class="rc-package-grid">${contents.map(([kind, label, detail]) => `<details class="rc-package-item"><summary>${icon(kind)}<span>${label}</span></summary><p>${detail}</p></details>`).join('')}</div></div>`;
    const body = `<div class="rc-icl-grid" lang="en"><section class="rc-icl-column"><header class="rc-column-heading"><span class="rc-step">01</span><h5>Preparation</h5><p>Explore and organize</p></header>${node('book', 'Allowed task resources', 'Training data · environment', 'blue')}${arrow()}${node('brain', 'Astra exploration', 'Read · analyze · try · organize', 'green')}${arrow()}${knowledge}</section><section class="rc-icl-column"><header class="rc-column-heading"><span class="rc-step">02</span><h5>Evaluation</h5><p>Use the frozen package</p></header>${node('package', 'Knowledge package K', 'Read-only task context', 'blue')}${arrow()}${node('brain', 'Astra', 'Retrieve · adapt · check', 'green')}${arrow('Actions')}${robot('arm', 'Test episode', 'Live observations & environment feedback')}<div class="rc-feedback">↶ Observe → adapt → act</div>${disclosure('How K enters the loop', 'During evaluation, Astra consults the prepared package and uses current observations to adapt its actions. The package remains fixed while the interaction continues.')}</section></div><div class="rc-constant" lang="en">${icon('check')}<span>Model weights remain fixed during preparation and evaluation.</span></div>`;
    return figure(4, 'SenseNova ICL: preparation and evaluation', body, `SenseNova 将准备阶段的探索整理为知识包，在测试时读取并用于当前任务；两阶段均不更新模型权重。Source: ${source('sense', 'SenseNova')}。`);
  }

  function verifiedHistoryFigure() {
    const d = DATA.astranomy.history;
    const frame = step => step === 0 ? 't' : `t ${step < 0 ? '−' : '+'} ${Math.abs(step)}`;
    const steps = values => `<span class="rc-time-tokens">${values.map(step => `<span${step === 0 ? ' class="rc-now"' : ''}>${frame(step)}</span>`).join('')}</span>`;
    const assistant = {
      all: 'All assistant turns',
      none: 'None',
      at_most_two_previous_turns_at_or_before_past_sampled_observations_deduplicated: '≤ 2 matched prior turns'
    };
    const field = (kind, label, value) => `<div class="rc-history-field">${icon(kind)}<span>${label}</span><div>${value}</div></div>`;
    const columns = ['Direct Policy', 'Agentic Policy'].map((policy, index) => {
      const rows = d.rows.filter(row => row.policy === policy);
      const configs = rows.map(row => {
        const visual = Array.isArray(row.image_steps) ? steps(row.image_steps) : '<span class="rc-time-tokens"><span>All decision times</span></span>';
        const prior = assistant[row.assistant_history];
        const extra = row.assistant_history === 'at_most_two_previous_turns_at_or_before_past_sampled_observations_deduplicated'
          ? '<p class="rc-history-clarification">At or before the sampled past observations; duplicate turns are removed.</p>' : '';
        return `<details class="rc-history-config"${row.default ? ' open' : ''}><summary><span>${esc(row.label)}</span>${row.default ? '<small>Default</small>' : ''}</summary><div class="rc-history-fields">${field('camera', 'Visual', visual)}${field('state', 'State', steps(row.proprioception_steps))}${field('history', 'Assistant', esc(prior))}${extra}</div></details>`;
      }).join('');
      return `<section class="rc-history-column"><header class="rc-column-heading"><span class="rc-step">${icon(index === 0 ? 'camera' : 'history')}</span><h5>${policy}</h5><p>${index === 0 ? 'Sampled images + robot state' : 'Visual + assistant history'}</p></header><div class="rc-history-configs">${configs}</div><p class="rc-history-footnote">${index === 0 ? 'Images and robot state use the same sampled control steps. Earlier assistant turns are omitted.' : 'Every condition keeps current images, robot state and motion feedback. Earlier state and feedback messages are omitted.'}</p></section>`;
    });
    const body = `<div class="rc-history-grid" lang="en">${columns.join('')}</div><div class="rc-history-legend" lang="en"><span>${icon('state')} Control steps · 15 Hz</span><span>${icon('text')} Assistant = outputs, plans &amp; action calls</span></div>`;
    return figure(12, 'History configuration', body, `Direct Policy 按控制步同步采样图像与本体状态；Agentic Policy 分别保留决策时图像和 assistant 交互历史。时间刻度为 15 Hz 控制步。Source: <a href="${d.configuration_source_url}">Astranomy</a>。`);
  }

  return { policyFigure, iclFigure, verifiedHistoryFigure };
}

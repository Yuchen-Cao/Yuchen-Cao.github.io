/* Figures for the Astra report. Values are transcribed from the linked primary
   sources. Every diagram remains readable before client-side enhancement. */
import { readFileSync } from 'node:fs';
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
const box = (label, body, tone='green') => `<div class="rf-node rf-${tone}"><strong>${label}</strong><span>${body}</span></div>`;
const flow = (...nodes) => `<div class="rf-flow">${nodes.join('<span class="rf-arrow" aria-hidden="true">→</span>')}</div>`;
const note = text => `<p class="rf-note">${text}</p>`;
function figure(n,title,body,caption){return `<figure class="report-figure" id="figure-${n}" aria-labelledby="figure-${n}-title"><div class="rf-surface"><div class="rf-heading"><span class="rf-kicker">FIG. ${String(n).padStart(2,'0')}</span><h4 id="figure-${n}-title">${title}</h4></div>${body}</div><figcaption><strong>图 ${n}.</strong> ${caption}</figcaption></figure>`;}
function tabs(id, items){return `<div class="rf-tabs" data-rf-tabs><div class="rf-controls" role="tablist" aria-label="切换图解内容">${items.map((t,i)=>`<button type="button" id="${id}-tab-${i}" role="tab" data-rf-tab="${id}-${i}" aria-controls="${id}-${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${t.label}</button>`).join('')}</div>${items.map((t,i)=>`<div class="rf-panel" id="${id}-${i}" role="tabpanel" aria-labelledby="${id}-tab-${i}" tabindex="0" data-rf-panel><div class="rf-panel-title">${t.label}</div>${t.html}</div>`).join('')}</div>`;}
function chart(id, rows, series, opts={}){
  const unit=opts.unit??'%', groups=[...new Set(rows.map(r=>r.group).filter(Boolean))];
  return `<div class="rf-chart" data-rf-chart><div class="rf-chart-toolbar"><div class="rf-legend">${series.map((s,i)=>`<span><i class="rf-swatch rf-c${opts.colors?.[i]??i}"></i>${esc(s)}</span>`).join('')}</div>${groups.length>1?`<label>任务分组 <select data-rf-filter aria-label="${esc(opts.filterLabel||'筛选任务分组')}"><option value="all">全部</option>${groups.map(g=>`<option value="${esc(g)}"${opts.defaultGroup===g?' selected':''}>${esc(g)}</option>`).join('')}</select></label>`:''}</div><div class="rf-chart-rows">${rows.map((row,ri)=>`<div class="rf-chart-row" data-rf-group="${esc(row.group||'')}" data-rf-row><div class="rf-row-label">${esc(row.label)}${row.sub?`<small>${esc(row.sub)}</small>`:''}</div><div class="rf-bars">${row.values.map((v,si)=>`<div class="rf-bar-line"><span class="rf-series-label">${esc(series[si])}</span><div class="rf-track"><div class="rf-bar rf-c${opts.colors?.[si]??si}" style="--rf-value:${v==null?0:v}%" tabindex="0" aria-label="${esc(`${row.label}；${series[si]}：${v==null?'未报告':v+unit}${row.details?.[si]?`；${row.details[si]}`:''}`)}" data-rf-value="${esc(`${row.label} · ${series[si]}：${v==null?'未报告':v+unit}${row.details?.[si]?` · ${row.details[si]}`:''}`)}"><span class="rf-bar-fill"></span></div></div><span class="rf-value">${v==null?'—':v}${v==null?'':unit}</span></div>`).join('')}</div></div>`).join('')}</div><div class="rf-chart-axis" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100${unit}</span></div><output class="rf-detail" data-rf-detail aria-live="polite">${esc(opts.detail||'悬停或用 Tab 聚焦条形，查看具体条件与数值。')}</output></div>`;
}
const genTasks=[['取出钱包里的钱',60.7,83.3],['折叠并压平纸张',50,69.3],['拧开玻璃罐盖',60,94.5],['叠放两个小杯',67,75],['用刷子扫垃圾',37.3,99],['打开书封面',54.7,82.7],['把方块扫入碗中',60.8,71.2],['将手机翻面',78,81],['拉开笔袋拉链',55.5,86],['取下真空吸盘',64,86]];
const rcRows=[['Atomic seen',52,28,52,'已见'],['Composite seen',12,16,28,'已见'],['Composite unseen',4,56,36,'未见'],['Overall',22.7,33.3,38.7,'总体']];
const wamRows=[['Atomic seen',67.9,85.6,'已见'],['Composite seen',15.8,38.8,'已见'],['Composite unseen',6.1,35,'未见'],['Overall',31.4,54.4,'总体']];

function policyFigure(){return figure(1,'把 Astra 变成 Robot Policy 的三种方式',tabs('rf-policy',[
  {label:'Direct Policy',html:flow(box('观测 + 任务','当前图像与任务指令','blue'),box('Astra','直接预测 EEF / Joint 动作'),box('控制器 → 机器人','执行动作，返回下一次观测','orange'))+note('模型直接给出动作；EEF 接口通常仍包含逆运动学和底层控制。')},
  {label:'Agentic Policy',html:flow(box('观测 + 任务','读取新的环境反馈','blue'),box('Astra + Harness','计划、代码、工具调用与历史'),box('机器人环境','动作执行与状态反馈','orange'))+`<div class="rf-loop">↶ 交互历史：观测 → 行动 → 反馈 → 再规划</div>`+note('持久化 Harness 把过往计划、工具输出与失败经验保留为下一轮上下文。')},
  {label:'RFM-Assisted',html:flow(box('Astra','分解目标、审核与修正'),box('RFM / VLA / WAM','提出动作或完成底层运动','blue'),box('机器人','执行并回传反馈','orange'))+note('高层推理与学习到的运动先验协作；Galbot 的 Hybrid 是其中一种具体实现。')},
]),`本文对三类控制方案的概念归纳。箭头表示信息与动作的流向，不表示实测延迟；具体实现参考 ${source('galbot','Galbot')} 与 ${source('astra','Astranomy')}。`);}

function physicalFigure(){const scene=(variant)=>`<svg class="rf-physical-scene" viewBox="0 0 600 180" role="img" aria-label="将物体移入容器的示教与执行概念图"><rect x="8" y="8" width="584" height="164" rx="16" fill="var(--rf-soft)"/><path d="M70 127 H535" stroke="var(--rf-line)" stroke-width="2"/><path d="M400 93v40h92V93" fill="none" stroke="var(--rf-green)" stroke-width="6"/><rect x="${variant==='rollout'?420:160}" y="${variant==='rollout'?101:88}" width="31" height="31" rx="7" fill="var(--rf-orange)"/><path d="M115 52L180 68L${variant==='rollout'?438:175} 83" fill="none" stroke="var(--rf-ink)" stroke-width="8" stroke-linecap="round"/><circle cx="180" cy="68" r="9" fill="var(--rf-blue)"/><path d="M210 95Q302 ${variant==='context'?17:50} 399 95" fill="none" stroke="var(--rf-green)" stroke-width="3" stroke-dasharray="6 5"/><text x="75" y="155">观测与动作</text><text x="410" y="155">任务目标</text></svg>`;return figure(2,'Physical prompting：先看一遍，再继续行动',tabs('rf-physical',[
{label:'01 示教',html:scene('demo')+flow(box('Sensorimotor demo','短时观测与动作序列','blue'),box('时间上下文','示教作为输入，而非梯度更新'))+note('示教不仅告诉模型“要做什么”，也提供执行过程中的视觉变化与动作对应关系。')},
{label:'02 放入上下文',html:scene('context')+flow(box('过去：示教','任务的具体示范','blue'),box('现在：新观测','接续同一个时间上下文'),box('下一步：动作','依据当前状态继续','orange'))+note('这里展示的是输入形式的抽象；示意中的物体与路径不对应某一真实 rollout。')},
{label:'03 新场景执行',html:scene('rollout')+flow(box('新初始状态','不必逐帧复现示教','blue'),box('GEN-1.5','利用示教上下文决定动作'),box('执行与反馈','持续生成后续动作','orange'))+note('原报告展示了组合示教、适应新状态等行为；示教与实际执行的差异应通过真实视频判断。')}
]),`根据 ${source('gen','GEN-1.5 技术报告')} 重绘的交互示意。点击步骤查看“示教 → 上下文 → 执行”的信息关系；本图是概念解释，不是机器人实际执行视频。`);}

function genFigure(){return figure(3,'Physical ICL：从示教到任务成功',tabs('rf-gen',[
{label:'十个任务',html:chart('gen-tasks',genTasks.map(t=>({label:t[0],values:t.slice(1),group:t[0]})),['ICL · 12 秒示教','10 次梯度更新 · 5 分钟数据'])},
  {label:'平均表现与适配方式',html:chart('gen-summary',[{label:'One-shot ICL',values:[59],details:['±10 个百分点，标准差；不更新权重']},{label:'Few-shot fine-tuning',values:[83],details:['±9 个百分点，标准差；10 次梯度更新']}],['报告均值'])+note('One-shot ICL 为 59 ± 10%；使用每任务 5 分钟数据、10 次梯度更新的 fine-tuning 为 83 ± 9%。± 表示标准差。两种适配方式的训练预算与输入形式不同。')}
]),`数据来自 ${source('gen','GEN-1.5')} 的任务结果与正文。单位：任务成功率（%）。任务图对比 12 秒示教上下文与 5 分钟数据、10 次梯度更新；正文的 59 ± 10% / 83 ± 9% 分别对应 one-shot ICL 与 fine-tuning，误差为标准差而非置信区间。`);}

function iclFigure(){return figure(4,'SenseNova ICL：把探索整理成可复用的知识包',tabs('rf-knowledge',[
{label:'准备阶段',html:flow(box('训练数据 / 环境','允许用于准备的任务资料','blue'),box('Astra 探索','阅读、分析、试验与整理'),box('Knowledge package K','写入文件并在测试前冻结','orange'))+`<div class="rf-package">${['Task guidance','Motion references','Visual references','Executable helpers','Checks & recovery','Metadata & provenance'].map(x=>box(x,'知识包的组成','blue')).join('')}</div>`+note('ICL 准备阶段产出知识包；不更新模型权重。')},
{label:'测试阶段',html:flow(box('冻结的 K','只读检索与适配','blue'),box('Astra','Retrieve · Adapt · Check'),box('Test episode','根据实时观测执行','orange'))+`<div class="rf-loop">↶ 新观测与环境反馈，继续适配当前任务</div>`+note('测试时读取准备阶段形成的资料，将任务相关知识用于当下的决策。')}
]),`根据 ${source('sense','SenseNova')} 的 Knowledge package 图重绘。它与直接将 sensorimotor demo 放入时间上下文的 Physical ICL，在输入组织与准备流程上不同；二者均不要求测试时更新模型权重。`);}

function budgetFigure(){const curves=DATA.studies.sensenova.exact_data.budget_curves;return figure(5,'交互预算：标准步数与 10× 上限',tabs('rf-budget',[
{label:'1× / 10× 对比',html:chart('budget',curves.map(t=>({label:t.name,values:[1,10].map(b=>t.points.find(p=>p.budget===b)?.success_pct??null),group:t.name.includes('VLN')?'导航':t.name.includes('Dex')||t.name.includes('JoCo')?'灵巧操作':'操作'})),['1× 标准预算','10× 预算'])},
{label:'各任务的实测预算点',html:chart('budget-points',curves.flatMap(t=>t.points.map(p=>({label:`${t.name} · ${p.budget}×`,values:[p.success_pct],group:t.name}))),['成功率'],{filterLabel:'选择预算曲线对应任务',defaultGroup:'RoboDojo',detail:'只展示报告中的离散测量点，不对中间预算作数值插值。'})}
]),`按 ${source('sense','SenseNova，Figure 4')} 的预算曲线实测点重绘。单位：成功率（%）；横向预算倍率指环境动作步数，扩展同一个 episode，不重置环境。BEHAVIOR 未测 10×。仅显示实测点，不绘制拟合曲线或把假设的无限预算上界当作实测值。`);}

function robocasaFigure(){return figure(9,'RoboCasa365：见过的任务与未见组合',chart('robocasa',rcRows.map(r=>({label:r[0],values:r.slice(1,4),group:r[4]})),['π0.5','Astra Direct','Astra Hybrid']),`数据来自 ${source('galbot','Galbot，Table 6')}。单位：成功率（%）；每个 split 选取 5 个任务，每任务 5 个 episode。Composite unseen 中 Direct 为 56%，Hybrid 为 36%，π0.5 为 4%。这里是 Galbot 的评测配置；与下图 Long-WAM 的不同评测协议不可直接横向比较。`);}
function wamFigure() {
  const methods=DATA.studies.longwam.exact_data.rows.filter(r=>r[0]!=='pi0.5');
  const labels=['Atomic seen','Composite seen','Composite unseen','Overall'];
  const rows=labels.map((label,i)=>({label,values:methods.map(m=>m[i+1]),group:i===2?'未见':i===3?'总体':'已见'}));
  return figure(10,'Long-WAM：加入 Astra 后的规划收益',tabs('rf-wam',[
    {label:'原图四种策略',html:chart('wam-all',rows,['GPT-6 Astra','π0.5 + Astra','Long-WAM','Long-WAM + Astra'],{colors:[3,0,1,2]})},
    {label:'聚焦 Long-WAM 的变化',html:chart('wam-pair',wamRows.map(r=>({label:r[0],values:r.slice(1,3),group:r[3]})),['Long-WAM','Long-WAM + Astra'],{colors:[1,2]})}
  ]),`数据来自 ${source('wam','Long-WAM，RoboCasa365 planning')}。单位：成功率（%）。同一 Human300 训练的 Long-WAM checkpoint、2.4 秒视觉历史；加入 Astra 时不再训练策略。Overall 对 50 个任务汇总（18 个 Atomic-Seen、16 个 Composite-Seen、16 个 Composite-Unseen），不是三个 split 百分比的简单平均；不可与 Galbot 的不同评测协议直接横比。`);
}

function timelineFigure() {
  const controls = '<button type="button" data-rf-time-mode="simulation" aria-pressed="true">暂停仿真</button><button type="button" data-rf-time-mode="sync" aria-pressed="false">同步真机</button><button type="button" data-rf-time-mode="async" aria-pressed="false">异步交互</button>';
  const lane = (label,key,blocks,extra='') => `<div class="rf-time-lane ${extra}"><span>${label}</span><div data-rf-lane="${key}">${blocks.map(([left,width,text,active])=>`<i style="left:${left}%;width:${width}%"${active?' class="rf-world-active"':''}>${text}</i>`).join('')}</div></div>`;
  const timeline = lane('Observation','obs',[[0,6,'O₁'],[48,6,'O₂'],[94,6,'O₃']])
    +lane('Reasoning','reason',[[7,28,'推理 R₁'],[55,28,'推理 R₂']])
    +lane('Action','action',[[36,11,'A₁'],[84,10,'A₂']])
    +lane('Physical time','world',[[0,36,'冻结'],[36,11,'推进',true],[47,37,'冻结'],[84,10,'推进',true],[94,6,'冻结']],'rf-world-lane');
  return figure(16,'当推理需要时间，物理世界会不会等待？',`<div class="rf-time-widget" data-rf-time><div class="rf-controls">${controls}</div><label class="rf-time-slider">查看时刻 <input type="range" min="0" max="100" value="30" step="1" aria-label="拖动查看时间线" data-rf-time-range><output data-rf-time-position>30 / 100</output></label><div class="rf-timeline" data-rf-timeline><div class="rf-time-cursor" style="--rf-progress:.3" data-rf-time-cursor></div>${timeline}</div><output class="rf-time-status" data-rf-time-status aria-live="polite">暂停仿真：模型正在推理，环境的物理时间被冻结。</output>${note('切换三种执行方式并拖动游标。仿真可以在推理时暂停；同步真机仍等待下一段动作，但外界持续变化；异步交互让观测、推理与控制重叠。')}</div>`,`作者对暂停仿真、同步真机与异步交互的概念重绘。横轴为归一化的墙钟时间，非实测秒数；Physical time 一行标明环境时间是冻结还是推进。异步的并行关系是设计示意，不能据此推断吞吐或成功率收益。`);
}

function tactileFigure(){return figure(7,'触觉反馈：两个独立的插孔实验',tabs('rf-tactile',[
{label:'Yang et al. · 10 次 / 条件',html:chart('touch-yang',[{label:'Insert Hole · UniVTAC',values:[60,100],details:['6 / 10 次成功','10 / 10 次成功']}],['仅视觉','视觉 + 触觉 RGB'])+note('触觉通过 RGB 图像接口输入。这里比较的是同一研究的配对条件。')},
{label:'Wang et al. · 100 次 / 条件',html:chart('touch-wang',[{label:'Insert Hole',values:[31,99],details:['31 / 100 次成功','99 / 100 次成功']}],['视觉 + 本体状态','加入触觉观测与参考'])+note('该消融同时移除了触觉观测与触觉参考，各条件使用与可用观测匹配的 Task Skill。')}
]),`两项独立仿真实验，单位为成功率（%）。<a href="${DATA.studies.tactalent.url}">Yang et al.，Table 1</a> 每条件 10 次，60% → 100%；<a href="${DATA.studies.gpt_tactile_policy.url}">Wang et al.，Table 3</a> 每条件 100 次，31% → 99%。只宜比较各研究内部的配对条件；结果不能证明 Astra 预训练中包含了触觉数据。`);}

function dexterityFigure(){const d=DATA.studies.galbot.exact_data.dexterity;const groups=['搬运与收纳','搬运与收纳','搬运与收纳','接触与对齐','搬运与收纳','搬运与收纳','接触与对齐','接触与对齐','接触与对齐','接触与对齐'];return figure(8,'Dexterity：高层修正与低层控制先验',tabs('rf-dexterity',[
{label:'按操作类型查看',html:chart('dexterity',d.rows.map((r,i)=>({label:r[0],values:r.slice(1),group:groups[i]})),['π0.5','Astra Direct','Astra Hybrid'],{unit:'',detail:'条形表示子目标完成分数（0–100），不是二元成功率。'})},
{label:'总体均值',html:chart('dexterity-mean',[{label:'10 个任务平均',values:d.mean}],['π0.5','Astra Direct','Astra Hybrid'],{unit:''})+note('Hybrid 约 88.02% 的执行步沿用未修改的 π0.5 动作，11.98% 由 Astra 修正；这描述控制来源，不是成功率。')}
]),`根据 ${source('galbot','Galbot，Table 3')} 重绘。指标是子目标完成分数（0–100），不是二元成功率；每任务 5 个 case。π0.5 / Direct / Hybrid 平均为 44.2 / 16.6 / 61.6。操作类型分组仅用于本文浏览，不是论文新设的评测 split。`);}

function ablationFigure(n,key,title){const d=DATA.astranomy[key];const rows=d.rows;return figure(n,title,tabs(`rf-${key}-metric`,['Direct Policy','Agentic Policy'].map(policy=>({label:policy,html:chart(`astra-${key}-${policy}`,rows.filter(r=>r.policy===policy).map(r=>({label:r.label,values:[r.sr,r.score],sub:`${r.tasks} tasks · ${r.episodes} episodes`,details:[r.successes?`${r.successes} / ${r.episodes} 次成功`:`${r.episodes} episodes`, '包含部分完成的平均得分']})),['SR (%)','Score (/100)'],{unit:''})}))),`${key==='history'?d.result_caption_zh:d.caption_zh} 数据：<a href="${d.source_url}">Astranomy 原图</a>。${key==='history'?' Direct 与 Agentic 使用不同样本集，不能把两组差异全部归因于策略本身。':' 小幅差异未被证明具有统计显著性。'}`);}

function verifiedHistoryFigure() {
  const d = DATA.astranomy.history;
  const frame = x => x === 0 ? 't' : `t ${x < 0 ? '−' : '+'} ${Math.abs(x)}`;
  const historyLabel = {
    all: '完整 assistant 历史', none: '不保留 assistant 历史',
    at_most_two_previous_turns_at_or_before_past_sampled_observations_deduplicated: '最多保留两个对应历史回合'
  };
  const policyPanels = ['Direct Policy', 'Agentic Policy'].map((policy, pi) => {
    const configPanels = d.rows.filter(r => r.policy === policy).map(r => {
      const steps = Array.isArray(r.image_steps) ? r.image_steps : ['过去的决策时刻', '…', '当前'];
      const memory = steps.map(x => `<div class="rf-memory-cell rf-current"><b>${typeof x === 'number' ? frame(x) : x}</b><span>图像观测</span></div>`).join('');
      const inputs = box('本体状态', r.proprioception_steps.map(frame).join(' · '), 'blue') + box('文本历史', historyLabel[r.assistant_history], 'orange');
      const explanation = policy === 'Agentic Policy'
        ? '所有条件均保留当前图像、本体状态与运动反馈。历史文本包括模型输出、计划与动作调用；旧的机器人状态和反馈消息不直接保留。'
        : '图像与本体状态在相同控制步采样；不保留此前 assistant 交互历史。时间刻度是 15 Hz 的控制步，不是秒。';
      return { label: r.label, html: `<div class="rf-memory">${memory}</div><div class="rf-package">${inputs}</div>${note(explanation)}` };
    });
    return { label: policy, html: tabs(`rf-history-config-${pi}`, configPanels) };
  });
  return figure(12, 'History configuration：分别保留哪些信息', tabs('rf-history-policy', policyPanels), `${d.configuration_caption_zh} 依据 <a href="${d.configuration_source_url}">Astranomy 历史配置</a> 重绘；图形位置仅示意采样顺序，具体控制步已逐项标注。`);
}

function verifiedPromptFigure(){const d=DATA.astranomy.prompt;const text={
base:`机器人：Franka Panda + Robotiq 2F-85\n根坐标：+X 向桌面前方，+Y 向左，+Z 向上\n\n动作格式：x y z qw qx qy qz gripper\n位置单位：m；四元数顺序：wxyz（单位化）\nEEF 位姿参考：夹爪安装法兰，不是指尖中心\n夹爪命令：0 = 张开，1 = 闭合\n\n控制频率：15 Hz\n每行平移上限：0.02 m；旋转上限：0.1 rad\n当前 Base 片段：每次输出 3–15 个目标\n目标之间不额外插值；模型推理时仿真暂停`,
gripper:`局部 +X：指垫延伸方向；局部 Y：夹爪开合方向\n从法兰到指垫中点的局部偏移：[d, 0, 0]\n\ng（实测闭合度）   d (m)      内侧间距 (m)\n${d.tabs[1].facts.pad_geometry_table.map(r=>`${String(r.g).padEnd(18)}${String(r.d_m).padEnd(11)}${r.inner_gap_m}`).join('\n')}\n\np_pad = p_flange + R(ee_quat) × [d, 0, 0]\n\n注意：g 是实测连续闭合度，与二元夹爪命令不同。\n接触会改变连杆状态；几何表不能用作抓取成功判断。`,
camera:`相机轴：+X 向图像右，+Y 向上，−Z 向前（OpenGL）\n外参：p_parent = t + R(q) × p_camera\nt 单位：m；q 顺序：wxyz，旋转前先单位化\n\n${d.tabs[2].facts.cameras.map(c=>`${c.name}\n  parent: ${c.parent}\n  t: [${c.t.join(', ')}]\n  q: [${c.q_wxyz.join(', ')}]\n  fx/fy（归一化）: ${c.fx_normalized} / ${c.fy_normalized}`).join('\n\n')}\n\n主点（归一化）：[0.5, 0.5]\nu = 0.5 + fx × X / (−Z)\nv = 0.5 − fy × Y / (−Z)，且 Z < 0\n\n腕部相机随法兰移动，历史帧要使用当时的机器人姿态。\n内参适用于单张完整图像，不能直接套用三视角拼图。\n一个像素只确定射线，不能单独确定深度。`
};return figure(14,'Prompt anatomy：三个可组合的信息片段',tabs('rf-prompt-inspector',d.tabs.map(t=>({label:t.label,html:`<p class="rf-prompt-summary">${t.summary_zh}</p><pre class="rf-prompt-code" tabindex="0">${esc(text[t.id])}</pre>`}))),`参考 <a href="${d.inspector_source_url}">Astranomy 的 Prompt Anatomy</a>，保留 Base / Gripper geometry / Camera geometry 三个页签与等宽文本查看方式。内容为中文释义及原报告参数；两个 geometry 片段附加在 Base 之上，完整配置组合三者。参数特定于该实验，不是通用机器人标定值。`);}

export function renderFigure(index){switch(Number(index)){
case 1:return policyFigure();case 2:return physicalFigure();case 3:return genFigure();case 4:return iclFigure();case 5:return budgetFigure();
case 6:return '';case 7:return tactileFigure();case 8:return dexterityFigure();case 9:return robocasaFigure();case 10:return wamFigure();
case 11:return ablationFigure(11,'action','Action representation：EEF 与 Joint');case 12:return verifiedHistoryFigure();case 13:return ablationFigure(13,'history','History：短期观测与长期交互记忆');case 14:return verifiedPromptFigure();case 15:return ablationFigure(15,'prompt','Prompt：本体与相机信息如何影响控制');case 16:return timelineFigure();
default:throw new Error(`Unknown report figure ${index}`);
}}

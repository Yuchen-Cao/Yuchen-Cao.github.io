/* Framework-free, progressive enhancement for research figures. */
document.querySelectorAll('[data-rf-tabs]').forEach(root => {
  const controls = root.querySelector(':scope > .rf-controls');
  const buttons = [...controls.querySelectorAll('[data-rf-tab]')];
  const panels = [...root.querySelectorAll(':scope > [data-rf-panel]')];
  const activate = button => {
    buttons.forEach(b => { b.setAttribute('aria-selected', String(b === button)); b.tabIndex = b === button ? 0 : -1; });
    panels.forEach(panel => { panel.hidden = panel.id !== button.dataset.rfTab; });
  };
  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-rf-tab]');
    if (button) activate(button);
  });
  controls.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); activate(buttons[next]);
  });
  activate(buttons[0]); root.classList.add('rf-enhanced');
});

document.querySelectorAll('[data-rf-chart]').forEach(chart => {
  const filter = chart.querySelector('[data-rf-filter]');
  const detail = chart.querySelector('[data-rf-detail]');
  const initial = detail.textContent;
  const applyFilter = () => {
    chart.querySelectorAll('[data-rf-row]').forEach(row => { row.hidden = filter.value !== 'all' && row.dataset.rfGroup !== filter.value; });
    detail.textContent = filter.value === 'all' ? '显示全部分组。' : `当前分组：${filter.value}`;
  };
  if (filter) { filter.addEventListener('change', applyFilter); applyFilter(); }
  chart.querySelectorAll('[data-rf-value]').forEach(bar => {
    const reveal = () => { detail.textContent = bar.dataset.rfValue; };
    bar.addEventListener('pointerenter', reveal);
    bar.addEventListener('focus', reveal);
    bar.addEventListener('pointerleave', () => { if (!chart.contains(document.activeElement)) detail.textContent = initial; });
  });
});

document.querySelectorAll('[data-rf-time]').forEach(root => {
  const slider = root.querySelector('[data-rf-time-range]');
  const cursor = root.querySelector('[data-rf-time-cursor]');
  const status = root.querySelector('[data-rf-time-status]');
  const position = root.querySelector('[data-rf-time-position]');
  let mode = 'simulation';
  const patterns = {
    simulation: { obs: [[0,6,'O₁'],[48,6,'O₂'],[94,6,'O₃']], reason: [[7,28,'推理 R₁'],[55,28,'推理 R₂']], action: [[36,11,'A₁'],[84,10,'A₂']], world: [[0,36,'冻结'],[36,11,'推进',true],[47,37,'冻结'],[84,10,'推进',true],[94,6,'冻结']] },
    sync: { obs: [[0,6,'O₁'],[48,6,'O₂'],[94,6,'O₃']], reason: [[7,28,'推理 R₁'],[55,28,'推理 R₂']], action: [[36,11,'A₁'],[84,10,'A₂']], world: [[0,100,'真实世界持续演化 →',true]] },
    async: { obs: Array.from({length:10},(_,i)=>[i*10,5,'O']), reason: [[7,28,'推理 R₁'],[45,28,'推理 R₂'],[80,20,'推理 R₃']], action: [[0,35,'执行已有策略'],[36,37,'采用新决策'],[74,26,'持续控制']], world: [[0,100,'真实世界持续演化 →',true]] },
  };
  const update = () => {
    const t = Number(slider.value);
    cursor.style.setProperty('--rf-progress', t / 100);
    position.textContent = `${t} / 100`;
    if (mode === 'simulation') {
      const isActing = patterns.simulation.action.some(([start,width]) => t >= start && t < start+width);
      status.textContent = isActing ? '暂停仿真：正在执行动作，环境的物理时间向前推进。' : '暂停仿真：环境的物理时间被冻结，模型可以读取观测并完成推理。';
    } else if (mode === 'sync') {
      const isThinking = patterns.sync.reason.some(([start,width]) => t >= start && t <= start+width);
      const isActing = patterns.sync.action.some(([start,width]) => t >= start && t <= start+width);
      status.textContent = isThinking ? '同步回合：模型正在推理，下一段动作仍在等待。真实世界继续演化。' : isActing ? '同步回合：执行当前动作段；下一轮观测在本段执行后进入。' : '同步回合：采集新观测，随后开始下一轮推理。';
    } else {
      const reason = patterns.async.reason.find(([start,width])=>t>=start&&t<=start+width);
      status.textContent = reason ? '异步交互：后台推理与底层控制同时进行；新观测持续到来，已完成的决策按时生效。' : '异步交互：控制持续运行，下一次推理读取最新可用观测。';
    }
  };
  const draw = () => {
    Object.entries(patterns[mode]).forEach(([lane,blocks]) => {
      const container = root.querySelector(`[data-rf-lane="${lane}"]`);
      container.replaceChildren(...blocks.map(([left,width,text,active]) => { const el = document.createElement('i'); el.style.left=`${left}%`; el.style.width=`${width}%`; el.textContent=text; if(active) el.classList.add('rf-world-active'); return el; }));
    });
    update();
  };
  root.querySelectorAll('[data-rf-time-mode]').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.rfTimeMode;
    root.querySelectorAll('[data-rf-time-mode]').forEach(b => b.setAttribute('aria-pressed',String(b===button)));
    draw();
  }));
  slider.addEventListener('input',update);
  draw();
});

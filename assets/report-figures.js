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
    const vertical = controls.getAttribute('aria-orientation') === 'vertical';
    const previousKey = vertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    if (![previousKey, nextKey, 'Home', 'End'].includes(event.key)) return;
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === nextKey ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); activate(buttons[next]);
  });
  activate(buttons.find(button => button.getAttribute('aria-selected') === 'true') || buttons[0]); root.classList.add('rf-enhanced');
});

document.querySelectorAll('[data-rf-chart]').forEach(chart => {
  const filter = chart.querySelector('[data-rf-filter]');
  const detail = chart.querySelector('[data-rf-detail]');
  const initial = detail.textContent;
  const setDetail = text => { detail.textContent = text; detail.hidden = !text; };
  setDetail(initial);
  const applyFilter = () => {
    chart.querySelectorAll('[data-rf-row]').forEach(row => { row.hidden = filter.value !== 'all' && row.dataset.rfGroup !== filter.value; });
    setDetail(initial);
  };
  if (filter) { filter.addEventListener('change', applyFilter); applyFilter(); }
  chart.querySelectorAll('[data-rf-value]').forEach(bar => {
    const reveal = () => { setDetail(bar.dataset.rfValue); };
    bar.addEventListener('pointerenter', reveal);
    bar.addEventListener('focus', reveal);
    bar.addEventListener('blur', () => { setDetail(initial); });
    bar.addEventListener('pointerleave', () => { if (!chart.contains(document.activeElement)) setDetail(initial); });
  });
});

document.querySelectorAll('[data-rf-time]').forEach(root => {
  const slider = root.querySelector('[data-rf-time-range]');
  const cursor = root.querySelector('[data-rf-time-cursor]');
  const status = root.querySelector('[data-rf-time-status]');
  const position = root.querySelector('[data-rf-time-position]');
  let mode = 'simulation';
  const patterns = {
    simulation: { obs: [[0,6,'O₁'],[48,6,'O₂'],[94,6,'O₃']], reason: [[7,28,'R₁'],[55,28,'R₂']], action: [[36,11,'A₁'],[84,10,'A₂']], world: [[0,36,'Paused'],[36,11,'Runs',true],[47,37,'Paused'],[84,10,'Runs',true],[94,6,'Paused']] },
    sync: { obs: [[0,6,'O₁'],[48,6,'O₂'],[94,6,'O₃']], reason: [[7,28,'R₁'],[55,28,'R₂']], action: [[36,11,'A₁'],[84,10,'A₂']], world: [[0,100,'The world keeps moving →',true]] },
    async: { obs: Array.from({length:10},(_,i)=>[i*10,5,'O']), reason: [[7,28,'R₁'],[45,28,'R₂'],[80,20,'R₃']], action: [[0,35,'Current policy'],[36,37,'Updated policy'],[74,26,'Control']], world: [[0,100,'The world keeps moving →',true]] },
  };
  const update = () => {
    const t = Number(slider.value);
    cursor.style.setProperty('--rf-progress', t / 100);
    position.textContent = `${t} / 100`;
    if (mode === 'simulation') {
      const isActing = patterns.simulation.action.some(([start,width]) => t >= start && t < start+width);
      status.textContent = isActing ? 'Paused simulation: an action is executing, and physical time advances.' : 'Paused simulation: physical time is paused while the model observes and reasons.';
    } else if (mode === 'sync') {
      const isThinking = patterns.sync.reason.some(([start,width]) => t >= start && t <= start+width);
      const isActing = patterns.sync.action.some(([start,width]) => t >= start && t <= start+width);
      status.textContent = isThinking ? 'Synchronous robot: the model is reasoning; the next action waits while the world keeps moving.' : isActing ? 'Synchronous robot: the current action executes; a new observation follows.' : 'Synchronous robot: collect a new observation, then begin the next reasoning step.';
    } else {
      const reason = patterns.async.reason.find(([start,width])=>t>=start&&t<=start+width);
      status.textContent = reason ? 'Asynchronous robot: reasoning and control run together; observations keep arriving and completed decisions take effect.' : 'Asynchronous robot: control continues while the next reasoning step reads the latest observation.';
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

/* Compact external controls keep the unusually wide clips unobscured. */
(() => {
  function enhance(root) {
    if (root.dataset.rvcReady) return;
    root.dataset.rvcReady = 'true';
    const tabs = [...root.querySelectorAll('[data-rvc-tab]')];
    const panels = [...root.querySelectorAll('[data-rvc-panel]')];
    const videos = [...root.querySelectorAll('video[data-src]')];
    const toggle = root.querySelector('[data-rvc-toggle]');
    const restart = root.querySelector('[data-rvc-restart]');
    const status = root.querySelector('[data-rvc-status]');
    const positions = new WeakMap();
    const pendingSeeks = new WeakMap();
    const controls = new WeakMap();
    let activePanel = null;
    let action = 0;
    let pendingPlay = false;
    const activeVideos = () => activePanel ? [...activePanel.querySelectorAll('video[data-src]')] : [];
    const message = text => { status.textContent = text; status.hidden = !text; };
    const formatTime = value => Number.isFinite(value) && value >= 0 ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '–:––';
    function updateVideo(video) {
      const ui = controls.get(video);
      if (!ui) return;
      const duration = Number.isFinite(video.duration) ? video.duration : Number(video.dataset.duration) || 0;
      const time = pendingSeeks.get(video) ?? (video.hasAttribute('src') ? video.currentTime : positions.get(video)?.time) ?? 0;
      ui.seek.max = duration || 100;
      ui.seek.disabled = !duration;
      ui.seek.value = Math.min(time, duration || time);
      ui.time.textContent = `${formatTime(time)} / ${duration ? formatTime(duration) : '–:––'}`;
      const label = video.ended ? 'Replay' : video.paused ? 'Play' : 'Pause';
      ui.play.textContent = label;
      ui.play.setAttribute('aria-label', `${label} ${ui.strategy} video`);
    }
    const update = () => { toggle.textContent = pendingPlay || activeVideos().some(video => !video.paused && !video.ended) ? 'Pause all' : 'Play all'; };
    function remember(video) {
      if (!video.hasAttribute('src')) return;
      positions.set(video, { time: pendingSeeks.get(video) ?? (Number.isFinite(video.currentTime) ? video.currentTime : 0), duration: Number.isFinite(video.duration) ? video.duration : Number(video.dataset.duration) || 0 });
    }
    function seek(video, time) {
      positions.set(video, { time, duration: Number.isFinite(video.duration) ? video.duration : Number(video.dataset.duration) || 0 });
      if (video.readyState >= 1) {
        try { video.currentTime = time; pendingSeeks.delete(video); } catch { pendingSeeks.set(video, time); }
      } else pendingSeeks.set(video, time);
      updateVideo(video);
    }
    function prepare(video) {
      if (!video.hasAttribute('src')) {
        pendingSeeks.set(video, positions.get(video)?.time || 0);
        video.src = video.dataset.src;
      }
    }
    function pauseAll() {
      action += 1;
      pendingPlay = false;
      activeVideos().forEach(video => { video.pause(); remember(video); });
      update();
    }
    async function playAll() {
      const token = ++action;
      const current = activeVideos();
      pendingPlay = true;
      message('');
      update();
      const results = await Promise.allSettled(current.map(video => {
        const saved = positions.get(video);
        if (video.ended || (saved?.duration > 0 && saved.time >= saved.duration - .05)) seek(video, 0);
        prepare(video);
        return video.play();
      }));
      if (token !== action) return;
      pendingPlay = false;
      const failed = results.filter(result => result.status === 'rejected' && result.reason?.name !== 'AbortError');
      if (failed.length) message('Some videos could not start.');
      update();
    }
    function select(index, focus = false) {
      if (!panels[index]) return;
      const next = panels[index];
      if (next !== activePanel) {
        pauseAll();
        activeVideos().forEach(video => {
          remember(video);
          video.preload = 'none';
          video.removeAttribute('src');
          video.load();
        });
        activePanel = next;
        panels.forEach(panel => { panel.hidden = panel !== next; });
        tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
        activeVideos().forEach(prepare);
        activeVideos().forEach(updateVideo);
        message('');
        update();
      }
      if (focus) tabs[index].focus({ preventScroll: true });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next == null) return;
        event.preventDefault();
        select(next, true);
        tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      });
    });
    for (const video of videos) {
      const card = video.closest('[data-rvc-card]');
      const error = card.querySelector('[data-rvc-error]');
      const playback = card.querySelector('[data-rvc-playback]');
      const ui = { play: card.querySelector('[data-rvc-play]'), seek: card.querySelector('[data-rvc-seek]'), time: card.querySelector('[data-rvc-time]'), strategy: card.querySelector('h5').textContent };
      controls.set(video, ui);
      playback.hidden = false;
      video.controls = false;
      ui.play.addEventListener('click', () => {
        if (!activePanel?.contains(video)) return;
        if (!video.paused && !video.ended) video.pause();
        else {
          const saved = positions.get(video);
          if (video.ended || (saved?.duration > 0 && saved.time >= saved.duration - .05)) seek(video, 0);
          prepare(video);
          message('');
          video.play().catch(error => { if (error.name !== 'AbortError' && activePanel?.contains(video)) message('This video could not start.'); });
        }
      });
      ui.seek.addEventListener('input', () => {
        if (!activePanel?.contains(video)) return;
        prepare(video);
        seek(video, Number(ui.seek.value));
        // Seeking is an explicit request for a frame, even before first play.
        // Change the preload mode once so subsequent slider input does not
        // restart the pending metadata request.
        if (video.readyState === 0 && video.preload === 'none') {
          video.preload = 'metadata';
          video.load();
        }
      });
      video.addEventListener('loadedmetadata', () => {
        const time = pendingSeeks.get(video);
        if (time != null) {
          try { video.currentTime = Math.min(time, Number.isFinite(video.duration) ? video.duration : time); } catch { /* Native controls remain available. */ }
          pendingSeeks.delete(video);
        }
        error.hidden = true;
        updateVideo(video);
      });
      video.addEventListener('error', () => {
        if (video.hasAttribute('src') && video.error?.code !== 1) error.hidden = false;
        update();
      });
      ['play', 'pause', 'ended'].forEach(type => video.addEventListener(type, () => {
        if (type === 'play' && !activePanel?.contains(video)) video.pause();
        remember(video);
        updateVideo(video);
        update();
      }));
      ['timeupdate', 'durationchange', 'seeking', 'seeked'].forEach(type => video.addEventListener(type, () => updateVideo(video)));
      card.querySelector('[data-rvc-retry]').addEventListener('click', () => {
        if (!activePanel?.contains(video)) return;
        error.hidden = true;
        prepare(video);
        video.load();
      });
      card.querySelectorAll('[data-rvc-open]').forEach(button => button.addEventListener('click', () => {
        window.open(video.dataset.src, '_blank', 'noopener');
      }));
      updateVideo(video);
    }
    toggle.addEventListener('click', () => {
      if (pendingPlay || activeVideos().some(video => !video.paused && !video.ended)) pauseAll();
      else void playAll();
    });
    restart.addEventListener('click', () => {
      const wasPlaying = pendingPlay || activeVideos().some(video => !video.paused && !video.ended);
      pauseAll();
      activeVideos().forEach(video => seek(video, 0));
      message('');
      if (wasPlaying) void playAll();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });
    window.addEventListener('pagehide', pauseAll);
    select(Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true')));
  }
  const init = () => document.querySelectorAll('[data-rvc]').forEach(enhance);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

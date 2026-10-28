const root = document.documentElement;
const toggle = document.querySelector('[data-theme-toggle]');
const english = root.lang === 'en';

function updateToggleLabel() {
  if (!toggle) return;
  const dark = root.dataset.theme === 'dark';
  const label = english ? (dark ? 'Use light theme' : 'Use dark theme') : (dark ? '切换浅色主题' : '切换深色主题');
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('title', label);
  toggle.textContent = dark ? '☀' : '◐';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--paper').trim());
}

toggle?.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch { /* Theme still works when storage is unavailable. */ }
  updateToggleLabel();
});
updateToggleLabel();

const filters = document.querySelectorAll('[data-filter]');
const cards = document.querySelectorAll('[data-post-card]');
function applyFilter(selected) {
  const active = [...filters].find((item) => item.dataset.filter === selected) || filters[0];
  if (!active) return;
  filters.forEach((item) => item.setAttribute('aria-pressed', String(item === active)));
  cards.forEach((card) => {
    card.hidden = active.dataset.filter !== 'all' && !card.dataset.tags.split('|').includes(active.dataset.filter);
  });
}

function updateLanguageLinks() {
  const filter = new URLSearchParams(location.search).get('filter');
  document.querySelectorAll('[data-site-language]').forEach((link) => {
    const destination = new URL(link.href);
    if (filter && filters.length) destination.searchParams.set('filter', filter);
    else destination.searchParams.delete('filter');
    // Report sections share stable IDs across translations.
    if (document.querySelector('.report') && /^#(?:section-[\d.]+|figure-\d+|takeaways|references|cite-this-article)$/.test(location.hash)) destination.hash = location.hash;
    else destination.hash = '';
    link.href = destination.href;
  });
}

filters.forEach((button) => button.addEventListener('click', () => {
  applyFilter(button.dataset.filter);
  const url = new URL(location.href);
  if (button.dataset.filter === 'all') url.searchParams.delete('filter');
  else url.searchParams.set('filter', button.dataset.filter);
  history.replaceState(null, '', url);
  updateLanguageLinks();
}));
window.addEventListener('popstate', () => {
  applyFilter(new URLSearchParams(location.search).get('filter') || 'all');
  updateLanguageLinks();
});
window.addEventListener('hashchange', updateLanguageLinks);
applyFilter(new URLSearchParams(location.search).get('filter') || 'all');
updateLanguageLinks();

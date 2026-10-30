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

const contact = document.querySelector('[data-contact]');
if (contact) {
  const trigger = contact.querySelector('summary');
  const status = contact.querySelector('[data-contact-status]');
  let feedbackTimer;
  const closeContact = (restoreFocus = false) => {
    contact.open = false;
    if (restoreFocus) trigger.focus();
  };
  contact.querySelectorAll('button[hidden]').forEach((button) => { button.hidden = false; });
  contact.querySelector('[data-contact-close]').addEventListener('click', () => closeContact(true));
  contact.addEventListener('toggle', () => {
    clearTimeout(feedbackTimer);
    status.textContent = '';
  });
  document.addEventListener('pointerdown', (event) => {
    if (contact.open && !contact.contains(event.target)) closeContact();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && contact.open) {
      event.preventDefault();
      closeContact(true);
    }
  });
  contact.addEventListener('focusout', (event) => {
    // Safari may leave focus on the body when a button is clicked.
    if (contact.open && event.relatedTarget && !contact.contains(event.relatedTarget)) closeContact();
  });
  async function copyContact(value) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch { /* Older browsers and local file previews can use the selection fallback. */ }
    const previousFocus = document.activeElement;
    const input = document.createElement('textarea');
    input.value = value;
    input.readOnly = true;
    input.tabIndex = -1;
    input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;font-size:16px';
    contact.append(input);
    try {
      input.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      input.remove();
      previousFocus?.focus({ preventScroll: true });
    }
  }
  contact.querySelectorAll('[data-contact-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      clearTimeout(feedbackTimer);
      try {
        await copyContact(button.dataset.contactCopy);
        status.textContent = button.dataset.contactKind === 'wechat'
          ? (english ? 'WeChat ID copied. Find me in WeChat.' : '微信号已复制，可前往微信添加。')
          : (english ? 'Email address copied.' : '邮箱地址已复制。');
      } catch {
        status.textContent = english ? 'Please select and copy the contact text above.' : '请选中上方联系方式，手动复制。';
      }
      feedbackTimer = setTimeout(() => { status.textContent = ''; }, 4500);
    });
  });
}

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

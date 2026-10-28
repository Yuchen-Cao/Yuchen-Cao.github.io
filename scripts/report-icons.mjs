/* Original, code-native illustrations for the report's compact diagrams. */
const drawings = {
  robot: '<path d="M24 6v5m-3-5h6"/><rect x="9" y="12" width="30" height="25" rx="10" fill="var(--rc-icon-fill, transparent)"/><path d="M9 23H6v7h3m30-7h3v7h-3M16 38v4m16-4v4"/><circle cx="18" cy="23" r="2" fill="currentColor" stroke="none"/><circle cx="30" cy="23" r="2" fill="currentColor" stroke="none"/><path d="M20 30q4 4 8 0"/>',
  arm: '<path d="M10 41h29M15 40v-7h14v7"/><path d="m20 33-8-13 7-5 11 13-5 5" fill="var(--rc-icon-fill, transparent)"/><circle cx="15" cy="18" r="5"/><path d="m19 15 12-9 6 6-13 12M35 14l4 3m-1-1 5-2m-4 3 2 5"/><circle cx="22" cy="32" r="4" fill="var(--rc-icon-fill, transparent)"/>',
  hand: '<path d="M12 26V15a3 3 0 0 1 6 0v7V9a3 3 0 0 1 6 0v13V12a3 3 0 0 1 6 0v12-8a3 3 0 0 1 6 0v15c0 8-5 12-12 12-5 0-8-3-11-7l-6-8a3 3 0 0 1 5-4l5 5" fill="var(--rc-icon-fill, transparent)"/><path d="M22 33q3 2 6 0"/>',
  mobile: '<rect x="8" y="23" width="32" height="15" rx="7" fill="var(--rc-icon-fill, transparent)"/><circle cx="15" cy="38" r="4"/><circle cx="33" cy="38" r="4"/><path d="M24 23V12m-8 0h16"/><rect x="15" y="6" width="18" height="13" rx="5"/><path d="M20 12h1m6 0h1M19 30h10"/>',
  navigation: '<circle cx="24" cy="24" r="18" fill="var(--rc-icon-fill, transparent)"/><path d="m31 15-4 13-12 5 5-13 11-5Z"/><path d="m20 20 7 8M24 3v4m0 34v4M3 24h4m34 0h4"/><circle cx="24" cy="24" r="2" fill="currentColor" stroke="none"/>',
  humanoid: '<rect x="16" y="5" width="16" height="14" rx="6" fill="var(--rc-icon-fill, transparent)"/><path d="M21 11h1m5 0h1M20 23h8l3 11H17l3-11Zm-1 1-8 10m18-10 8 10M21 34l-3 9m9-9 3 9"/>',
  package: '<path d="m7 14 17-8 17 8v22l-17 8-17-8V14Z" fill="var(--rc-icon-fill, transparent)"/><path d="m7 14 17 8 17-8M24 22v22M16 10l17 8v8"/><path d="m13 29 5 2"/>',
  eye: '<path d="M4 24S12 12 24 12s20 12 20 12-8 12-20 12S4 24 4 24Z" fill="var(--rc-icon-fill, transparent)"/><circle cx="24" cy="24" r="7"/><circle cx="26" cy="22" r="2" fill="currentColor" stroke="none"/>',
  state: '<path d="M10 8v32M24 8v32M38 8v32"/><rect x="6" y="15" width="8" height="8" rx="3" fill="var(--rc-icon-fill, transparent)"/><rect x="20" y="27" width="8" height="8" rx="3" fill="var(--rc-icon-fill, transparent)"/><rect x="34" y="11" width="8" height="8" rx="3" fill="var(--rc-icon-fill, transparent)"/>',
  history: '<path d="M9 13A17 17 0 1 1 7 30M9 6v9H1"/><path d="M24 13v12l8 5"/><circle cx="24" cy="25" r="2" fill="currentColor" stroke="none"/>',
  text: '<rect x="8" y="6" width="32" height="36" rx="7" fill="var(--rc-icon-fill, transparent)"/><path d="M15 16h18M15 24h18M15 32h11"/>',
  camera: '<path d="m15 13 4-6h10l4 6h5a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V18a5 5 0 0 1 5-5h5Z" fill="var(--rc-icon-fill, transparent)"/><circle cx="24" cy="27" r="8"/><path d="M35 19h2"/>',
  motion: '<path d="M6 33c7 0 8-19 16-19s8 19 16 19h4m-7-7 7 7-7 7"/><path d="M6 22h4M3 28h4"/><circle cx="22" cy="14" r="4" fill="var(--rc-icon-fill, transparent)"/>',
  code: '<rect x="4" y="7" width="40" height="34" rx="7" fill="var(--rc-icon-fill, transparent)"/><path d="M4 15h40M10 11h1m5 0h1m0 10-6 7 6 7m14-14 6 7-6 7m-5-15-4 16"/>',
  check: '<path d="M36 9A18 18 0 1 0 42 24"/><path d="m15 23 8 8L42 10"/>',
  book: '<path d="M24 11c-6-5-13-5-20-3v29c7-2 14-2 20 3 6-5 13-5 20-3V8c-7-2-14-2-20 3Z" fill="var(--rc-icon-fill, transparent)"/><path d="M24 11v29M10 17l7 1m-7 7 7 1m14-8 7-1m-7 9 7-1"/>',
  brain: '<path d="M24 10C21 2 10 6 11 14 3 15 3 26 9 28c-3 9 7 16 15 10 8 6 18-1 15-10 6-2 6-13-2-14C38 6 27 2 24 10Z" fill="var(--rc-icon-fill, transparent)"/><path d="M24 10v28M12 15q8-1 8 6M9 28q8-3 10 3m18-16q-8-1-8 6m10 7q-8-3-10 3"/>',
};

export function reportIcon(kind = 'robot') {
  const key = Object.hasOwn(drawings, kind) ? kind : 'robot';
  return `<svg class="rc-icon rc-icon-${key}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawings[key]}</svg>`;
}

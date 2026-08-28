const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const savedTheme = localStorage.getItem("theme");
const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (savedTheme) root.dataset.theme = savedTheme;
else if (preferredDark) root.dataset.theme = "dark";

function updateToggleLabel() {
  if (!toggle) return;
  const dark = root.dataset.theme === "dark";
  toggle.setAttribute("aria-label", dark ? "Use light theme" : "Use dark theme");
  toggle.setAttribute("title", dark ? "Use light theme" : "Use dark theme");
  toggle.textContent = dark ? "☀" : "◐";
}

toggle?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  updateToggleLabel();
});

updateToggleLabel();

const filters = document.querySelectorAll("[data-filter]");
const cards = document.querySelectorAll("[data-post-card]");

function applyFilter(selected) {
  const active = [...filters].find((item) => item.dataset.filter === selected) || [...filters][0];
  if (!active) return;
  filters.forEach((item) => item.setAttribute("aria-pressed", String(item === active)));
  cards.forEach((card) => {
    const matchesLanguage = card.dataset.language === active.dataset.filter;
    const matchesTopic = card.dataset.tags.split("|").includes(active.dataset.filter);
    card.hidden = active.dataset.filter !== "all" && !matchesLanguage && !matchesTopic;
  });
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    applyFilter(button.dataset.filter);
    const url = new URL(window.location);
    if (button.dataset.filter === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", button.dataset.filter);
    history.replaceState(null, "", url);
  });
});

applyFilter(new URLSearchParams(window.location.search).get("filter") || "all");

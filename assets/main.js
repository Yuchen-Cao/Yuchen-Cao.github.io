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
const languageChoices = document.querySelectorAll("[data-language-choice]");
const translationGroups = document.querySelectorAll("[data-post-card], [data-featured]");

function applyReadingLanguage(language) {
  languageChoices.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.languageChoice === language)));
  translationGroups.forEach((group) => {
    const variants = [...group.querySelectorAll("[data-card-translation]")];
    const active = variants.find((variant) => variant.dataset.language === language) || variants[0];
    variants.forEach((variant) => { variant.hidden = variant !== active; });
  });
  document.documentElement.dataset.readingLanguage = language;
}

function applyFilter(selected) {
  const active = [...filters].find((item) => item.dataset.filter === selected) || [...filters][0];
  if (!active) return;
  filters.forEach((item) => item.setAttribute("aria-pressed", String(item === active)));
  cards.forEach((card) => {
    const matchesTopic = card.dataset.tags.split("|").includes(active.dataset.filter);
    card.hidden = active.dataset.filter !== "all" && !matchesTopic;
  });
}

languageChoices.forEach((button) => {
  button.addEventListener("click", () => {
    localStorage.setItem("reading-language", button.dataset.languageChoice);
    applyReadingLanguage(button.dataset.languageChoice);
  });
});

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
applyReadingLanguage(localStorage.getItem("reading-language") || (navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en"));

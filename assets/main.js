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
  toggle.textContent = dark ? "Light" : "Dark";
}

toggle?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  updateToggleLabel();
});

updateToggleLabel();

const filters = document.querySelectorAll("[data-filter]");
const cards = document.querySelectorAll("[data-post-card]");

filters.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = button.dataset.filter;
    filters.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    cards.forEach((card) => {
      card.hidden = selected !== "all" && !card.dataset.tags.split("|").includes(selected);
    });
  });
});


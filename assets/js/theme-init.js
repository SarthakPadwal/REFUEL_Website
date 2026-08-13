(function () {
  const storageKey = "refuel-theme";
  const root = document.documentElement;
  const storedTheme = window.localStorage.getItem(storageKey);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme || (prefersDark ? "dark" : "light");

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
})();

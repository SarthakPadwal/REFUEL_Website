(function () {
  const currentPath = normalizePath(window.location.pathname);
  const navs = Array.from(document.querySelectorAll("[data-site-nav]"));
  const transition = ensureTransitionLayer();
  const FAST_NAV_DELAY = 45;
  const root = document.documentElement;
  const themeToggles = Array.from(document.querySelectorAll("[data-theme-toggle]"));
  const themeStorageKey = "refuel-theme";

  window.addEventListener("pageshow", function () {
    requestAnimationFrame(function () {
      document.body.classList.add("is-ready");
      transition.classList.remove("is-active");
    });
  });

  requestAnimationFrame(function () {
    document.body.classList.add("is-ready");
  });

  navs.forEach(setupNav);
  setupThemeToggle();
  setupPageTransitions();
  setupPrefetch();

  function setupNav(nav) {
    const desktopMenu = nav.querySelector("[data-nav-menu]");
    const desktopLinks = Array.from(nav.querySelectorAll("[data-nav-link]"));
    const mobileLinks = Array.from(nav.querySelectorAll("[data-mobile-link]"));
    const underline = nav.querySelector("[data-nav-underline]");
    const toggle = nav.querySelector("[data-nav-toggle]");
    const drawer = nav.querySelector("[data-nav-drawer]");

    const activeDesktopLink = desktopLinks.find(isCurrentLink);
    const activeMobileLink = mobileLinks.find(isCurrentLink);

    desktopLinks.forEach(function (link) {
      link.removeAttribute("aria-current");
      if (isCurrentLink(link)) {
        link.setAttribute("aria-current", "page");
      }
    });

    mobileLinks.forEach(function (link) {
      link.removeAttribute("aria-current");
      if (isCurrentLink(link)) {
        link.setAttribute("aria-current", "page");
      }
    });

    if (desktopMenu && underline && activeDesktopLink) {
      moveUnderline(desktopMenu, underline, activeDesktopLink);
      desktopMenu.classList.add("has-active");
      window.addEventListener("resize", function () {
        moveUnderline(desktopMenu, underline, activeDesktopLink);
      });
    }

    if (toggle && drawer) {
      toggle.addEventListener("click", function () {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        drawer.classList.toggle("is-open", !expanded);
      });

      mobileLinks.forEach(function (link) {
        link.addEventListener("click", function () {
          toggle.setAttribute("aria-expanded", "false");
          drawer.classList.remove("is-open");
        });
      });

      document.addEventListener("click", function (event) {
        if (!nav.contains(event.target)) {
          toggle.setAttribute("aria-expanded", "false");
          drawer.classList.remove("is-open");
        }
      });
    }

    if (!activeDesktopLink && desktopMenu) {
      desktopMenu.classList.remove("has-active");
    }

    if (activeMobileLink) {
      activeMobileLink.setAttribute("aria-current", "page");
    }
  }

  function setupPageTransitions() {
    const links = Array.from(document.querySelectorAll("a[href]"));
    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (!shouldTransition(link, event)) {
          return;
        }

        event.preventDefault();
        const targetUrl = link.href;
        document.body.classList.add("is-leaving");
        transition.classList.add("is-active");

        if (typeof window.startViewTransition === "function") {
          window.startViewTransition(function () {
            window.location.href = targetUrl;
            return Promise.resolve();
          });
          return;
        }

        window.setTimeout(function () {
          window.location.href = targetUrl;
        }, FAST_NAV_DELAY);
      });
    });
  }

  function setupThemeToggle() {
    if (!themeToggles.length) {
      return;
    }

    syncThemeControls(getTheme());

    themeToggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        const nextTheme = getTheme() === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
      });
    });
  }

  function setupPrefetch() {
    const seen = new Set();
    document.querySelectorAll("a[href]").forEach(function (link) {
      if (!isPrefetchable(link)) {
        return;
      }

      const prime = function () {
        const href = link.href;
        if (seen.has(href)) {
          return;
        }

        seen.add(href);
        const prefetch = document.createElement("link");
        prefetch.rel = "prefetch";
        prefetch.href = href;
        document.head.appendChild(prefetch);
      };

      link.addEventListener("pointerenter", prime, { once: true });
      link.addEventListener("touchstart", prime, { once: true });
      link.addEventListener("focus", prime, { once: true });
    });
  }

  function moveUnderline(menu, underline, link) {
    const menuRect = menu.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    underline.style.width = linkRect.width + "px";
    underline.style.transform = "translateX(" + (linkRect.left - menuRect.left) + "px)";
  }

  function isCurrentLink(link) {
    const url = new URL(link.href, window.location.href);
    const samePath = normalizePath(url.pathname) === currentPath;
    const targetHash = url.hash || "";
    const currentHash = window.location.hash || "";

    if (!samePath) {
      return false;
    }

    if (targetHash) {
      return targetHash === currentHash;
    }

    return !currentHash || currentHash === "#";
  }

  function shouldTransition(link, event) {
    if (event.defaultPrevented) {
      return false;
    }

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }

    if (link.target && link.target !== "_self") {
      return false;
    }

    if (link.hasAttribute("download")) {
      return false;
    }

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return false;
    }

    if (normalizePath(url.pathname) === currentPath && url.hash === window.location.hash) {
      return false;
    }

    return true;
  }

  function isPrefetchable(link) {
    const url = new URL(link.href, window.location.href);
    return url.origin === window.location.origin && normalizePath(url.pathname) !== currentPath;
  }

  function ensureTransitionLayer() {
    let layer = document.querySelector(".site-transition");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "site-transition";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function getTheme() {
    return root.classList.contains("dark") ? "dark" : "light";
  }

  function applyTheme(theme) {
    const switchingClass = "theme-switching";

    document.body.classList.add(switchingClass);
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
    syncThemeControls(theme);
    document.body.offsetHeight;
    requestAnimationFrame(function () {
      document.body.classList.remove(switchingClass);
    });
  }

  function syncThemeControls(theme) {
    const isDark = theme === "dark";

    themeToggles.forEach(function (toggle) {
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");

      const icon = toggle.querySelector("[data-theme-icon]");
      const label = toggle.querySelector("[data-theme-label]");

      if (icon) {
        icon.textContent = isDark ? "light_mode" : "dark_mode";
      }

      if (label) {
        label.textContent = isDark ? "Light Mode" : "Dark Mode";
      }
    });
  }

  function normalizePath(pathname) {
    const normalized = pathname.split("/").pop() || "main.html";
    return normalized.toLowerCase() || "main.html";
  }
})();

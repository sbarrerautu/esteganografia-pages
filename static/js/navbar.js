(function () {
  "use strict";

  const pageKey = document.body.dataset.navKey || "";
  const levelLinks = Array.from(document.querySelectorAll(".nav-level"));
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));

  function setActive(currentLevel) {
    navLinks.forEach(function (link) {
      link.classList.remove("active");
    });

    if (pageKey === "game") {
      const params = new URLSearchParams(window.location.search);
      const requested = Number(params.get("level") || 0);
      const target = requested >= 1 && requested <= 5 ? requested : currentLevel;
      const activeLevel = document.querySelector('.nav-level[data-level="' + target + '"]');
      if (activeLevel) activeLevel.classList.add("active");
      return;
    }

    const active = document.querySelector('.nav-link[data-nav-key="' + pageKey + '"]');
    if (active) active.classList.add("active");
  }

  function lockBySession(currentLevel) {
    levelLinks.forEach(function (link) {
      const level = Number(link.dataset.level || 0);
      link.classList.remove("locked", "completed");
      if (level > currentLevel) {
        link.classList.add("locked");
        link.setAttribute("aria-disabled", "true");
      } else {
        link.removeAttribute("aria-disabled");
      }
      if (level < currentLevel) {
        link.classList.add("completed");
      }
    });
  }

  fetch("/state")
    .then(function (res) {
      if (!res.ok) throw new Error("sin sesion");
      return res.json();
    })
    .then(function (body) {
      const currentLevel = Number((body.state || {}).current_level || 1);
      lockBySession(currentLevel);
      setActive(currentLevel);
    })
    .catch(function () {
      levelLinks.forEach(function (link) {
        link.classList.add("locked");
        link.setAttribute("aria-disabled", "true");
      });
      setActive(1);
    });
})();

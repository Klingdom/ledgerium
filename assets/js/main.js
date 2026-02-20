(function () {
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  const year = document.getElementById("year");

  if (year) year.textContent = new Date().getFullYear();

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      mobileNav.hidden = expanded;
    });

    mobileNav.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.tagName === "A") {
        navToggle.setAttribute("aria-expanded", "false");
        mobileNav.hidden = true;
      }
    });
  }

  // Mark active nav link by current path
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll('nav a[data-page]').forEach(a => {
    if ((a.getAttribute("data-page") || "").toLowerCase() === path) a.classList.add("active");
  });
})();
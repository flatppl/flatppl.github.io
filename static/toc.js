(() => {
  const sidebar = document.getElementById("site-sidebar");
  if (!sidebar) return;
  const toggle = document.getElementById("toc-toggle");
  const close = document.getElementById("toc-close");
  const backdrop = document.getElementById("toc-backdrop");
  const main = document.getElementById("main-content");
  const mobile = matchMedia("(max-width: 60em)");
  const links = [...sidebar.querySelectorAll("nav a")];
  const headings = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));

  function setOpen(open) {
    sidebar.hidden = !open;
    toggle.hidden = open;
    toggle.setAttribute("aria-expanded", String(open));
    backdrop.hidden = !(open && mobile.matches);
    document.body.classList.toggle("toc-collapsed", !open);
    main.inert = open && mobile.matches;
  }

  toggle.addEventListener("click", () => {
    setOpen(sidebar.hidden);
    if (!sidebar.hidden) close.focus();
  });
  close.addEventListener("click", () => { setOpen(false); toggle.focus(); });
  backdrop.addEventListener("click", () => { setOpen(false); toggle.focus(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !sidebar.hidden) { setOpen(false); toggle.focus(); }
  });
  mobile.addEventListener("change", () => setOpen(!mobile.matches));
  setOpen(!mobile.matches);

  function markCurrent() {
    let current = -1;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= 100) current = index;
    });
    if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) current = links.length - 1;
    links.forEach((link, index) => {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  links.forEach((link, index) => link.addEventListener("click", () => {
    if (mobile.matches) setOpen(false);
    headings[index].setAttribute("tabindex", "-1");
    headings[index].focus({ preventScroll: true });
  }));
  let scheduled = false;
  addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; markCurrent(); });
  }, { passive: true });
  addEventListener("hashchange", markCurrent);
  addEventListener("resize", markCurrent);
  markCurrent();
})();

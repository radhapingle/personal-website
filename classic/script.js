/* Radha Pingle — site interactions */

document.getElementById("year").textContent = new Date().getFullYear();

/* Mobile index toggle */
const toggle = document.querySelector(".mobilebar__toggle");
const mobileNav = document.getElementById("mobileNav");
toggle.addEventListener("click", () => {
  const open = mobileNav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});
mobileNav.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    mobileNav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

/* Reveal on scroll */
const revealables = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("in"));
}

/* Scroll-spy: highlight current section in the rail index */
const spyLinks = document.querySelectorAll(".rail__index a[data-spy]");
const sections = Array.from(spyLinks).map((a) => document.getElementById(a.dataset.spy));
if ("IntersectionObserver" in window && sections.every(Boolean)) {
  const setActive = (id) => {
    spyLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.spy === id));
  };
  const spy = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
  );
  sections.forEach((s) => spy.observe(s));
}

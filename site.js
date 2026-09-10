const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const menuBtn = document.getElementById("menuBtn");
const drawer = document.getElementById("drawer");

menuBtn?.addEventListener("click", () => {
  const open = drawer?.hidden === false;
  if (!drawer) return;
  drawer.hidden = open;
  drawer.classList.toggle("is-open", !open);
  menuBtn.setAttribute("aria-expanded", String(!open));
  menuBtn.textContent = open ? "Menu" : "Close";
});

drawer?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    if (!drawer || !menuBtn) return;
    drawer.hidden = true;
    drawer.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "Menu";
  });
});

const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".top__nav a[href^='#']")];

function spy() {
  const y = window.scrollY + 120;
  let current = sections[0]?.id;
  for (const sec of sections) {
    if (sec.offsetTop <= y) current = sec.id;
  }
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`);
  });
}

window.addEventListener("scroll", spy, { passive: true });

/* ----- Scroll reveals ----- */
function initReveals() {
  const nodes = document.querySelectorAll(".reveal");
  if (prefersReduced) {
    nodes.forEach((n) => n.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  nodes.forEach((n) => io.observe(n));
}

/* ----- Soft cursor glow ----- */
function initCursorGlow() {
  const glow = document.getElementById("cursorGlow");
  if (!glow || prefersReduced || window.matchMedia("(pointer: coarse)").matches) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let cx = x;
  let cy = y;

  window.addEventListener(
    "pointermove",
    (e) => {
      x = e.clientX;
      y = e.clientY;
      glow.classList.add("is-on");
    },
    { passive: true }
  );

  window.addEventListener("pointerleave", () => glow.classList.remove("is-on"));

  function frame() {
    cx += (x - cx) * 0.12;
    cy += (y - cy) * 0.12;
    glow.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ----- Hero photo parallax ----- */
function initParallax() {
  const fig = document.querySelector(".hero__fig.parallax");
  if (!fig || prefersReduced) return;

  window.addEventListener(
    "scroll",
    () => {
      const rect = fig.getBoundingClientRect();
      const mid = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = Math.max(-18, Math.min(18, mid * -0.06));
      fig.style.transform = `translate3d(0, ${shift}px, 0)`;
    },
    { passive: true }
  );
}

/* ----- Ambient floating petals (2D canvas, light) ----- */
function initAmbient() {
  const canvas = document.getElementById("ambient");
  if (!canvas || prefersReduced) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const colors = [
    "rgba(217,160,168,0.55)",
    "rgba(203,181,212,0.48)",
    "rgba(182,201,48,0.38)",
    "rgba(232,201,160,0.45)",
    "rgba(107,143,104,0.42)",
  ];

  let petals = [];
  let w = 0;
  let h = 0;
  let running = false;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function spawn(n = 18) {
    petals = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 3 + Math.random() * 7,
      vx: -0.15 + Math.random() * 0.3,
      vy: 0.12 + Math.random() * 0.28,
      rot: Math.random() * Math.PI * 2,
      vr: -0.01 + Math.random() * 0.02,
      color: colors[(Math.random() * colors.length) | 0],
    }));
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 0.55, p.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of petals) {
      p.x += p.vx + Math.sin(p.rot) * 0.08;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > h + 20) {
        p.y = -20;
        p.x = Math.random() * w;
      }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      drawPetal(p);
    }
    requestAnimationFrame(frame);
  }

  resize();
  spawn(window.innerWidth < 700 ? 10 : 18);
  window.addEventListener("resize", () => {
    resize();
    spawn(window.innerWidth < 700 ? 10 : 18);
  });

  running = true;
  requestAnimationFrame(frame);
}

/* ----- Magnetic org / contact links ----- */
function initMagnetic() {
  if (prefersReduced || window.matchMedia("(pointer: coarse)").matches) return;
  document.querySelectorAll("a.org, .contact a, .top__resume").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.12}px, ${dy * 0.18}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

function bootInteractions() {
  initReveals();
  initCursorGlow();
  initParallax();
  initAmbient();
  initMagnetic();
  spy();
}

bootInteractions();

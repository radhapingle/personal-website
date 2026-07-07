/* ============================================================
   Radha Pingle — personal site interactions
   ============================================================ */

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Mobile navigation ---------- */
const toggle = document.querySelector(".hdr__toggle");
const nav = document.querySelector(".hdr__nav");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});
nav.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

/* ---------- Reveal on scroll ---------- */
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
    { threshold: 0.12 }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("in"));
}

/* ---------- Scroll-progress synapse ---------- */
const synapse = document.getElementById("synapse");
const onScroll = () => {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
  synapse.style.width = pct + "%";
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Focus cursor (pointer-driven glow) ---------- */
const focusCursor = document.getElementById("focusCursor");
const finePointer = window.matchMedia("(pointer: fine)").matches;
if (finePointer && !prefersReduced) {
  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  let tx = cx;
  let ty = cy;
  window.addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    focusCursor.style.opacity = "1";
  });
  const followCursor = () => {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    focusCursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(followCursor);
  };
  followCursor();
  document.querySelectorAll("a, button, .stroop__choice").forEach((el) => {
    el.addEventListener("mouseenter", () => focusCursor.classList.add("is-active"));
    el.addEventListener("mouseleave", () => focusCursor.classList.remove("is-active"));
  });
} else {
  focusCursor.style.display = "none";
}

/* ============================================================
   Neural-network hero canvas
   ============================================================ */
(function neuralHero() {
  const canvas = document.getElementById("neuro");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const LINK_DIST = 145;
  const MOUSE_DIST = 210;

  const inkColor = "28, 26, 21";       // near-black
  const accentColor = "184, 80, 46";   // terracotta

  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNodes();
  }

  function buildNodes() {
    const area = width * height;
    const count = Math.max(30, Math.min(84, Math.round(area / 12000)));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.8 + 1.4,
        pulse: 0,
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      // gentle attraction toward the cursor
      if (mouse.active) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_DIST && d > 0.5) {
          const f = (1 - d / MOUSE_DIST) * 0.045;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      }
      // damping / speed cap
      n.vx = Math.max(-0.7, Math.min(0.7, n.vx * 0.995));
      n.vy = Math.max(-0.7, Math.min(0.7, n.vy * 0.995));
      if (n.pulse > 0) n.pulse -= 0.02;
    }

    // links between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          const alpha = (1 - d / LINK_DIST) * 0.55;
          ctx.strokeStyle = `rgba(${inkColor}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // links to cursor + node rendering
    for (const n of nodes) {
      let near = false;
      if (mouse.active) {
        const d = Math.hypot(mouse.x - n.x, mouse.y - n.y);
        if (d < MOUSE_DIST) {
          near = true;
          const alpha = (1 - d / MOUSE_DIST) * 0.9;
          ctx.strokeStyle = `rgba(${accentColor}, ${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
      const glow = near || n.pulse > 0;
      const rr = n.r + (n.pulse > 0 ? n.pulse * 4 : 0);
      ctx.fillStyle = glow ? `rgba(${accentColor}, 0.95)` : `rgba(${accentColor}, 0.5)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // the cursor "neuron"
    if (mouse.active) {
      ctx.fillStyle = `rgba(${accentColor}, 0.9)`;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(step);
  }

  let rafId = null;

  function pointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    mouse.x = point.clientX - rect.left;
    mouse.y = point.clientY - rect.top;
    mouse.active = true;
  }
  function pointerLeave() {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }

  // "fire" nearby neurons on click
  hero.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    nodes.forEach((n) => {
      if (Math.hypot(px - n.x, py - n.y) < 160) n.pulse = 1;
    });
  });

  window.addEventListener("resize", resize);
  hero.addEventListener("mousemove", pointerMove);
  hero.addEventListener("mouseleave", pointerLeave);
  hero.addEventListener("touchmove", pointerMove, { passive: true });
  hero.addEventListener("touchend", pointerLeave);

  resize();

  if (prefersReduced) {
    // draw a single static frame
    step();
    cancelAnimationFrame(rafId);
  } else {
    step();
  }
})();

/* ============================================================
   Stroop test experiment
   ============================================================ */
(function stroop() {
  const wordEl = document.getElementById("stroopWord");
  const choicesEl = document.getElementById("stroopChoices");
  const startBtn = document.getElementById("stroopStart");
  const resultEl = document.getElementById("stroopResult");
  const progressEl = document.getElementById("stroopProgress");
  const timerEl = document.getElementById("stroopTimer");
  if (!wordEl || !startBtn) return;

  const COLORS = [
    { name: "RED", hex: "#c0392b" },
    { name: "BLUE", hex: "#2c6fb5" },
    { name: "GREEN", hex: "#2e8b57" },
    { name: "YELLOW", hex: "#c9a227" },
    { name: "PURPLE", hex: "#7d5ba6" },
  ];
  const TOTAL = 10;

  let round = 0;
  let inkColor = null;
  let times = [];
  let correct = 0;
  let roundStart = 0;
  let tickId = null;
  let running = false;

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function renderChoices() {
    choicesEl.innerHTML = "";
    COLORS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "stroop__choice";
      b.textContent = c.name.toLowerCase();
      b.style.setProperty("--c", c.hex);
      b.addEventListener("click", () => answer(c));
      choicesEl.appendChild(b);
    });
  }

  function startTimer() {
    roundStart = performance.now();
    const tick = () => {
      timerEl.textContent = Math.round(performance.now() - roundStart) + " ms";
      tickId = requestAnimationFrame(tick);
    };
    tick();
  }

  function nextRound() {
    if (round >= TOTAL) return finish();
    round++;
    // word text and ink color deliberately mismatched most of the time
    const word = pick(COLORS);
    let ink = pick(COLORS);
    if (Math.random() < 0.75) {
      while (ink.name === word.name) ink = pick(COLORS);
    }
    inkColor = ink;
    wordEl.textContent = word.name;
    wordEl.style.color = ink.hex;
    progressEl.textContent = round + " / " + TOTAL;
    startTimer();
  }

  function answer(choice) {
    if (!running) return;
    cancelAnimationFrame(tickId);
    const rt = performance.now() - roundStart;
    times.push(rt);
    const isRight = choice.name === inkColor.name;
    if (isRight) correct++;
    wordEl.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.08)", color: isRight ? "#2e8b57" : "#c0392b" },
        { transform: "scale(1)" },
      ],
      { duration: 260, easing: "ease-out" }
    );
    setTimeout(nextRound, 160);
  }

  function finish() {
    running = false;
    cancelAnimationFrame(tickId);
    choicesEl.innerHTML = "";
    wordEl.textContent = "done!";
    wordEl.style.color = "";
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const fastest = Math.round(Math.min(...times));
    const acc = Math.round((correct / TOTAL) * 100);
    let quip;
    if (acc === 100 && avg < 900) quip = "Remarkable — your prefrontal cortex is winning the fight.";
    else if (acc >= 80) quip = "Solid. You mostly out-muscled the automatic urge to read.";
    else quip = "Classic interference — the reading brain is hard to silence. That's the whole point.";
    resultEl.hidden = false;
    resultEl.innerHTML =
      `<div class="stroop__stats">` +
      `<div class="stroop__stat"><span class="stroop__statnum">${avg}<small>ms</small></span><span class="stroop__statlabel">avg response</span></div>` +
      `<div class="stroop__stat"><span class="stroop__statnum">${fastest}<small>ms</small></span><span class="stroop__statlabel">fastest</span></div>` +
      `<div class="stroop__stat"><span class="stroop__statnum">${acc}<small>%</small></span><span class="stroop__statlabel">accuracy</span></div>` +
      `</div><p class="stroop__quip">${quip}</p>`;
    startBtn.textContent = "Run it again ↺";
    startBtn.hidden = false;
    progressEl.textContent = TOTAL + " / " + TOTAL;
  }

  function start() {
    round = 0;
    times = [];
    correct = 0;
    running = true;
    resultEl.hidden = true;
    resultEl.innerHTML = "";
    startBtn.hidden = true;
    renderChoices();
    nextRound();
  }

  startBtn.addEventListener("click", start);
})();

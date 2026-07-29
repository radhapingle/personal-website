import * as THREE from "three";

const intro = document.getElementById("intro");
const site = document.getElementById("site");
const canvas = document.getElementById("intro-canvas");
const bar = document.getElementById("introBar");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BG = 0x15261e;
let done = false;
let progress = 0;
let target = 0;
let renderer, scene, camera;
let flora = [];
let raf = 0;

function leafShape(scale = 1) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.55 * scale);
  s.bezierCurveTo(0.35 * scale, -0.35 * scale, 0.42 * scale, 0.15 * scale, 0.08 * scale, 0.55 * scale);
  s.bezierCurveTo(0.02 * scale, 0.62 * scale, -0.02 * scale, 0.62 * scale, -0.08 * scale, 0.55 * scale);
  s.bezierCurveTo(-0.42 * scale, 0.15 * scale, -0.35 * scale, -0.35 * scale, 0, -0.55 * scale);
  return s;
}

function petalShape(scale = 1) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.28 * scale, 0.05 * scale, 0.32 * scale, 0.45 * scale, 0, 0.72 * scale);
  s.bezierCurveTo(-0.32 * scale, 0.45 * scale, -0.28 * scale, 0.05 * scale, 0, 0);
  return s;
}

function makeLeaf(color, scale) {
  const geo = new THREE.ShapeGeometry(leafShape(scale));
  geo.center();
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0.04,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    })
  );
}

function makeFlower(petalColor, centerColor, petals = 5, scale = 1) {
  const group = new THREE.Group();
  const petalGeo = new THREE.ShapeGeometry(petalShape(0.38 * scale));
  petalGeo.translate(0, 0.18 * scale, 0);

  for (let i = 0; i < petals; i++) {
    const petal = new THREE.Mesh(
      petalGeo,
      new THREE.MeshStandardMaterial({
        color: petalColor,
        roughness: 0.7,
        metalness: 0.02,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    petal.rotation.z = (i / petals) * Math.PI * 2;
    petal.position.z = i * 0.002;
    group.add(petal);
  }

  const center = new THREE.Mesh(
    new THREE.CircleGeometry(0.1 * scale, 16),
    new THREE.MeshStandardMaterial({
      color: centerColor,
      roughness: 0.55,
      transparent: true,
      opacity: 0.95,
    })
  );
  center.position.z = 0.03;
  group.add(center);
  return group;
}

function placeFlora(mesh, x, y, z) {
  mesh.userData.home = new THREE.Vector3(x, y, z);
  const out = mesh.userData.home.clone();
  // push outward from center when parting
  const len = Math.hypot(out.x, out.y) || 1;
  out.x *= 1 + 1.6 * (2.2 / len);
  out.y *= 1 + 1.4 * (2.0 / len);
  out.z -= 1.5 + Math.random();
  mesh.userData.out = out;
  mesh.userData.spin = (Math.random() - 0.5) * 0.35;
  mesh.userData.bob = Math.random() * Math.PI * 2;
  mesh.position.copy(mesh.userData.home);
  mesh.rotation.set(
    (Math.random() - 0.5) * 0.7,
    (Math.random() - 0.5) * 1.1,
    (Math.random() - 0.5) * 1.3
  );
  mesh.userData.baseRot = mesh.rotation.clone();
  mesh.userData.baseOpacity = 0.9;
  scene.add(mesh);
  flora.push(mesh);
}

/** Prefer corners / edges; keep the center clear for the name. */
function borderPoint(strength = 1) {
  const corners = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];
  const [cx, cy] = corners[(Math.random() * 4) | 0];
  const along = Math.random();
  let x, y;
  if (along < 0.5) {
    x = cx * (2.2 + Math.random() * 1.5) * strength;
    y = cy * (1.35 + Math.random() * 1.15) * strength;
  } else {
    x = cx * (1.5 + Math.random() * 1.4) * strength;
    y = cy * (1.85 + Math.random() * 1.25) * strength;
  }
  const z = -1.6 + Math.random() * 3.4;
  return { x, y, z };
}

function setOpacity(obj, opacity) {
  obj.traverse((child) => {
    if (child.material) {
      child.material.opacity = opacity * (child.userData.opMul || 1);
      child.material.transparent = true;
    }
  });
}

function initScene() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(BG, 1);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.055);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.15, 7.4);

  scene.add(new THREE.AmbientLight(0x6d8578, 0.75));
  const key = new THREE.DirectionalLight(0xffe6c8, 0.85);
  key.position.set(2.5, 4.5, 3.5);
  const fill = new THREE.DirectionalLight(0xc4a0b0, 0.4);
  fill.position.set(-3.5, 1.2, 2);
  const rim = new THREE.DirectionalLight(0x8fb070, 0.35);
  rim.position.set(0, -2, -3);
  scene.add(key, fill, rim);

  const leafPalette = [0x1f4634, 0x2a5a42, 0x3d6b52, 0x4f7d5c, 0x6a8f68, 0x89a46f];
  const flowerPetals = [0xd9a0a8, 0xc9899a, 0xe0b7a0, 0xcbb5d4, 0xe8c9a0, 0xb8c9a8, 0xd4a8b8];
  const flowerCenters = [0xe8d5a3, 0xf0e0b8, 0xd4c090];

  // Leaves: edge framing only
  for (let i = 0; i < 18; i++) {
    const leaf = makeLeaf(leafPalette[i % leafPalette.length], 0.5 + Math.random() * 0.95);
    const p = borderPoint(1.05 + Math.random() * 0.2);
    placeFlora(leaf, p.x, p.y, p.z);
  }

  // Flowers: corners / borders only
  for (let i = 0; i < 24; i++) {
    const flower = makeFlower(
      flowerPetals[i % flowerPetals.length],
      flowerCenters[i % flowerCenters.length],
      5 + (i % 3),
      0.5 + Math.random() * 0.7
    );
    const p = borderPoint(1.15 + Math.random() * 0.3);
    placeFlora(flower, p.x, p.y, p.z);
  }

  // Larger focal blooms — one near each corner
  const cornerAnchors = [
    [-2.85, 2.05, 0.55],
    [2.8, 2.0, 0.4],
    [-2.75, -1.9, 0.6],
    [2.9, -1.95, 0.45],
  ];
  cornerAnchors.forEach((pos, i) => {
    const bloom = makeFlower(
      flowerPetals[(i + 2) % flowerPetals.length],
      flowerCenters[i % flowerCenters.length],
      6,
      1.1 + Math.random() * 0.25
    );
    placeFlora(
      bloom,
      pos[0] + (Math.random() - 0.5) * 0.25,
      pos[1] + (Math.random() - 0.5) * 0.22,
      pos[2]
    );
  });

  // Small accent buds deeper into corners
  for (let i = 0; i < 10; i++) {
    const bud = makeFlower(
      flowerPetals[(i + 4) % flowerPetals.length],
      flowerCenters[i % flowerCenters.length],
      5,
      0.38 + Math.random() * 0.28
    );
    const p = borderPoint(1.45);
    placeFlora(bud, p.x, p.y, p.z - 0.4);
  }

  window.addEventListener("resize", onResize);
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
}

function finishIntro() {
  if (done) return;
  done = true;
  target = 1;
  progress = 1;
  intro.classList.add("is-parting", "is-done");
  document.body.classList.remove("is-intro");
  site.classList.add("is-visible");
  site.setAttribute("aria-hidden", "false");
  intro.setAttribute("aria-hidden", "true");
  window.dispatchEvent(new CustomEvent("intro:done"));

  setTimeout(() => {
    cancelAnimationFrame(raf);
    if (renderer) {
      renderer.dispose();
      flora.forEach(disposeObject);
      canvas.remove();
    }
  }, 800);
}

function tick(t) {
  if (done && progress >= 0.999) return;
  raf = requestAnimationFrame(tick);

  progress += (target - progress) * 0.08;
  if (Math.abs(target - progress) < 0.001) progress = target;

  const p = easeInOut(Math.min(1, Math.max(0, progress)));
  if (bar) bar.style.width = `${p * 100}%`;

  if (p > 0.08) intro.classList.add("is-parting");
  else intro.classList.remove("is-parting");

  const time = t * 0.001;
  flora.forEach((item, i) => {
    item.position.lerpVectors(item.userData.home, item.userData.out, p);
    item.position.y += Math.sin(time * 0.65 + item.userData.bob) * 0.035 * (1 - p);
    item.rotation.z =
      item.userData.baseRot.z +
      time * item.userData.spin * (1 - p * 0.55) +
      p * item.userData.spin * 2.2;
    item.rotation.x = item.userData.baseRot.x + p * (i % 2 ? 0.55 : -0.45);
    setOpacity(item, 0.92 * (1 - p * 0.88));
  });

  camera.position.z = 7.4 - p * 3.3;
  camera.position.y = 0.15 + p * 0.12;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  if (p >= 0.985) finishIntro();
}

function onWheel(e) {
  if (done) return;
  e.preventDefault();
  target = Math.min(1, Math.max(0, target + e.deltaY * 0.00135));
}

let touchY = null;
function onTouchStart(e) {
  touchY = e.touches[0].clientY;
}
function onTouchMove(e) {
  if (done || touchY == null) return;
  const y = e.touches[0].clientY;
  const dy = touchY - y;
  touchY = y;
  target = Math.min(1, Math.max(0, target + dy * 0.004));
}

function start() {
  document.body.classList.add("is-intro");

  if (prefersReduced) {
    finishIntro();
    return;
  }

  try {
    initScene();
    raf = requestAnimationFrame(tick);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
  } catch (err) {
    console.warn("Intro fallback:", err);
    finishIntro();
  }
}

window.addEventListener("keydown", (e) => {
  if (done) return;
  if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    target = 1;
    finishIntro();
  }
});

start();

export { finishIntro };

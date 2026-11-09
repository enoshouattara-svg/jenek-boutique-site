// =====================================================================
//  PÉPITE RUSH — le jeu 3D de Jenek Boutique
//  Attrape les articles dans ton sac Jenek, évite les taches d'encre,
//  atteins un palier et réclame ta récompense sur WhatsApp.
// =====================================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { setReward, openWhatsApp, fmtNumber } from './shop.js';
import {
  makeRenderer, makeEnv, makeCrown, teeParts, teeMaterial, makeTeeMesh, makeBag,
  dotTexture, radialTexture, loadImage, isMobile, roundedBox,
} from './three-shapes.js';

const TEE_COLORS = ['#f2efe8', '#1a1a1d', '#8d8d90', '#1f2a44', '#5b3a29', '#e7967f'];
const TYPES = {
  tee: { pts: 100, good: true, r: 0.42, scale: 0.36, color: 0xffe2a0 },
  watch: { pts: 250, good: true, r: 0.36, scale: 1, color: 0xff9a3a },
  buds: { pts: 250, good: true, r: 0.34, scale: 1, color: 0xffffff },
  nugget: { pts: 400, good: true, r: 0.28, scale: 1, color: 0xffcf4a },
  crown: { pts: 200, good: true, r: 0.36, scale: 0.3, color: 0xffd36b, king: true },
  stain: { pts: 0, good: false, r: 0.34, scale: 1, color: 0xff2e4d },
};
const LS_BEST = 'jb_best_v1';
const LS_MUTE = 'jb_mute_v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

// ---------- Audio synthétisé (aucun fichier à charger) ----------
function createAudio() {
  let ctx = null, master = null, muted = lsGet(LS_MUTE, false);
  const get = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.45;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const tone = (f, dur = 0.1, type = 'triangle', vol = 0.25, when = 0, slide = 0) => {
    const a = get();
    if (!a || muted) return;
    const t0 = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  };
  return {
    unlock: get,
    get muted() { return muted; },
    toggle() { muted = !muted; lsSet(LS_MUTE, muted); if (master) master.gain.value = muted ? 0 : 0.45; return muted; },
    catch(streak) { const f = 520 * Math.pow(2, Math.min(streak, 14) / 12); tone(f, 0.09, 'triangle', 0.22); tone(f * 2, 0.06, 'sine', 0.07, 0.02); },
    big() { [784, 988, 1319].forEach((f, i) => tone(f, 0.12, 'triangle', 0.2, i * 0.055)); },
    king() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.1, i * 0.07)); },
    stain() { tone(170, 0.35, 'sawtooth', 0.26, 0, -120); tone(92, 0.4, 'square', 0.16, 0.02, -40); },
    miss() { tone(240, 0.12, 'sine', 0.06, 0, -80); },
    tick() { tone(1250, 0.04, 'square', 0.05); },
    count(go) { tone(go ? 880 : 440, go ? 0.35 : 0.14, 'triangle', 0.24); },
    palier() { [659, 784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, i * 0.08)); },
    over() { [523, 440, 349, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.12)); },
  };
}

// ---------- Textures et objets ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowTexture() {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 64, 64);
    for (let y = 3; y < 64; y += 9) {
      for (let x = 3; x < 64; x += 8) {
        const r = Math.random();
        if (r < 0.3) {
          g.globalAlpha = 0.45 + Math.random() * 0.55;
          g.fillStyle = r < 0.1 ? '#fff4d6' : r < 0.3 ? '#ffc35a' : '#ff9a3a';
          g.fillRect(x, y, 4, 5);
        }
      }
    }
  });
}

function lumpy(geo, amp, freq) {
  const g = geo;
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * freq * 3.1 + 1.3) * Math.sin(v.y * freq * 2.7 + 0.7) * Math.sin(v.z * freq * 3.3 + 2.1);
    v.multiplyScalar(1 + amp * n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function buildFactories() {
  const F = {};
  const haloMatGood = new THREE.SpriteMaterial({ map: radialTexture('rgba(255,214,120,0.6)', 'rgba(255,214,120,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const addHalo = (g, s) => {
    const h = new THREE.Sprite(haloMatGood);
    h.scale.setScalar(s);
    h.position.z = -0.35;
    g.add(h);
    return g;
  };
  const parts = teeParts({ segments: 36, res: 128, maskRes: 256 });
  const teeMats = TEE_COLORS.map((c) => teeMaterial(c, parts.mask));
  F.tee = () => {
    const g = makeTeeMesh(parts, teeMats[0]);
    g.userData.setColor = (i) => g.children.forEach((m) => { if (m.isMesh) m.material = teeMats[i]; });
    return addHalo(g, 3.6);
  };

  const body = roundedBox(0.46, 0.54, 0.14, 0.1);
  const strap = roundedBox(0.3, 0.42, 0.07, 0.03, 2);
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, metalness: 0.7, roughness: 0.28 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5 });
  const screenMat = new THREE.MeshBasicMaterial({
    map: canvasTex(180, 220, (g, w, h) => {
      g.fillStyle = '#050507';
      g.fillRect(0, 0, w, h);
      const cols = ['#ff3b5c', '#2bd96b', '#2f8bff', '#ffcc33', '#ff7a1a', '#b05cff'];
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(45 + (i % 3) * 45, 150 + Math.floor(i / 3) * 40, 15, 0, Math.PI * 2);
        g.fillStyle = cols[i];
        g.fill();
      }
      g.fillStyle = '#ffffff';
      g.font = '800 54px Manrope, "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText('20:26', w / 2, 92);
      g.fillStyle = '#f3c36b';
      g.font = '700 20px Manrope, "Segoe UI", sans-serif';
      g.fillText('JENEK', w / 2, 34);
    }),
  });
  const screenGeo = new THREE.PlaneGeometry(0.36, 0.44);
  F.watch = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(body, black));
    const s = new THREE.Mesh(screenGeo, screenMat);
    s.position.z = 0.072;
    g.add(s);
    const s1 = new THREE.Mesh(strap, orange);
    s1.position.set(0, 0.44, -0.01);
    const s2 = s1.clone();
    s2.position.y = -0.44;
    g.add(s1, s2);
    return addHalo(g, 1.45);
  };

  const caseGeo = roundedBox(0.52, 0.42, 0.24, 0.12, 4);
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f5, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const seamGeo = new THREE.BoxGeometry(0.505, 0.012, 0.245);
  const seamMat = new THREE.MeshBasicMaterial({ color: 0xb9b9b9 });
  const ledGeo = new THREE.SphereGeometry(0.02, 8, 6);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x3dff8a });
  F.buds = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(caseGeo, white));
    const s = new THREE.Mesh(seamGeo, seamMat);
    s.position.y = 0.06;
    const l = new THREE.Mesh(ledGeo, ledMat);
    l.position.set(0, -0.03, 0.123);
    g.add(s, l);
    return addHalo(g, 1.35);
  };

  const nugGeo = lumpy(new THREE.IcosahedronGeometry(0.25, 2), 0.3, 3.2);
  const nugMat = new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 1, roughness: 0.3, emissive: 0x5a3400, emissiveIntensity: 0.55, flatShading: true });
  F.nugget = () => { const g = new THREE.Group(); g.add(new THREE.Mesh(nugGeo, nugMat)); return addHalo(g, 1.3); };

  const crownProto = makeCrown({ detail: 0.3 }).group;
  addHalo(crownProto, 4.6);
  F.crown = () => crownProto.clone();

  const blobGeo = lumpy(new THREE.SphereGeometry(0.28, 24, 18), 0.18, 2.4);
  const ink = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0e, roughness: 0.12, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
  const dripGeo = new THREE.SphereGeometry(0.07, 12, 10);
  const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeB = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyeGeo = new THREE.SphereGeometry(0.065, 14, 10);
  const pupilGeo = new THREE.SphereGeometry(0.032, 10, 8);
  const browGeo = new THREE.BoxGeometry(0.12, 0.025, 0.02);
  const haloMat = new THREE.SpriteMaterial({ map: radialTexture('rgba(255,40,70,0.8)', 'rgba(255,40,70,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  F.stain = () => {
    const g = new THREE.Group();
    const h = new THREE.Sprite(haloMat);
    h.scale.setScalar(1.3);
    h.position.z = -0.25;
    g.add(h, new THREE.Mesh(blobGeo, ink));
    [[-0.16, -0.25, 0.9], [0.13, -0.29, 1.15], [0.02, -0.34, 0.7]].forEach(([x, y, s]) => {
      const d = new THREE.Mesh(dripGeo, ink);
      d.position.set(x, y, 0.05);
      d.scale.set(s * 0.8, s * 1.35, s * 0.8);
      g.add(d);
    });
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(eyeGeo, eyeW);
      e.position.set(sx * 0.095, 0.05, 0.31);
      const p = new THREE.Mesh(pupilGeo, eyeB);
      p.position.set(sx * 0.085, 0.035, 0.365);
      const b = new THREE.Mesh(browGeo, eyeB);
      b.position.set(sx * 0.095, 0.145, 0.33);
      b.rotation.z = sx * 0.5;
      g.add(e, p, b);
    }
    return g;
  };
  return F;
}

function buildCity() {
  const city = new THREE.Group();
  const baseY = -4.6;
  const win = windowTexture();
  win.wrapS = win.wrapT = THREE.RepeatWrapping;
  const box = new THREE.BoxGeometry(1, 1, 1);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const facade = (w, h) => {
    const t = win.clone();
    t.repeat.set(Math.max(1, Math.round(w / 0.8)), Math.max(1, Math.round(h / 0.8)));
    t.offset.set(rnd(), rnd());
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color: 0x090a10, roughness: 0.9, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7 });
  };
  const tops = [];
  for (let i = 0; i < 28; i++) {
    const w = 1 + rnd() * 1.9;
    const h = 1.6 + rnd() * rnd() * 10;
    const m = new THREE.Mesh(box, facade(w, h));
    m.scale.set(w, h, 1.4);
    m.position.set(-26 + i * 1.9 + (rnd() - 0.5) * 0.8, baseY + h / 2, -17 - rnd() * 6);
    city.add(m);
    tops.push(m);
  }
  // La Pyramide du Plateau — clin d'œil à Abidjan
  const pyr = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.8, 4, 1), facade(3, 4));
  pyr.rotation.y = Math.PI / 4;
  pyr.position.set(4.5, baseY + 2.4, -16);
  city.add(pyr);
  // feux clignotants au sommet des tours
  tops.sort((a, b) => b.scale.y - a.scale.y);
  const blinkMat = new THREE.MeshBasicMaterial({ color: 0xff2e2e });
  const blinks = tops.slice(0, 4).map((m) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), blinkMat);
    s.position.set(m.position.x, m.position.y + m.scale.y / 2 + 0.15, m.position.z);
    city.add(s);
    return s;
  });
  // pont et lagune
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(70, 0.16, 0.4), new THREE.MeshStandardMaterial({ color: 0x15161d, roughness: 0.8 }));
  bridge.position.set(0, baseY + 0.55, -12);
  city.add(bridge);
  const lampPos = [];
  for (let x = -34; x <= 34; x += 1.4) lampPos.push(x, baseY + 0.75, -11.8);
  const lamps = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3)),
    new THREE.PointsMaterial({ color: 0xffc56b, size: 0.28, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  city.add(lamps);
  const waterTex = canvasTex(256, 128, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, 'rgba(10,14,30,1)');
    grd.addColorStop(1, 'rgba(3,3,6,1)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.05 + Math.random() * 0.25;
      g.fillStyle = Math.random() < 0.7 ? '#ffb347' : '#fff1c9';
      g.fillRect(Math.random() * 256, Math.random() * 30, 1 + Math.random() * 2, 20 + Math.random() * 90);
    }
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 12), new THREE.MeshBasicMaterial({ map: waterTex }));
  water.position.set(0, baseY - 6, -11.6);
  city.add(water);
  // étoiles + lune
  const starPos = [];
  for (let i = 0; i < 260; i++) starPos.push((Math.random() - 0.5) * 80, baseY + 4 + Math.random() * 22, -30 - Math.random() * 5);
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }),
  );
  city.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshBasicMaterial({ color: 0xfff1d0 }));
  moon.position.set(-10, 9, -29);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,236,190,0.55)', 'rgba(255,236,190,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  moonGlow.scale.setScalar(9);
  moonGlow.position.copy(moon.position);
  city.add(moon, moonGlow);
  return { city, blinks, waterTex, stars };
}

// =====================================================================
export async function initGame(root) {
  const $ = (s) => root.querySelector(s);
  const canvas = $('#game3d');
  const renderer = makeRenderer(canvas, { maxDpr: isMobile ? 1.5 : 1.75 });
  if (!renderer) {
    root.classList.add('no-webgl');
    return null;
  }
  const ui = {
    score: $('#gScore'), mult: $('#gMult'), lives: $('#gLives'), timeBar: $('#gTimeBar'), time: $('#gTime'),
    palLabel: $('#gPalLabel'), palBar: $('#gPalBar'), fx: $('#gFx'), flash: $('#gFlash'), banner: $('#gBanner'),
    count: $('#gCount'), start: $('#gStart'), pause: $('#gPause'), over: $('#gOver'), best: $('#gBest'),
    mute: $('#gMute'), full: $('#gFull'),
  };
  const sfx = createAudio();
  const screen = $('#gameScreen');

  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  camera.position.set(0, 0, 14);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
  key.position.set(3, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffa64d, 1.4);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const world = buildCity();
  scene.add(world.city);
  const F = buildFactories();

  const logo = await loadImage('img/logo-192.png');
  const bag = makeBag(logo);
  const bagRoot = new THREE.Group();
  bagRoot.add(bag.group);
  scene.add(bagRoot);
  const bagGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,200,90,0.7)', 'rgba(255,200,90,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  bagGlow.scale.set(4, 3, 1);
  bagGlow.position.z = -0.5;
  bagRoot.add(bagGlow);

  // particules
  const PMAX = 600;
  const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pVel = new Float32Array(PMAX * 3), pBase = new Float32Array(PMAX * 3), pLife = new Float32Array(PMAX);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.26, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  particles.frustumCulled = false;
  scene.add(particles);
  let pHead = 0;
  const tmpC = new THREE.Color();
  function burst(x, y, color, n, spread = 1) {
    tmpC.set(color);
    for (let i = 0; i < n; i++) {
      const k = pHead;
      pHead = (pHead + 1) % PMAX;
      const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 4.5) * spread;
      pPos[k * 3] = x; pPos[k * 3 + 1] = y; pPos[k * 3 + 2] = 0.4;
      pVel[k * 3] = Math.cos(a) * s; pVel[k * 3 + 1] = Math.sin(a) * s + 2.5; pVel[k * 3 + 2] = (Math.random() - 0.5) * 2;
      pBase[k * 3] = tmpC.r; pBase[k * 3 + 1] = tmpC.g; pBase[k * 3 + 2] = tmpC.b;
      pLife[k] = 0.7 + Math.random() * 0.5;
    }
  }
  function updateParticles(dt) {
    for (let k = 0; k < PMAX; k++) {
      if (pLife[k] <= 0) continue;
      pLife[k] -= dt * 1.4;
      const l = Math.max(pLife[k], 0);
      pVel[k * 3 + 1] -= 9 * dt;
      pPos[k * 3] += pVel[k * 3] * dt;
      pPos[k * 3 + 1] += pVel[k * 3 + 1] * dt;
      pPos[k * 3 + 2] += pVel[k * 3 + 2] * dt;
      pCol[k * 3] = pBase[k * 3] * l; pCol[k * 3 + 1] = pBase[k * 3 + 1] * l; pCol[k * 3 + 2] = pBase[k * 3 + 2] * l;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  // ---------- Dimensions du terrain ----------
  let halfH = 5, halfW = 5, playW = 4.5, bagBase = 1, itemBase = 1;
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    const desk = camera.aspect > 1.2;
    bagBase = desk ? 1.25 : 1;
    itemBase = desk ? 1.15 : 1;
    playW = Math.min(halfW - 0.75, desk ? 4.8 : 5.6);
    bagRoot.position.y = -halfH + 1.35 * bagBase;
    bagRoot.scale.y = bagRoot.scale.z = bagBase;
    if (bagRoot.scale.x < bagBase * 1.2) bagRoot.scale.x = bagBase;
  }
  layout();
  new ResizeObserver(layout).observe(canvas);

  // ---------- État ----------
  let state = 'idle';
  let score = 0, best = lsGet(LS_BEST, 0), lives = 3, streak = 0, mult = 1, elapsed = 0, kingT = 0, spawnT = 0.5, reached = 0;
  let shake = 0, bagVel = 0, targetX = 0, keyDir = 0, lastTick = 0, last = performance.now(), t = 0, raf = 0, visible = false;
  let result = null;
  const active = [];
  const pools = { tee: [], watch: [], buds: [], nugget: [], crown: [], stain: [] };
  ui.best.textContent = fmtNumber(best);
  ui.mute.textContent = sfx.muted ? '🔇' : '🔊';

  function renderPaliers() {
    const list = document.getElementById('gPaliers');
    if (!list) return;
    list.innerHTML = CONFIG.paliers.map((p) => `
      <li><span class="pal__emoji">${p.emoji}</span><span class="pal__txt"><b>${p.name}</b><small>${fmtNumber(p.score)} pts</small></span><span class="pal__reward">${p.reward}</span></li>`).join('');
  }
  renderPaliers();

  function pickType() {
    const k = clamp(elapsed / CONFIG.gameDuration, 0, 1);
    const w = { tee: 0.52, watch: 0.11, buds: 0.11, nugget: 0.06, crown: kingT > 0 ? 0 : 0.035, stain: state === 'play' ? 0.13 + 0.17 * k : 0.12 };
    let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
    for (const [type, v] of Object.entries(w)) { r -= v; if (r <= 0) return type; }
    return 'tee';
  }

  function spawn(type) {
    const T = TYPES[type];
    let obj = pools[type].pop();
    if (!obj) { obj = F[type](); scene.add(obj); }
    obj.visible = true;
    if (type === 'tee') obj.userData.setColor((Math.random() * TEE_COLORS.length) | 0);
    const k = state === 'play' ? clamp(elapsed / CONFIG.gameDuration, 0, 1) : 0;
    const it = {
      type, T, obj,
      x: (Math.random() * 2 - 1) * playW,
      y: halfH + 1,
      vy: (state === 'play' ? lerp(3.0, 6.4, k) : 2.1) * (0.85 + Math.random() * 0.3),
      rs: [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2],
      sway: type === 'nugget' ? 0.55 : 0, phase: Math.random() * 6.28, caught: -1, cy: 0,
    };
    it.prevY = it.y;
    it.base = T.scale * itemBase;
    obj.scale.setScalar(it.base);
    obj.rotation.set(type === 'crown' ? 0.35 : Math.random() * 6, Math.random() * 6, type === 'tee' || type === 'stain' ? 0 : Math.random() * 6);
    obj.position.set(it.x, it.y, 0);
    active.push(it);
  }

  function recycle(i) {
    const it = active[i];
    it.obj.visible = false;
    pools[it.type].push(it.obj);
    active.splice(i, 1);
  }
  function clearItems() { for (let i = active.length - 1; i >= 0; i--) recycle(i); }

  // ---------- Effets ----------
  function popup(text, x, y, cls = '') {
    const v = new THREE.Vector3(x, y, 0).project(camera);
    const el = document.createElement('span');
    el.className = `gpop ${cls}`;
    el.textContent = text;
    el.style.left = `${(v.x + 1) * 50}%`;
    el.style.top = `${(1 - v.y) * 50}%`;
    ui.fx.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
  let bannerTimer = 0;
  function banner(text, cls = '', ms = 1600) {
    ui.banner.textContent = text;
    ui.banner.className = `game__banner is-on ${cls}`;
    clearTimeout(bannerTimer);
    if (ms) bannerTimer = setTimeout(() => { ui.banner.className = 'game__banner'; }, ms);
  }
  function flash() {
    ui.flash.classList.remove('is-hit');
    void ui.flash.offsetWidth;
    ui.flash.classList.add('is-hit');
  }
  function bagBounce() {
    const gs = window.gsap;
    if (gs) gs.fromTo(bag.group.scale, { y: 0.8, x: 1.12 }, { y: 1, x: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  }
  function confetti() {
    const cols = [0xffcf4a, 0xff7a1a, 0x12c47e, 0xffffff];
    for (let i = 0; i < 6; i++) burst((Math.random() * 2 - 1) * playW, halfH - 0.5 - Math.random(), cols[i % 4], 14, 0.9);
  }

  function hud() {
    ui.score.textContent = fmtNumber(score);
    const m = mult * (kingT > 0 ? 2 : 1);
    ui.mult.textContent = `x${m}`;
    ui.mult.classList.toggle('is-hot', m > 1);
    ui.lives.innerHTML = '<b>❤</b>'.repeat(Math.max(lives, 0)) + '<i>❤</i>'.repeat(3 - Math.max(lives, 0));
    const next = CONFIG.paliers[reached];
    const prev = reached ? CONFIG.paliers[reached - 1].score : 0;
    if (next) {
      ui.palLabel.textContent = `Prochain palier : ${next.emoji} ${next.name} · ${fmtNumber(next.score)}`;
      ui.palBar.style.width = `${clamp((score - prev) / (next.score - prev), 0, 1) * 100}%`;
    } else {
      ui.palLabel.textContent = '👑 Tous les paliers débloqués !';
      ui.palBar.style.width = '100%';
    }
  }

  function startKing() {
    kingT = 6;
    sfx.king();
    banner('👑 MODE ROI · POINTS x2', 'king', 0);
    bag.gold.emissive.setHex(0x6a4400);
    bag.front.emissive.setHex(0x2a1c00);
    const gs = window.gsap;
    if (gs) { gs.to(bagRoot.scale, { x: 1.45 * bagBase, duration: 0.5, ease: 'back.out(2)' }); gs.to(bagGlow.material, { opacity: 0.9, duration: 0.4 }); } else { bagRoot.scale.x = 1.45 * bagBase; bagGlow.material.opacity = 0.9; }
    burst(bagRoot.position.x, bagRoot.position.y + 0.6, 0xffd36b, 40, 1.2);
  }
  function endKing(silent) {
    kingT = 0;
    bag.gold.emissive.setHex(0x000000);
    bag.front.emissive.setHex(0x000000);
    const gs = window.gsap;
    if (gs && !silent) { gs.to(bagRoot.scale, { x: bagBase, duration: 0.4 }); gs.to(bagGlow.material, { opacity: 0, duration: 0.4 }); } else { bagRoot.scale.x = bagBase; bagGlow.material.opacity = 0; }
    if (!silent) ui.banner.className = 'game__banner';
  }

  function onCatch(it, x) {
    it.caught = 0;
    it.cy = it.y;
    if (state !== 'play') { burst(x, it.y, it.T.color, 8); return; }
    if (!it.T.good) {
      lives -= 1;
      streak = 0;
      mult = 1;
      burst(x, it.y, 0xff2e4d, 30, 1.1);
      flash();
      shake = 0.5;
      sfx.stain();
      try { navigator.vibrate?.(140); } catch { /* ignore */ }
      popup('Taché ! −1 ❤', x, it.y + 0.6, 'bad');
      hud();
      if (lives <= 0) setTimeout(endGame, 350);
      return;
    }
    streak += 1;
    const prevMult = mult;
    mult = Math.min(5, 1 + Math.floor(streak / 5));
    const pts = it.T.pts * mult * (kingT > 0 ? 2 : 1);
    score += pts;
    popup(`+${fmtNumber(pts)}`, x, it.y + 0.5, it.type === 'nugget' || it.T.king ? 'gold' : '');
    burst(x, it.y, it.T.color, it.type === 'nugget' ? 28 : 14);
    bagBounce();
    if (it.T.king) startKing(); else if (it.type === 'nugget') sfx.big(); else sfx.catch(streak);
    if (mult > prevMult) banner(`COMBO x${mult} 🔥`, 'combo', 900);
    while (reached < CONFIG.paliers.length && score >= CONFIG.paliers[reached].score) {
      const p = CONFIG.paliers[reached];
      reached += 1;
      banner(`${p.emoji} PALIER ${p.name.toUpperCase()} DÉBLOQUÉ !`, 'palier', 1800);
      sfx.palier();
      confetti();
    }
    hud();
  }
  function onMiss(it) {
    if (state === 'play' && it.T.good) {
      if (streak >= 5) popup('Combo perdu', it.x, -halfH + 2.4, 'miss');
      streak = 0;
      mult = 1;
      sfx.miss();
      hud();
    }
  }

  // ---------- Déroulement d'une partie ----------
  let countTimers = [];
  function startGame() {
    sfx.unlock();
    countTimers.forEach(clearTimeout);
    clearItems();
    endKing(true);
    score = 0; lives = 3; streak = 0; mult = 1; elapsed = 0; reached = 0; spawnT = 0.4; lastTick = 0; result = null;
    targetX = 0;
    hud();
    ui.time.textContent = `${CONFIG.gameDuration} s`;
    ui.timeBar.style.transform = 'scaleX(1)';
    [ui.start, ui.over, ui.pause].forEach((o) => o.classList.remove('is-on'));
    root.classList.add('is-playing');
    visible = true; // le joueur vient de cliquer : l'écran de jeu est forcément visible
    loop();
    if (isMobile) screen.scrollIntoView({ block: 'center', behavior: 'smooth' });
    state = 'count';
    const seq = ['3', '2', '1', 'GO !'];
    seq.forEach((s, i) => countTimers.push(setTimeout(() => {
      ui.count.textContent = s;
      ui.count.classList.remove('is-on');
      void ui.count.offsetWidth;
      ui.count.classList.add('is-on');
      sfx.count(i === 3);
      if (i === 3) state = 'play';
    }, i * 650)));
    countTimers.push(setTimeout(() => ui.count.classList.remove('is-on'), 4 * 650 + 300));
  }

  function makeCode(tier) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[(Math.random() * chars.length) | 0];
    return `JNK-${tier.id}-${s}`;
  }

  function endGame() {
    if (state === 'over' || state === 'idle') return;
    state = 'over';
    root.classList.remove('is-playing');
    endKing(false);
    sfx.over();
    const tier = [...CONFIG.paliers].reverse().find((p) => score >= p.score) || null;
    const isBest = score > best;
    if (isBest) { best = score; lsSet(LS_BEST, best); ui.best.textContent = fmtNumber(best); }
    result = { score, tier, code: tier ? makeCode(tier) : null };
    $('#goScore').textContent = fmtNumber(score);
    $('#goBest').textContent = isBest && score > 0 ? '🏆 Nouveau record !' : `Record : ${fmtNumber(best)} pts`;
    const tierBox = $('#goTier');
    if (tier) {
      tierBox.innerHTML = `<p class="go__badge">${tier.emoji} Palier <b>${tier.name}</b></p><p class="go__reward">${tier.reward}</p><p class="go__code">Ton code : <b>${result.code}</b></p>`;
    } else {
      const first = CONFIG.paliers[0];
      tierBox.innerHTML = `<p class="go__reward">Encore <b>${fmtNumber(first.score - score)} pts</b> pour le palier ${first.emoji} ${first.name}. Tu peux le faire !</p>`;
    }
    $('#goClaim').hidden = !tier;
    $('#goApply').hidden = !tier;
    setTimeout(() => { ui.over.classList.add('is-on'); if (tier) confetti(); }, 650);
  }

  function pause() {
    if (state !== 'play' && state !== 'count') return;
    countTimers.forEach(clearTimeout);
    ui.count.classList.remove('is-on');
    state = 'pause';
    ui.pause.classList.add('is-on');
  }
  function resume() {
    ui.pause.classList.remove('is-on');
    state = 'play';
    last = performance.now();
  }

  // ---------- Contrôles ----------
  function setTarget(e) {
    const r = canvas.getBoundingClientRect();
    targetX = clamp((((e.clientX - r.left) / r.width) * 2 - 1) * halfW, -playW, playW);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state === 'play' || state === 'count') { setTarget(e); try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
  });
  canvas.addEventListener('pointermove', (e) => {
    if ((state === 'play' || state === 'count') && (e.pointerType === 'mouse' || e.buttons)) setTarget(e);
  });
  const keyMap = { ArrowLeft: -1, KeyA: -1, KeyQ: -1, ArrowRight: 1, KeyD: 1 };
  window.addEventListener('keydown', (e) => {
    if (state !== 'play' && state !== 'count') return;
    if (keyMap[e.code]) { keyDir = keyMap[e.code]; e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
  });
  window.addEventListener('keyup', (e) => { if (keyMap[e.code] === keyDir) keyDir = 0; });

  $('#gPlay').addEventListener('click', startGame);
  $('#goReplay').addEventListener('click', startGame);
  $('#gResume').addEventListener('click', resume);
  ui.mute.addEventListener('click', () => { ui.mute.textContent = sfx.toggle() ? '🔇' : '🔊'; });
  if (ui.full) {
    if (!document.fullscreenEnabled) ui.full.hidden = true;
    ui.full.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else screen.requestFullscreen?.().catch(() => {});
    });
  }
  $('#goClaim').addEventListener('click', () => {
    if (!result?.tier) return;
    openWhatsApp([
      `🎮 *PÉPITE RUSH — ${CONFIG.shopName}*`,
      `J'ai fait *${fmtNumber(result.score)} points* et débloqué le palier ${result.tier.emoji} *${result.tier.name}* !`,
      `🎁 Ma récompense : ${result.tier.reward}`,
      `🔑 Mon code : *${result.code}*`,
      '',
      'Je veux en profiter sur ma commande 😎',
    ].join('\n'));
  });
  $('#goApply').addEventListener('click', () => {
    if (!result?.tier) return;
    const p = result.tier;
    setReward({ code: result.code, id: p.id, name: p.name, emoji: p.emoji, reward: p.reward, discount: p.discount, score: result.score });
    window.JB?.toast(`${p.emoji} Code ${result.code} ajouté à ton panier`);
    window.JB?.openCart();
  });
  $('#goShare').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#jeu`;
    const text = `J'ai fait ${fmtNumber(result?.score || best)} points à PÉPITE RUSH sur le site de ${CONFIG.shopName} 🔥 Tu peux me battre ?`;
    try {
      if (navigator.share) { await navigator.share({ title: 'PÉPITE RUSH', text, url }); return; }
    } catch { return; }
    const w = window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
    if (w) w.opener = null;
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else loop(); });
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (!visible) pause(); else loop();
  }, { threshold: 0.25 }).observe(screen);

  // ---------- Boucle principale ----------
  const bagTopOffset = bag.H / 2;
  function update(dt) {
    t += dt;
    // sac
    if (state === 'play' || state === 'count') {
      if (keyDir) targetX = clamp(targetX + keyDir * 11 * dt, -playW, playW);
    } else if (state === 'idle') {
      let aim = null;
      for (const it of active) {
        if (it.caught < 0 && it.T.good && it.y > bagRoot.position.y && (!aim || it.y < aim.y)) aim = it;
      }
      targetX = aim ? clamp(aim.x, -playW, playW) : Math.sin(t * 0.6) * playW * 0.6;
    }
    const prevX = bagRoot.position.x;
    if (state !== 'pause' && state !== 'over') bagRoot.position.x += (targetX - bagRoot.position.x) * (1 - Math.exp(-dt * (state === 'idle' ? 4 : 16)));
    bagVel = lerp(bagVel, (bagRoot.position.x - prevX) / Math.max(dt, 1e-4), 0.3);
    bagRoot.rotation.z = clamp(-bagVel * 0.02, -0.3, 0.3);
    bagGlow.material.rotation += dt * 0.5;

    if (state === 'play') {
      elapsed += dt;
      const remaining = Math.max(0, CONFIG.gameDuration - elapsed);
      ui.timeBar.style.transform = `scaleX(${remaining / CONFIG.gameDuration})`;
      ui.time.textContent = `${Math.ceil(remaining)} s`;
      root.classList.toggle('is-hurry', remaining <= 10);
      if (remaining <= 10 && Math.ceil(remaining) !== lastTick) { lastTick = Math.ceil(remaining); sfx.tick(); }
      if (kingT > 0) { kingT -= dt; if (kingT <= 0) { endKing(false); hud(); } }
      spawnT -= dt;
      if (spawnT <= 0) {
        const k = clamp(elapsed / CONFIG.gameDuration, 0, 1);
        spawn(pickType());
        if (k > 0.45 && Math.random() < 0.22) spawn(pickType());
        spawnT = lerp(0.85, 0.36, k) * (0.8 + Math.random() * 0.4);
      }
      if (remaining <= 0) endGame();
    } else if (state === 'idle') {
      spawnT -= dt;
      if (spawnT <= 0) { spawn(pickType()); spawnT = 1.1 + Math.random() * 0.5; }
    }

    if (state !== 'pause') {
      const catchHalf = (bag.W / 2) * bagRoot.scale.x + 0.08;
      const bagTop = bagRoot.position.y + bagTopOffset * bagRoot.scale.y;
      for (let i = active.length - 1; i >= 0; i--) {
        const it = active[i];
        const o = it.obj;
        if (it.caught >= 0) {
          it.caught += dt / 0.2;
          const k = Math.min(it.caught, 1);
          o.position.x += (bagRoot.position.x - o.position.x) * Math.min(1, dt * 20);
          o.position.y = it.cy - k * 0.8;
          o.scale.setScalar(it.base * (1 - k * 0.85));
          if (k >= 1) recycle(i);
          continue;
        }
        if (state === 'over') { it.y -= it.vy * dt * 0.4; } else it.y -= it.vy * dt;
        const x = it.x + Math.sin(t * 2.4 + it.phase) * it.sway;
        o.position.set(x, it.y, 0);
        if (it.type === 'tee') { o.rotation.z += it.rs[2] * 0.4 * dt; o.rotation.y = Math.sin(t * 1.8 + it.phase) * 0.7; }
        else if (it.type === 'crown') o.rotation.y += 2.2 * dt;
        else if (it.type === 'stain') { o.rotation.z = Math.sin(t * 3 + it.phase) * 0.25; o.rotation.y = Math.sin(t * 2 + it.phase) * 0.3; }
        else { o.rotation.x += it.rs[0] * dt; o.rotation.y += it.rs[1] * dt; }
        if (state !== 'over' && it.prevY > bagTop && it.y <= bagTop && Math.abs(x - bagRoot.position.x) < catchHalf + it.T.r * 0.4) {
          onCatch(it, x);
        } else if (it.y < -halfH - 1.4) {
          onMiss(it);
          recycle(i);
          continue;
        }
        it.prevY = it.y;
      }
    }

    updateParticles(dt);
    world.blinks.forEach((b, i) => { b.visible = Math.sin(t * 3 + i * 1.7) > 0.2; });
    world.waterTex.offset.x = Math.sin(t * 0.7) * 0.01;
    world.stars.material.opacity = 0.65 + Math.sin(t * 1.3) * 0.2;
    shake = Math.max(0, shake - dt * 1.6);
    camera.position.x = (Math.random() - 0.5) * shake * 0.6;
    camera.position.y = (Math.random() - 0.5) * shake * 0.6;
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    loop();
  }
  function loop() {
    if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  hud();
  loop();
  root.classList.add('is-ready');
  return { start: startGame };
}

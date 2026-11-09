// Scène 3D d'accueil : couronne d'or + carrousel des articles + poussière d'or.
import * as THREE from 'three';
import {
  makeRenderer, makeEnv, makeCrown, dotTexture, radialTexture, beamTexture,
  isMobile, loadImage, roundRectPath, drawCover,
} from './three-shapes.js';

const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');

function wrapText(g, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function drawCard(c, p, img) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height, r = 36, m = 8;
  g.clearRect(0, 0, W, H);
  g.save();
  roundRectPath(g, m, m, W - 2 * m, H - 2 * m, r);
  g.clip();
  if (img) {
    drawCover(g, img, m, m, W - 2 * m, H - 2 * m, 0.45);
  } else {
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1d1a14');
    bg.addColorStop(1, '#0b0b0d');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(243,195,107,0.25)';
    g.font = '900 220px Anton, Impact, sans-serif';
    g.textAlign = 'center';
    g.fillText('JB', W / 2, H / 2 + 60);
  }
  const shade = g.createLinearGradient(0, H * 0.5, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.9)');
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'left';
  g.fillStyle = '#f5f2ea';
  g.font = '800 36px Manrope, "Segoe UI", system-ui, sans-serif';
  const lines = wrapText(g, p.short || p.name, W - 70);
  const y0 = H - 46 - 48 - (lines.length - 1) * 42;
  lines.forEach((l, i) => g.fillText(l, 34, y0 + i * 42));
  g.fillStyle = '#f3c36b';
  g.font = '800 32px Manrope, "Segoe UI", system-ui, sans-serif';
  g.fillText(typeof p.price === 'number' ? `${fmt(p.price)} FCFA` : 'Prix sur WhatsApp', 34, H - 44);
  g.restore();
  const border = g.createLinearGradient(0, 0, W, H);
  border.addColorStop(0, '#ffe6a3');
  border.addColorStop(0.5, '#c9932f');
  border.addColorStop(1, '#ffd479');
  g.strokeStyle = border;
  g.lineWidth = 7;
  roundRectPath(g, m, m, W - 2 * m, H - 2 * m, r);
  g.stroke();
}

function cardBack(logo) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  g.save();
  roundRectPath(g, 4, 4, 248, 312, 18);
  g.clip();
  const bg = g.createLinearGradient(0, 0, 256, 320);
  bg.addColorStop(0, '#191612');
  bg.addColorStop(1, '#0a0a0c');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 320);
  if (logo) {
    g.globalAlpha = 0.9;
    g.beginPath();
    g.arc(128, 150, 62, 0, Math.PI * 2);
    g.clip();
    g.drawImage(logo, 66, 88, 124, 124);
  }
  g.restore();
  g.strokeStyle = '#c9932f';
  g.lineWidth = 4;
  roundRectPath(g, 4, 4, 248, 312, 18);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = -1;
  t.offset.x = 1;
  return t;
}

function bentPlane(w, h, R, seg) {
  const geo = new THREE.PlaneGeometry(w, h, seg, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const th = p.getX(i) / R;
    p.setX(i, Math.sin(th) * R);
    p.setZ(i, Math.cos(th) * R - R);
  }
  geo.computeVertexNormals();
  return geo;
}

export function initHero({ canvas, products, logoSrc, onPick }) {
  const renderer = makeRenderer(canvas);
  if (!renderer) return null;
  const gsap = window.gsap;

  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(0, 0.4, 11);
  const look = new THREE.Vector3();

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xfff0d0, 2.6);
  key.position.set(3, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffa640, 2.2);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const stage = new THREE.Group();
  scene.add(stage);

  // Couronne
  const crown = makeCrown({ detail: isMobile ? 0.6 : 1 });
  const crownHolder = new THREE.Group();
  crownHolder.position.y = 0.95;
  crown.group.scale.setScalar(1.05);
  crownHolder.add(crown.group);
  stage.add(crownHolder);

  // Faisceau lumineux + halo au sol
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 2.6, 7.5, 40, 1, true),
    new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 2.2;
  stage.add(beam);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,196,90,0.55)', 'rgba(255,196,90,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.55;
  stage.add(floor);

  // Carrousel d'articles
  const R = 3.7;
  const ring = new THREE.Group();
  ring.position.y = -0.55;
  ring.rotation.x = 0.2;
  stage.add(ring);
  const cardGeo = bentPlane(1.12, 1.4, R, 18);
  const backMat = new THREE.MeshBasicMaterial({ map: cardBack(null), side: THREE.BackSide, alphaTest: 0.5 });
  const N = products.length;
  const cards = products.map((p, i) => {
    const holder = new THREE.Group();
    holder.rotation.y = (i / N) * Math.PI * 2;
    ring.add(holder);
    const cc = document.createElement('canvas');
    cc.width = 512; cc.height = 640;
    drawCard(cc, p, null);
    const tex = new THREE.CanvasTexture(cc);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const front = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 }));
    const back = new THREE.Mesh(cardGeo, backMat);
    front.position.z = R;
    back.position.z = R;
    holder.add(front, back);
    front.userData = { product: p, hover: 0, back, intro: 0 };
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([loadImage(p.img), fontsReady]).then(([img]) => { drawCard(cc, p, img); tex.needsUpdate = true; });
    return front;
  });
  loadImage(logoSrc).then((img) => { if (img) { backMat.map = cardBack(img); backMat.needsUpdate = true; } });

  // Poussière d'or (animée sur la carte graphique)
  const COUNT = isMobile ? 420 : 950;
  const pos = new Float32Array(COUNT * 3), size = new Float32Array(COUNT), phase = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
    size[i] = 0.6 + Math.random() * 2.2;
    phase[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  pGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: dotTexture() }, uPR: { value: renderer.getPixelRatio() }, uOpacity: { value: 0 } },
    vertexShader: `
      attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPR;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.12 + aPhase * 0.3) + 6.0, 12.0) - 6.0;
        p.x += sin(uTime * 0.4 + aPhase * 6.2831) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (9.0 / -mv.z);
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 2.2 + aPhase * 40.0));
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uOpacity;
      varying float vA;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.48) * t.rgb, t.a * vA * uOpacity);
      }`,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // ---------- Mise en page responsive ----------
  const base = { x: 0, y: 0, s: 1, z: 11 };
  function layout() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (!w || !h) return; // onglet pas encore affiché : on attendra le prochain redimensionnement
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const a = w / h;
    if (a < 0.9) {
      camera.fov = 44;
      Object.assign(base, { x: 0, y: a < 0.6 ? 2.3 : 2.0, s: a < 0.6 ? 0.64 : 0.72, z: 12 });
    } else {
      camera.fov = 34;
      Object.assign(base, { x: a > 1.55 ? 2.75 : 2.1, y: 0.15, s: a > 1.55 ? 1 : 0.85, z: 11 });
    }
    camera.updateProjectionMatrix();
  }
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);

  // ---------- Interactions ----------
  const mouse = new THREE.Vector2(), smooth = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-5, -5);
  let hovered = null, spin = 0, inertia = 0, drag = null;

  function toNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }, { passive: true });
  canvas.addEventListener('pointermove', (e) => {
    toNdc(e);
    if (drag) {
      const dx = e.clientX - drag.x;
      drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y0);
      spin += dx * 0.006;
      inertia = dx * 0.35;
      drag.x = e.clientX;
    }
  });
  canvas.addEventListener('pointerdown', (e) => {
    toNdc(e);
    drag = { x: e.clientX, y0: e.clientY, moved: 0, id: e.pointerId };
  });
  const endDrag = (e) => {
    if (!drag) return;
    const wasClick = drag.moved < 8;
    drag = null;
    if (wasClick && e.type === 'pointerup') {
      toNdc(e);
      const hit = pick();
      if (hit && onPick) onPick(hit.userData.product.id);
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { ndc.set(-5, -5); drag = null; });

  function pick() {
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(cards, false);
    return hits.length ? hits[0].object : null;
  }

  // ---------- Boucle ----------
  let t = 0, last = performance.now(), visible = true, raf = 0, introDone = false;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }, { threshold: 0 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    spin += dt * (0.13 + inertia * 0.02);
    inertia *= Math.exp(-dt * 2.4);
    ring.rotation.y = spin;

    smooth.lerp(mouse, 1 - Math.exp(-dt * 3));
    crownHolder.rotation.y += dt * 0.5;
    crownHolder.rotation.x = smooth.y * 0.18;
    crownHolder.rotation.z = -smooth.x * 0.14;
    crownHolder.position.y = 0.95 + Math.sin(t * 1.3) * 0.1;

    const sp = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.2);
    stage.position.set(base.x, base.y + sp * 1.6, 0);
    stage.scale.setScalar(base.s);
    camera.position.x = smooth.x * 0.7;
    camera.position.y = 0.4 + smooth.y * 0.35;
    camera.position.z = base.z - sp * 2.2;
    look.set(0, sp * 0.8, 0);
    camera.lookAt(look);

    hovered = introDone && !drag && !isMobile ? pick() : null;
    canvas.style.cursor = hovered ? 'pointer' : drag ? 'grabbing' : 'grab';
    for (const c of cards) {
      const u = c.userData;
      u.hover += ((c === hovered ? 1 : 0) - u.hover) * (1 - Math.exp(-dt * 10));
      const s = (1 + 0.1 * u.hover) * u.intro;
      c.scale.setScalar(Math.max(s, 0.0001));
      u.back.scale.copy(c.scale);
      c.position.z = R + 0.35 * u.hover;
      u.back.position.z = c.position.z;
    }

    pMat.uniforms.uTime.value = t;
    renderer.render(scene, camera);
    start();
  }
  function start() {
    if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  // ---------- Intro ----------
  function intro() {
    const finish = () => { introDone = true; };
    if (gsap) {
      crownHolder.scale.setScalar(0.001);
      gsap.to(crownHolder.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'elastic.out(1, 0.55)', delay: 0.1 });
      gsap.from(crownHolder.rotation, { y: -Math.PI * 3, duration: 1.8, ease: 'power3.out' });
      cards.forEach((c, i) => gsap.to(c.userData, { intro: 1, duration: 0.9, ease: 'back.out(1.6)', delay: 0.35 + i * 0.06 }));
      gsap.fromTo(ring.position, { y: -3.5 }, { y: -0.55, duration: 1.6, ease: 'power3.out', delay: 0.2 });
      gsap.to(pMat.uniforms.uOpacity, { value: 1, duration: 2, delay: 0.3, onComplete: finish });
      inertia = 6;
    } else {
      cards.forEach((c) => { c.userData.intro = 1; });
      pMat.uniforms.uOpacity.value = 1;
      finish();
    }
  }
  cards.forEach((c) => { c.userData.intro = 0; });
  start();
  return { intro, layout };
}

// Formes 3D partagées : couronne Jenek, T-shirt gonflé, sac Jenek, textures.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const GOLD = 0xf3c36b;
export const isMobile = matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;

export function makeRenderer(canvas, { alpha = true, maxDpr } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr || (isMobile ? 1.6 : 2)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

export function makeEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  return env;
}

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function drawCover(g, img, x, y, w, h, focusY = 0.5) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) * focusY, sw, sh, x, y, w, h);
}

// Boîte aux coins arrondis (sans dépendance externe)
export function roundedBox(w, h, d, r, seg = 3) {
  const b = Math.min(r, d / 2) * 0.5;
  const W = w - 2 * b, H = h - 2 * b, R = Math.max(0.001, Math.min(r, W / 2, H / 2));
  const s = new THREE.Shape();
  s.moveTo(-W / 2 + R, -H / 2);
  s.lineTo(W / 2 - R, -H / 2);
  s.absarc(W / 2 - R, -H / 2 + R, R, -Math.PI / 2, 0, false);
  s.lineTo(W / 2, H / 2 - R);
  s.absarc(W / 2 - R, H / 2 - R, R, 0, Math.PI / 2, false);
  s.lineTo(-W / 2 + R, H / 2);
  s.absarc(-W / 2 + R, H / 2 - R, R, Math.PI / 2, Math.PI, false);
  s.lineTo(-W / 2, -H / 2 + R);
  s.absarc(-W / 2 + R, -H / 2 + R, R, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: seg, curveSegments: seg * 3 });
  geo.center();
  return geo;
}

// ---------- Textures procédurales ----------
export function dotTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,238,200,0.9)');
  grd.addColorStop(0.55, 'rgba(255,200,110,0.25)');
  grd.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function radialTexture(inner = 'rgba(255,205,110,0.85)', outer = 'rgba(255,205,110,0)', size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function beamTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,215,130,0.0)');
  grd.addColorStop(0.15, 'rgba(255,215,130,0.55)');
  grd.addColorStop(1, 'rgba(255,215,130,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Couronne ----------
// Bandeau à pointes avec épaisseur, construit à la main pour un rendu "bijou".
export function crownGeometry({ radius = 1, height = 0.5, spikes = 5, spikeH = 0.78, thickness = 0.08, segments = 240 } = {}) {
  const pos = [];
  const idx = [];
  const ring = (i) => {
    const t = i / segments;
    const s = (t * spikes) % 1;
    const tri = 1 - Math.abs(2 * s - 1);
    const top = height + spikeH * Math.pow(tri, 2.2);
    const flare = 1 + 0.16 * (top / (height + spikeH));
    return { a: t * Math.PI * 2, top, flare };
  };
  // Chaque face : paire [rayon, y] pour A puis B ; quad (Ai, Bi, Bi+1, Ai+1)
  const faces = [
    (r) => [[radius, 0], [radius * r.flare, r.top]],
    (r) => [[radius * r.flare, r.top], [radius * r.flare - thickness, r.top]],
    (r) => [[radius * r.flare - thickness, r.top], [radius - thickness, 0]],
    (r) => [[radius - thickness, 0], [radius, 0]],
  ];
  for (const face of faces) {
    const base = pos.length / 3;
    for (let i = 0; i <= segments; i++) {
      const r = ring(i);
      const c = Math.cos(r.a), s = Math.sin(r.a);
      for (const [rad, y] of face(r)) pos.push(rad * c, y, rad * s);
    }
    for (let i = 0; i < segments; i++) {
      const a0 = base + i * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3;
      idx.push(a0, b0, b1, a0, b1, a1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function makeCrown({ detail = 1 } = {}) {
  const R = 1, H = 0.5, SP = 5, SH = 0.78;
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 });
  const inner = new THREE.Group();
  inner.add(new THREE.Mesh(crownGeometry({ radius: R, height: H, spikes: SP, spikeH: SH, segments: detail > 0.5 ? 240 : 100 }), gold));

  const seg = detail > 0.5 ? 96 : 40;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.012, 0.055, 12, seg), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.03;
  inner.add(rim);
  const rH = R * (1 + 0.16 * (H / (H + SH)));
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(rH + 0.008, 0.032, 10, seg), gold);
  rim2.rotation.x = Math.PI / 2;
  rim2.position.y = H;
  inner.add(rim2);

  const orbGeo = new THREE.SphereGeometry(0.085, detail > 0.5 ? 20 : 10, detail > 0.5 ? 14 : 8);
  const gemGeo = new THREE.OctahedronGeometry(0.1, 0);
  const studGeo = new THREE.SphereGeometry(0.038, 10, 8);
  const gemColors = [0xff7a1a, 0x12c47e, 0xffffff, 0x12c47e, 0xff7a1a];
  const gemMats = gemColors.map((c) => new THREE.MeshPhysicalMaterial({
    color: c, metalness: 0.05, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05,
    emissive: c, emissiveIntensity: c === 0xffffff ? 0.08 : 0.28, envMapIntensity: 2.4,
  }));
  for (let k = 0; k < SP; k++) {
    const a = ((k + 0.5) / SP) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const orb = new THREE.Mesh(orbGeo, gold);
    orb.position.set(R * 1.16 * c, H + SH + 0.055, R * 1.16 * s);
    inner.add(orb);
    const gem = new THREE.Mesh(gemGeo, gemMats[k]);
    const gr = R * (1 + 0.16 * (0.25 / (H + SH))) + 0.03;
    gem.position.set(gr * c, H * 0.5, gr * s);
    gem.scale.set(0.9, 1.25, 0.55);
    gem.lookAt(gem.position.x * 2, gem.position.y, gem.position.z * 2);
    inner.add(gem);
    const av = a + Math.PI / SP;
    const stud = new THREE.Mesh(studGeo, gold);
    stud.position.set((R + 0.035) * Math.cos(av), H * 0.5, (R + 0.035) * Math.sin(av));
    inner.add(stud);
  }
  inner.position.y = -(H + SH) / 2;
  const group = new THREE.Group();
  group.add(inner);
  return { group, gold, gemMats };
}

// ---------- T-shirt gonflé (champ de hauteur) ----------
const TEE_SPAN = 2.56, TEE_CX = 0, TEE_CY = -0.04;
const TEE_CMDS = [
  ['M', -0.74, -1.15],
  ['Q', 0, -1.2, 0.74, -1.15],
  ['L', 0.76, 0.42],
  ['L', 0.93, 0.22],
  ['L', 1.17, 0.56],
  ['Q', 0.95, 0.86, 0.62, 1.04],
  ['Q', 0.46, 1.1, 0.3, 1.12],
  ['Q', 0, 0.7, -0.3, 1.12],
  ['Q', -0.46, 1.1, -0.62, 1.04],
  ['Q', -0.95, 0.86, -1.17, 0.56],
  ['L', -0.93, 0.22],
  ['L', -0.76, 0.42],
  ['Z'],
];

function traceTee(t, map) {
  for (const c of TEE_CMDS) {
    if (c[0] === 'M') t.moveTo(...map(c[1], c[2]));
    else if (c[0] === 'L') t.lineTo(...map(c[1], c[2]));
    else if (c[0] === 'Q') t.quadraticCurveTo(...map(c[1], c[2]), ...map(c[3], c[4]));
    else t.closePath();
  }
}

function teeMask(res) {
  const c = document.createElement('canvas');
  c.width = c.height = res;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, res, res);
  g.fillStyle = '#fff';
  const S = res / TEE_SPAN;
  g.beginPath();
  traceTee(g, (x, y) => [res / 2 + (x - TEE_CX) * S, res / 2 - (y - TEE_CY) * S]);
  g.fill();
  return c;
}

function chamfer(mask) {
  const res = mask.width;
  const data = mask.getContext('2d').getImageData(0, 0, res, res).data;
  const N = res * res, d = new Float32Array(N), D2 = Math.SQRT2;
  for (let i = 0; i < N; i++) d[i] = data[i * 4] > 127 ? 1e9 : 0;
  for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    const i = y * res + x;
    let v = d[i];
    if (v === 0) continue;
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) {
      v = Math.min(v, d[i - res] + 1);
      if (x > 0) v = Math.min(v, d[i - res - 1] + D2);
      if (x < res - 1) v = Math.min(v, d[i - res + 1] + D2);
    }
    d[i] = v;
  }
  for (let y = res - 1; y >= 0; y--) for (let x = res - 1; x >= 0; x--) {
    const i = y * res + x;
    let v = d[i];
    if (v === 0) continue;
    if (x < res - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < res - 1) {
      v = Math.min(v, d[i + res] + 1);
      if (x < res - 1) v = Math.min(v, d[i + res + 1] + D2);
      if (x > 0) v = Math.min(v, d[i + res - 1] + D2);
    }
    d[i] = v;
  }
  return d;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const NECK = (() => {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, u = 1 - t;
    pts.push([u * u * 0.3 + 2 * u * t * 0 + t * t * -0.3, u * u * 1.12 + 2 * u * t * 0.7 + t * t * 1.12]);
  }
  return pts;
})();

function neckDist(x, y) {
  if (y < 0.72 || Math.abs(x) > 0.5) return 9;
  let m = 9;
  for (let i = 0; i < NECK.length - 1; i++) m = Math.min(m, segDist(x, y, NECK[i][0], NECK[i][1], NECK[i + 1][0], NECK[i + 1][1]));
  return m;
}

export function teeParts({ segments = 120, res = 256, maskRes = 512 } = {}) {
  const d = chamfer(teeMask(res));
  const unit = TEE_SPAN / res;
  const dist = (x, y) => {
    const px = ((x - TEE_CX) / TEE_SPAN) * res + res / 2 - 0.5;
    const py = res / 2 - ((y - TEE_CY) / TEE_SPAN) * res - 0.5;
    const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
    const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= res || yy >= res ? 0 : d[yy * res + xx]);
    return (at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy) * unit;
  };
  const height = (x, y) => {
    const dd = dist(x, y);
    if (dd <= 0) return 0;
    const t = Math.min(dd / 0.3, 1);
    let h = 0.24 * Math.sqrt(1 - (1 - t) * (1 - t));
    const dome = Math.max(0, 1 - (x / 1.25) ** 2 - ((y + 0.15) / 1.4) ** 2);
    h += 0.075 * dome * t;
    h += 0.011 * Math.sin(x * 6.0 + y * 2.3) * t;
    const dn = neckDist(x, y);
    if (dn < 0.1) h += 0.026 * Math.cos((dn / 0.1) * Math.PI * 0.5) * Math.min(1, t * 2.5);
    // ourlets : manches et bas du T-shirt
    const ax = Math.abs(x);
    const cuff = segDist(ax, y, 1.17, 0.56, 0.93, 0.22);
    if (cuff > 0.06 && cuff < 0.1) h -= 0.007 * Math.sin(((cuff - 0.06) / 0.04) * Math.PI);
    if (y < -0.95 && ax < 0.7) {
      const hem = y + 1.15 + 0.03 * (1 - (x / 0.74) ** 2);
      if (hem > 0.07 && hem < 0.11) h -= 0.007 * Math.sin(((hem - 0.07) / 0.04) * Math.PI);
    }
    return h;
  };
  const geo = new THREE.PlaneGeometry(TEE_SPAN, TEE_SPAN, segments, segments);
  geo.translate(TEE_CX, TEE_CY, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, height(p.getX(i), p.getY(i)));
  geo.computeVertexNormals();
  const mask = new THREE.CanvasTexture(teeMask(maskRes));
  return { geo, mask, height };
}

export function teeMaterial(color, mask) {
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.84, metalness: 0, sheen: 0.6, sheenRoughness: 0.5,
    sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.25), alphaMap: mask, alphaTest: 0.5, envMapIntensity: 0.55,
  });
}

export function makeTeeMesh(parts, material) {
  const g = new THREE.Group();
  const front = new THREE.Mesh(parts.geo, material);
  const back = new THREE.Mesh(parts.geo, material);
  back.rotation.y = Math.PI;
  g.add(front, back);
  return g;
}

// ---------- Sac Jenek ----------
export function bagFrontTexture(logo) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 452;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 452);
  bg.addColorStop(0, '#1b1b21');
  bg.addColorStop(1, '#0d0d10');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 452);
  g.strokeStyle = 'rgba(243,195,107,0.9)';
  g.lineWidth = 6;
  g.strokeRect(22, 22, 468, 408);
  if (logo) {
    g.save();
    g.beginPath();
    g.arc(256, 180, 112, 0, Math.PI * 2);
    g.clip();
    g.drawImage(logo, 144, 68, 224, 224);
    g.restore();
    g.beginPath();
    g.arc(256, 180, 114, 0, Math.PI * 2);
    g.lineWidth = 5;
    g.stroke();
  }
  g.fillStyle = '#f3c36b';
  g.font = '800 46px Manrope, "Segoe UI", system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('JENEK BOUTIQUE', 256, 360);
  g.fillStyle = 'rgba(245,242,234,0.7)';
  g.font = '600 24px Manrope, "Segoe UI", system-ui, sans-serif';
  g.fillText('ABIDJAN · CÔTE D’IVOIRE', 256, 398);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeBag(logo) {
  const W = 1.3, H = 1.15, D = 0.62;
  const group = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide });
  const front = new THREE.MeshStandardMaterial({ map: bagFrontTexture(logo), roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, emissive: 0x000000 });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [paper, paper, hidden, paper, front, paper]);
  group.add(body);
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28, emissive: 0x000000 });
  const handleGeo = new THREE.TorusGeometry(0.3, 0.035, 8, 28, Math.PI);
  for (const z of [D / 2 - 0.07, -D / 2 + 0.07]) {
    const h = new THREE.Mesh(handleGeo, gold);
    h.position.set(0, H / 2, z);
    group.add(h);
  }
  const rimGeo = new THREE.BoxGeometry(W + 0.02, 0.045, 0.03);
  for (const z of [D / 2, -D / 2]) {
    const r = new THREE.Mesh(rimGeo, gold);
    r.position.set(0, H / 2, z);
    group.add(r);
  }
  return { group, W, H, D, paper, front, gold };
}

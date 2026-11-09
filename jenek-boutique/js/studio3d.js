// Studio 3D : T-shirt couleur unique en 3D, couleur et taille au choix.
import * as THREE from 'three';
import { makeRenderer, makeEnv, teeParts, teeMaterial, makeTeeMesh, radialTexture, isMobile } from './three-shapes.js';

function labelTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 84;
  const g = c.getContext('2d');
  g.fillStyle = '#101013';
  g.fillRect(0, 0, 256, 84);
  g.strokeStyle = '#c9932f';
  g.lineWidth = 4;
  g.strokeRect(6, 6, 244, 72);
  g.fillStyle = '#f5f2ea';
  g.font = '800 40px Manrope, "Segoe UI", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('JENEK', 128, 44);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function initStudio({ canvas, color = '#f2efe8' }) {
  const renderer = makeRenderer(canvas);
  if (!renderer) return null;
  const gsap = window.gsap;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.1, 7.4);

  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const key = new THREE.DirectionalLight(0xfff4e2, 2.9);
  key.position.set(2.5, 3.5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd4ff, 0.7);
  fill.position.set(-4, 1, 3);
  scene.add(fill);
  const rimL = new THREE.DirectionalLight(0xffb44d, 2.4);
  rimL.position.set(-3, 2, -4);
  scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0xffe2a8, 1.6);
  rimR.position.set(3.5, -1, -3);
  scene.add(rimR);

  const parts = teeParts({ segments: isMobile ? 110 : 160, res: 256, maskRes: 1024 });
  const mat = teeMaterial(color, parts.mask);
  const tee = makeTeeMesh(parts, mat);

  // étiquette tissée « JENEK » près de l'ourlet
  const lx = -0.46, ly = -0.98, e = 0.02;
  const lz = parts.height(lx, ly);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.085), new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.7 }));
  label.position.set(lx, ly, lz + 0.012);
  const nx = -(parts.height(lx + e, ly) - parts.height(lx - e, ly)) / (2 * e);
  const ny = -(parts.height(lx, ly + e) - parts.height(lx, ly - e)) / (2 * e);
  label.lookAt(label.position.clone().add(new THREE.Vector3(nx, ny, 1).normalize()));
  tee.add(label);

  const holder = new THREE.Group();
  holder.add(tee);
  scene.add(holder);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.1),
    new THREE.MeshBasicMaterial({ map: radialTexture('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.75;
  scene.add(shadow);

  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.85 ? 8.6 : 7.4;
    camera.updateProjectionMatrix();
  }
  layout();
  new ResizeObserver(layout).observe(canvas);

  // rotation au doigt / à la souris
  let rotY = -0.35, vel = 0, drag = null, idle = 0, sizeScale = 1;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.x = e.clientX;
    rotY += dx * 0.012;
    vel = dx * 0.6;
    idle = 0;
  });
  const up = () => { drag = null; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  let t = 0, last = performance.now(), raf = 0, visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }, { threshold: 0.05 }).observe(canvas);

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    idle += dt;
    if (!drag) {
      rotY += vel * dt * 0.02;
      vel *= Math.exp(-dt * 3);
      if (idle > 2.5) rotY += Math.sin(t * 0.6) * dt * 0.25;
    }
    holder.rotation.y = rotY;
    holder.position.y = Math.sin(t * 1.4) * 0.08 + 0.05;
    holder.rotation.z = Math.sin(t * 0.9) * 0.03;
    shadow.scale.setScalar(sizeScale * (1 - holder.position.y * 0.4));
    renderer.render(scene, camera);
    loop();
  }
  function loop() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  const target = new THREE.Color();
  return {
    setColor(hex) {
      target.set(hex);
      const sheen = target.clone().lerp(new THREE.Color(0xffffff), 0.25);
      if (gsap) {
        gsap.to(mat.color, { r: target.r, g: target.g, b: target.b, duration: 0.6, ease: 'power2.out' });
        gsap.to(mat.sheenColor, { r: sheen.r, g: sheen.g, b: sheen.b, duration: 0.6 });
        gsap.fromTo(tee.rotation, { y: 0 }, { y: Math.PI * 2, duration: 1.1, ease: 'power3.inOut' });
        gsap.fromTo(tee.scale, { x: 0.94, y: 0.94, z: 0.94 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
      } else {
        mat.color.copy(target);
        mat.sheenColor.copy(sheen);
      }
      idle = 0;
    },
    setSize(size) {
      const map = { S: 0.9, M: 0.96, L: 1.02, XL: 1.08, XXL: 1.14 };
      sizeScale = map[size] || 1;
      if (gsap) gsap.to(holder.scale, { x: sizeScale, y: sizeScale, z: sizeScale, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      else holder.scale.setScalar(sizeScale);
    },
  };
}

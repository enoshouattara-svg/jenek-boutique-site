// =====================================================================
//  JENEK BOUTIQUE — interface : boutique, panier WhatsApp, animations,
//  vidéos TikTok, chargement des scènes 3D et du jeu.
// =====================================================================
import { CONFIG } from './config.js';
import { cart, summary, fmtPrice, fmtNumber, orderMessage, openWhatsApp, waLink, setReward } from './shop.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const gsap = window.gsap;
const ST = window.ScrollTrigger;
if (gsap && ST) gsap.registerPlugin(ST);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const split = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const COLOR_HEX = {
  Blanc: '#f2efe8', Noir: '#18181b', Gris: '#8d8d90', Marron: '#5b3a29', Saumon: '#e7967f',
  Crème: '#efe6d2', Argent: '#c9ccd1', Doré: '#d4a43a',
};
const DEFAULT_MSG = `Bonjour ${CONFIG.shopName} 👋 Je viens de votre site, j'aimerais avoir des infos.`;

// ---------------------------------------------------------------------
//  Produits (lus directement dans le HTML : une seule source à modifier)
// ---------------------------------------------------------------------
const PRODUCTS = $$('.card[data-id]').map((el) => ({
  el,
  id: el.dataset.id,
  name: el.dataset.name,
  short: el.querySelector('.card__name')?.textContent.trim() || el.dataset.name,
  cat: el.dataset.cat,
  catLabel: el.querySelector('.card__cat')?.textContent.trim() || '',
  price: el.dataset.price ? Number(el.dataset.price) : null,
  colors: split(el.dataset.colors),
  sizes: split(el.dataset.sizes),
  gallery: split(el.dataset.gallery).map((f) => `img/p/${f}.jpg`),
  desc: el.querySelector('.card__desc')?.textContent.trim() || '',
}));
const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

PRODUCTS.forEach((p) => {
  const dots = p.el.querySelector('.card__dots');
  if (dots && p.colors.length > 1) dots.innerHTML = p.colors.map((c) => `<i style="--c:${COLOR_HEX[c] || '#888'}" title="${esc(c)}"></i>`).join('');
});

// Liens WhatsApp : message pré-rempli
$$('[data-wa]').forEach((a) => {
  a.href = waLink(a.dataset.wa || DEFAULT_MSG);
  a.target = '_blank';
  a.rel = 'noopener';
});

// ---------------------------------------------------------------------
//  Toasts + API globale (utilisée par le jeu)
// ---------------------------------------------------------------------
function toast(msg) {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('is-out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

// ---------------------------------------------------------------------
//  En-tête, barre de progression, menu mobile
// ---------------------------------------------------------------------
const nav = $('#nav');
const progress = $('#progress');
let lastY = 0;
let menuOpen = false;
function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('is-scrolled', y > 30);
  nav.classList.toggle('is-hidden', y > 500 && y > lastY + 4 && !menuOpen && !document.body.classList.contains('drawer-open'));
  if (y < lastY - 4) nav.classList.remove('is-hidden');
  lastY = y;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const burger = $('#burger');
const menu = $('#menu');
function setMenu(open) {
  menuOpen = open;
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
  if (open && gsap && !reduce) gsap.fromTo('.menu__link', { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.6, ease: 'power3.out', delay: 0.12 });
}
burger.addEventListener('click', () => setMenu(!menuOpen));
$$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

// ---------------------------------------------------------------------
//  Filtres de la boutique
// ---------------------------------------------------------------------
$$('.chip[data-filter]').forEach((chip) => chip.addEventListener('click', () => {
  $$('.chip[data-filter]').forEach((c) => {
    c.classList.toggle('is-active', c === chip);
    c.setAttribute('aria-pressed', String(c === chip));
  });
  const f = chip.dataset.filter;
  PRODUCTS.forEach((p) => { p.el.hidden = !(f === 'all' || p.cat === f); });
  const shown = PRODUCTS.filter((p) => !p.el.hidden).map((p) => p.el);
  if (gsap && !reduce) gsap.fromTo(shown, { y: 34, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.05, ease: 'power3.out', overwrite: true });
  ST?.refresh();
}));

// ---------------------------------------------------------------------
//  Fiche produit (fenêtre)
// ---------------------------------------------------------------------
const pm = $('#pm');
let current = null;
const sel = { color: '', size: '', qty: 1 };

function imageForColor(p, color) {
  if (!color) return p.gallery[0];
  return p.gallery.find((g) => g.includes(slug(color))) || p.gallery[0];
}
function setPmImage(src) {
  const img = $('#pmImg');
  img.src = src;
  img.alt = `${current.short}${sel.color ? ` — ${sel.color}` : ''} · Jenek Boutique`;
  $$('#pmThumbs button').forEach((b) => b.classList.toggle('is-active', b.dataset.img === src));
}
function renderPmOptions() {
  $$('#pmColors button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === sel.color)));
  $$('#pmSizes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === sel.size)));
  $('#pmColorName').textContent = sel.color;
  $('#pmQty').textContent = sel.qty;
}

function openProduct(id) {
  const p = byId[id];
  if (!p || !pm) return;
  current = p;
  sel.color = p.colors[0] || '';
  sel.size = p.sizes.includes('M') ? 'M' : p.sizes[0] || '';
  sel.qty = 1;
  $('#pmCat').textContent = p.catLabel;
  $('#pmName').textContent = p.short;
  $('#pmPrice').innerHTML = p.price ? `<strong>${fmtNumber(p.price)}</strong> FCFA` : '<span class="ask">Prix sur WhatsApp</span>';
  $('#pmDesc').textContent = p.desc;
  $('#pmThumbs').innerHTML = p.gallery.length > 1
    ? p.gallery.map((g, i) => `<button type="button" data-img="${g}" aria-label="Photo ${i + 1}"><img src="${g}" alt="" width="72" height="90" loading="lazy"></button>`).join('')
    : '';
  $('#pmColorsWrap').hidden = !p.colors.length;
  $('#pmColors').innerHTML = p.colors.map((c) => `<button type="button" class="sw" style="--c:${COLOR_HEX[c] || '#888'}" data-color="${esc(c)}" aria-label="${esc(c)}"></button>`).join('');
  $('#pmSizesWrap').hidden = !p.sizes.length;
  $('#pmSizes').innerHTML = p.sizes.map((s) => `<button type="button" class="sz" data-size="${s}">${s}</button>`).join('');
  $('#pmBuy').innerHTML = `${waIcon()} ${p.price ? 'Commander direct' : 'Demander le prix'}`;
  $('#pmNote').textContent = p.price
    ? 'Livraison rapide · disponibilité et livraison confirmées sur WhatsApp.'
    : 'Ajoute-le au panier : on te confirme le prix sur WhatsApp quand tu valides.';
  renderPmOptions();
  setPmImage(imageForColor(p, sel.color));
  if (typeof pm.showModal === 'function') pm.showModal(); else pm.setAttribute('open', '');
  document.body.classList.add('modal-open');
  if (gsap && !reduce) gsap.fromTo('.pm__inner', { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
}
function closeProduct() {
  if (pm.open) pm.close();
  document.body.classList.remove('modal-open');
}
pm?.addEventListener('close', () => document.body.classList.remove('modal-open'));
pm?.addEventListener('click', (e) => {
  if (e.target === pm || e.target.closest('[data-close]')) { closeProduct(); return; }
  const c = e.target.closest('[data-color]');
  if (c) { sel.color = c.dataset.color; renderPmOptions(); setPmImage(imageForColor(current, sel.color)); return; }
  const s = e.target.closest('[data-size]');
  if (s) { sel.size = s.dataset.size; renderPmOptions(); return; }
  const q = e.target.closest('[data-q]');
  if (q) { sel.qty = Math.max(1, Math.min(99, sel.qty + Number(q.dataset.q))); renderPmOptions(); return; }
  const im = e.target.closest('[data-img]');
  if (im) setPmImage(im.dataset.img);
});
$('#pmAdd')?.addEventListener('click', () => {
  const p = current;
  cart.add({ id: p.id, name: p.short, price: p.price, color: sel.color, size: sel.size, img: imageForColor(p, sel.color) }, sel.qty);
  flyToCart($('#pmImg'));
  closeProduct();
  toast(`✓ ${p.short} ajouté au panier`);
});
$('#pmBuy')?.addEventListener('click', () => {
  const p = current;
  const opts = [sel.color, sel.size && `taille ${sel.size}`].filter(Boolean).join(' · ');
  const line = `*${p.short}*${opts ? ` (${opts})` : ''} × ${sel.qty}`;
  openWhatsApp(p.price
    ? `Bonjour ${CONFIG.shopName} 👋\nJe veux commander : ${line} — ${fmtPrice(p.price * sel.qty)}.\nC'est disponible ?`
    : `Bonjour ${CONFIG.shopName} 👋\nQuel est le prix de : ${line} ?\nJe suis intéressé(e) 😊`);
});
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]');
  if (opener) {
    const card = opener.closest('.card');
    if (card) openProduct(card.dataset.id);
  }
});

function waIcon() {
  return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><use href="#i-wa"/></svg>';
}

// ---------------------------------------------------------------------
//  Panier
// ---------------------------------------------------------------------
const drawer = $('#drawer');
const cartBtn = $('#cartBtn');
function openCart() {
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  nav.classList.remove('is-hidden');
  showSent(false);
  setTimeout(() => $('.drawer__close')?.focus(), 60);
}
function closeCart() {
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
}
cartBtn.addEventListener('click', openCart);
$('#cartbar')?.addEventListener('click', openCart);
$$('[data-close-drawer]').forEach((b) => b.addEventListener('click', closeCart));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); if (menuOpen) setMenu(false); } });
window.JB = { toast, openCart, openProduct };

function bumpCart() {
  cartBtn.classList.remove('is-bump');
  void cartBtn.offsetWidth;
  cartBtn.classList.add('is-bump');
}
function flyToCart(fromEl) {
  nav.classList.remove('is-hidden');
  if (!fromEl || reduce || !fromEl.getBoundingClientRect) { bumpCart(); return; }
  const a = fromEl.getBoundingClientRect();
  const b = cartBtn.getBoundingClientRect();
  if (!a.width) { bumpCart(); return; }
  const ghost = document.createElement('div');
  ghost.className = 'fly';
  const src = fromEl.tagName === 'IMG' ? fromEl.currentSrc || fromEl.src : null;
  if (src) ghost.style.backgroundImage = `url("${src}")`;
  const size = Math.min(a.width, a.height, 220);
  Object.assign(ghost.style, { left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 140}px) scale(.55) rotate(-14deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(24deg)`, opacity: 0.5 },
  ], { duration: 900, easing: 'cubic-bezier(.55,0,.3,1)' });
  anim.onfinish = () => { ghost.remove(); bumpCart(); };
}

const savedInfo = lsGet('jb_client_v1', {});
if (savedInfo.name) $('#cName').value = savedInfo.name;
if (savedInfo.place) $('#cPlace').value = savedInfo.place;

function renderCart() {
  const s = summary();
  $('#cartCount').textContent = s.count;
  cartBtn.classList.toggle('has-items', s.count > 0);
  cartBtn.setAttribute('aria-label', `Ouvrir le panier (${s.count} article${s.count > 1 ? 's' : ''})`);
  $('#drawerCount').textContent = s.count ? `(${s.count})` : '';
  $('#cartEmpty').hidden = s.count > 0;
  $('#cartFoot').hidden = s.count === 0;
  $('#cartLines').innerHTML = s.items.map((i) => `
    <li class="line" data-key="${esc(i.key)}">
      <img src="${esc(i.img)}" alt="" width="64" height="80" loading="lazy">
      <div class="line__info">
        <p class="line__name">${esc(i.name)}</p>
        <p class="line__opts">${esc([i.color, i.size && `Taille ${i.size}`].filter(Boolean).join(' · '))}</p>
        <p class="line__price">${typeof i.price === 'number' ? fmtPrice(i.price * i.qty) : '<span class="ask">Prix à confirmer</span>'}</p>
      </div>
      <div class="qty qty--sm"><button type="button" data-dq="-1" aria-label="Retirer un">−</button><output>${i.qty}</output><button type="button" data-dq="1" aria-label="Ajouter un">+</button></div>
      <button type="button" class="line__rm" data-rm aria-label="Retirer ${esc(i.name)}">✕</button>
    </li>`).join('');
  const rows = [];
  if (s.subtotal) rows.push(`<p><span>Sous-total</span><b>${fmtPrice(s.subtotal)}</b></p>`);
  if (s.discount) rows.push(`<p class="disc"><span>Remise jeu (−${s.discountPct} %)</span><b>−${fmtPrice(s.discount)}</b></p>`);
  rows.push(`<p class="tot"><span>Total</span><b>${s.total ? fmtPrice(s.total) : 'À confirmer'}</b></p>`);
  if (s.hasUnknown) rows.push('<p class="hint">+ articles « prix sur WhatsApp » : on te confirme le prix en validant.</p>');
  $('#cartTotals').innerHTML = rows.join('');
  $('#cartReward').innerHTML = s.reward
    ? `<div class="reward__on"><span>${esc(s.reward.emoji || '🎁')} Code <b>${esc(s.reward.code)}</b> · ${esc(s.reward.reward)}</span><button type="button" data-unreward aria-label="Retirer le code">✕</button></div>`
    : '<a class="reward__off" href="#jeu" data-close-drawer-link>🎮 Gagne une réduction en jouant à <b>Pépite Rush</b></a>';
  const bar = $('#cartbar');
  if (bar) {
    bar.hidden = s.count === 0;
    $('#cartbarCount').textContent = s.count;
    $('#cartbarTotal').textContent = s.total ? fmtPrice(s.total) : '';
  }
  document.body.classList.toggle('has-cart', s.count > 0);
}
window.addEventListener('cart:change', renderCart);
renderCart();

$('#cartLines').addEventListener('click', (e) => {
  const li = e.target.closest('.line');
  if (!li) return;
  const key = li.dataset.key;
  const item = cart.items.find((i) => i.key === key);
  if (!item) return;
  const dq = e.target.closest('[data-dq]');
  if (dq) cart.setQty(key, item.qty + Number(dq.dataset.dq));
  if (e.target.closest('[data-rm]')) cart.remove(key);
});
$('#cartReward').addEventListener('click', (e) => {
  if (e.target.closest('[data-unreward]')) setReward(null);
  if (e.target.closest('[data-close-drawer-link]')) closeCart();
});
$('#cartClear').addEventListener('click', () => { cart.clear(); toast('Panier vidé'); });

function showSent(on) {
  $('#cartSent').hidden = !on;
  $('#checkout').hidden = on;
}
$('#checkout').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!summary().count) return;
  const fd = new FormData(e.target);
  const info = { name: String(fd.get('name') || '').trim(), place: String(fd.get('place') || '').trim(), note: String(fd.get('note') || '').trim() };
  lsSet('jb_client_v1', { name: info.name, place: info.place });
  openWhatsApp(orderMessage(info));
  showSent(true);
});
$('#sentNew').addEventListener('click', () => { cart.clear(); setReward(null); showSent(false); closeCart(); toast('Merci pour ta commande 👑'); });
$('#sentBack').addEventListener('click', () => showSent(false));

// ---------------------------------------------------------------------
//  Studio 3D (T-shirt couleur unique)
// ---------------------------------------------------------------------
const studioSel = { color: 'Blanc', size: 'M', qty: 1 };
let studio = null;
$$('#studio .swatch').forEach((sw) => sw.addEventListener('click', () => {
  studioSel.color = sw.dataset.color;
  $$('#studio .swatch').forEach((s) => s.setAttribute('aria-pressed', String(s === sw)));
  $('#studioColor').textContent = studioSel.color;
  studio?.setColor(COLOR_HEX[studioSel.color]);
}));
$$('#studio .sz').forEach((b) => b.addEventListener('click', () => {
  studioSel.size = b.dataset.size;
  $$('#studio .sz').forEach((s) => s.setAttribute('aria-pressed', String(s === b)));
  studio?.setSize(studioSel.size);
}));
$$('#studio [data-sq]').forEach((b) => b.addEventListener('click', () => {
  studioSel.qty = Math.max(1, Math.min(99, studioSel.qty + Number(b.dataset.sq)));
  $('#studioQty').textContent = studioSel.qty;
  const p = byId['tshirt-couleur-unique'];
  $('#studioTotal').textContent = p?.price ? fmtPrice(p.price * studioSel.qty) : '';
}));
$('#studioAdd')?.addEventListener('click', () => {
  const p = byId['tshirt-couleur-unique'];
  if (!p) return;
  cart.add({ id: p.id, name: p.short, price: p.price, color: studioSel.color, size: studioSel.size, img: imageForColor(p, studioSel.color) }, studioSel.qty);
  flyToCart($('#studio3d'));
  toast(`✓ T-shirt ${studioSel.color.toLowerCase()} (${studioSel.size}) ajouté au panier`);
});

// ---------------------------------------------------------------------
//  Vidéos TikTok (carrousel 3D + lecteur officiel TikTok)
// ---------------------------------------------------------------------
const vflow = $('#vflow');
if (vflow) {
  const cards = $$('.vcard', vflow);
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = vflow.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    cards.forEach((c) => {
      const b = c.getBoundingClientRect();
      const off = Math.max(-1.6, Math.min(1.6, (b.left + b.width / 2 - cx) / b.width));
      c.style.setProperty('--off', off.toFixed(3));
      c.style.setProperty('--abs', Math.abs(off).toFixed(3));
      c.style.zIndex = String(100 - Math.round(Math.abs(off) * 10));
    });
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  vflow.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  update();
  $('#vPrev')?.addEventListener('click', () => vflow.scrollBy({ left: -cards[0].offsetWidth, behavior: 'smooth' }));
  $('#vNext')?.addEventListener('click', () => vflow.scrollBy({ left: cards[0].offsetWidth, behavior: 'smooth' }));
  // centrer la 2e carte au départ
  requestAnimationFrame(() => { if (cards[1]) vflow.scrollLeft = cards[1].offsetLeft - (vflow.clientWidth - cards[1].offsetWidth) / 2; update(); });
}
const vm = $('#vm');
document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-video]');
  if (!v || !vm) return;
  e.preventDefault();
  const id = v.dataset.video;
  $('#vmFrame').innerHTML = `<iframe src="https://www.tiktok.com/player/v1/${id}?autoplay=1&music_info=1&description=1&rel=0" title="Vidéo TikTok Jenek Boutique" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write" allowfullscreen loading="lazy"></iframe>`;
  $('#vmLink').href = `${CONFIG.tiktok}/video/${id}`;
  if (typeof vm.showModal === 'function') vm.showModal(); else vm.setAttribute('open', '');
  document.body.classList.add('modal-open');
});
function closeVideo() {
  if (vm.open) vm.close();
  $('#vmFrame').innerHTML = '';
  document.body.classList.remove('modal-open');
}
vm?.addEventListener('click', (e) => { if (e.target === vm || e.target.closest('[data-close]')) closeVideo(); });
vm?.addEventListener('close', () => { $('#vmFrame').innerHTML = ''; document.body.classList.remove('modal-open'); });

// ---------------------------------------------------------------------
//  Contact : formulaire → WhatsApp, QR code
// ---------------------------------------------------------------------
$('#cform')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = String(fd.get('name') || '').trim();
  const msg = String(fd.get('msg') || '').trim();
  openWhatsApp(`Bonjour ${CONFIG.shopName} 👋${name ? `\nJe m'appelle ${name}.` : ''}\n${msg || "J'aimerais avoir des infos sur vos articles."}`);
});

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}
function observeOnce(el, cb, rootMargin = '300px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { cb(); return; }
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); cb(); } }, { rootMargin });
  io.observe(el);
}
observeOnce($('#qr'), async () => {
  try {
    await loadScript('lib/qrcode.min.js');
    const qr = window.qrcode(0, 'M');
    qr.addData(waLink(DEFAULT_MSG));
    qr.make();
    $('#qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch { $('#qr').closest('.qr')?.remove(); }
});

// ---------------------------------------------------------------------
//  Bulle WhatsApp
// ---------------------------------------------------------------------
const fab = $('.wa-fab');
let bubbleSeen = false;
try { bubbleSeen = sessionStorage.getItem('jb_bubble') === '1'; } catch { /* ignore */ }
if (fab && !bubbleSeen) {
  setTimeout(() => {
    fab.classList.add('show-bubble');
    try { sessionStorage.setItem('jb_bubble', '1'); } catch { /* ignore */ }
    setTimeout(() => fab.classList.remove('show-bubble'), 7000);
  }, 6000);
}

// ---------------------------------------------------------------------
//  Effets : curseur, boutons magnétiques, inclinaison des cartes
// ---------------------------------------------------------------------
if (finePointer && !reduce) {
  const cur = $('#cursor');
  let x = -100, y = -100, cx = -100, cy = -100;
  window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    cur.classList.toggle('is-link', !!e.target.closest('a, button, [data-open], canvas, summary, label'));
  });
  document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  (function tick() {
    cx += (x - cx) * 0.22;
    cy += (y - cy) * 0.22;
    cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(tick);
  })();

  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.32}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  $$('.card__tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-6px)`;
      el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
      el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// ---------------------------------------------------------------------
//  Animations au défilement (GSAP)
// ---------------------------------------------------------------------
function splitChars(el) {
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(' ').map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="c">${esc(c)}</span>`).join('')}</span>`).join(' ');
  return $$('.c', el);
}

function counters() {
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const asK = el.dataset.format === 'k';
    const render = (v) => {
      el.textContent = asK && v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')}K` : `${fmtNumber(v)}${el.dataset.suffix || ''}`;
    };
    if (!gsap || !ST || reduce) { render(end); return; }
    const o = { v: 0 };
    render(0);
    const run = () => gsap.to(o, { v: end, duration: 2.2, ease: 'power2.out', onUpdate: () => render(o.v) });
    if (el.closest('.hero')) gsap.delayedCall(0.9, run);
    else ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: run });
  });
}

function scrollAnimations() {
  if (!gsap || !ST || reduce) { counters(); return; }
  $$('[data-split]').forEach((el) => {
    const chars = splitChars(el);
    gsap.from(chars, { yPercent: 115, rotate: 8, opacity: 0, duration: 0.9, ease: 'power4.out', stagger: 0.022, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('.reveal').forEach((el) => {
    // pas de transition CSS pendant l'animation GSAP (sinon conflit sur « transform »)
    el.style.transition = 'none';
    gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onComplete: () => { el.style.transition = ''; } });
  });
  gsap.set('.card', { y: 70, opacity: 0, rotateX: -12 });
  ST.batch('.card', {
    start: 'top 94%',
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, rotateX: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });
  // sécurité : un article visible à l'écran ne doit jamais rester caché
  setTimeout(() => ST.refresh(), 600);
  if ('IntersectionObserver' in window) {
    const safety = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const card = en.target;
        safety.unobserve(card);
        setTimeout(() => {
          if (Number(getComputedStyle(card).opacity) < 0.2) gsap.to(card, { y: 0, opacity: 1, rotateX: 0, duration: 0.6, overwrite: true });
        }, 1500);
      });
    });
    $$('.card').forEach((c) => safety.observe(c));
  }
  $$('.step').forEach((el, i) => {
    gsap.from(el, { y: 80, opacity: 0, rotate: i % 2 ? 3 : -3, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  // marquee : accélère avec la vitesse de défilement
  const tracks = $$('.marquee__track');
  let skew = 0;
  ST.create({
    onUpdate: (self) => {
      const v = Math.max(-1, Math.min(1, self.getVelocity() / 2500));
      skew = v * 8;
      tracks.forEach((t) => { t.style.setProperty('--skew', `${-skew}deg`); });
    },
  });
  // parallaxe des photos lookbook
  $$('.look__row').forEach((row, i) => {
    gsap.to(row, { xPercent: i % 2 ? 6 : -6, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  counters();
}

function heroIntro() {
  if (!gsap || reduce) return;
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.hero__title .line > span', { yPercent: 120, rotate: 6, duration: 1.2, stagger: 0.12 })
    .from('.hero__kicker', { y: 20, opacity: 0, duration: 0.8 }, '-=0.9')
    .from('.hero__sub', { y: 24, opacity: 0, duration: 0.8 }, '-=0.7')
    .from('.hero__cta', { y: 24, opacity: 0, duration: 0.7 }, '-=0.6')
    .from('.hero__stats li', { y: 20, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.5')
    .from('.hero__badge', { scale: 0, rotate: -90, duration: 1.2, ease: 'elastic.out(1, 0.6)' }, '-=0.8');
}

// ---------------------------------------------------------------------
//  Scènes 3D et jeu (chargées à la demande)
// ---------------------------------------------------------------------
let hero = null;
const heroProducts = PRODUCTS.map((p) => ({ id: p.id, name: p.name, short: p.short, price: p.price, img: p.gallery[0] }));
const heroReady = import('./hero3d.js')
  .then((m) => {
    hero = m.initHero({ canvas: $('#hero3d'), products: heroProducts, logoSrc: 'img/logo-192.png', onPick: openProduct });
    if (!hero) document.body.classList.add('no-webgl');
  })
  .catch((err) => { console.warn('3D indisponible', err); document.body.classList.add('no-webgl'); });

observeOnce($('#studio'), () => {
  import('./studio3d.js')
    .then((m) => { studio = m.initStudio({ canvas: $('#studio3d'), color: COLOR_HEX[studioSel.color] }); if (!studio) $('#studio').classList.add('no-webgl'); })
    .catch(() => $('#studio').classList.add('no-webgl'));
}, '500px');

observeOnce($('#jeu'), () => {
  import('./game.js')
    .then((m) => m.initGame($('#jeu')))
    .catch((err) => { console.warn('Jeu indisponible', err); $('#jeu').classList.add('no-webgl'); });
}, '700px');

// ---------------------------------------------------------------------
//  Écran de chargement
// ---------------------------------------------------------------------
const loader = $('#loader');
let pct = 0;
const pctEl = $('#loaderPct');
const barEl = $('#loaderBar');
const fakeProgress = setInterval(() => {
  pct = Math.min(pct + Math.random() * 14, 94);
  if (pctEl) pctEl.textContent = Math.round(pct);
  if (barEl) barEl.style.transform = `scaleX(${pct / 100})`;
}, 110);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let revealed = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  clearInterval(fakeProgress);
  if (pctEl) pctEl.textContent = '100';
  if (barEl) barEl.style.transform = 'scaleX(1)';
  document.body.classList.add('is-loaded');
  setTimeout(() => loader?.remove(), 1400);
  hero?.intro();
  heroIntro();
  scrollAnimations();
}
Promise.race([Promise.all([wait(900), document.fonts ? document.fonts.ready : null, heroReady]), wait(4500)]).then(reveal);

$('#year').textContent = new Date().getFullYear();

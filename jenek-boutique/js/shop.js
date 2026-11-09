// Panier, formatage des prix et messages WhatsApp.
import { CONFIG } from './config.js';

const LS_CART = 'jb_cart_v1';
const LS_REWARD = 'jb_reward_v1';

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ } },
  del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

export const fmtNumber = (n) => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
export const fmtPrice = (n) => `${fmtNumber(n)} ${CONFIG.currency}`;

let items = sanitize(store.get(LS_CART, []));
let reward = store.get(LS_REWARD, null);

function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((i) => i && i.key && i.name && i.qty > 0).map((i) => ({ ...i, qty: Math.min(99, Math.max(1, i.qty | 0)) }));
}

function emit() {
  store.set(LS_CART, items);
  window.dispatchEvent(new CustomEvent('cart:change', { detail: summary() }));
}

export const lineKey = (p) => [p.id, p.color || '', p.size || ''].join('|');

export const cart = {
  get items() { return items; },
  add(p, qty = 1) {
    const key = lineKey(p);
    const found = items.find((i) => i.key === key);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else items.push({ key, id: p.id, name: p.name, price: typeof p.price === 'number' ? p.price : null, color: p.color || '', size: p.size || '', img: p.img || '', qty });
    emit();
  },
  setQty(key, qty) {
    const it = items.find((i) => i.key === key);
    if (!it) return;
    if (qty <= 0) items = items.filter((i) => i.key !== key);
    else it.qty = Math.min(99, qty);
    emit();
  },
  remove(key) { items = items.filter((i) => i.key !== key); emit(); },
  clear() { items = []; emit(); },
};

export const getReward = () => reward;
export function setReward(r) {
  reward = r || null;
  if (reward) store.set(LS_REWARD, reward); else store.del(LS_REWARD);
  emit();
}

export function summary() {
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + (typeof i.price === 'number' ? i.price * i.qty : 0), 0);
  const hasUnknown = items.some((i) => typeof i.price !== 'number');
  const discountPct = reward?.discount || 0;
  const discount = Math.round((subtotal * discountPct) / 100 / 5) * 5;
  return { count, subtotal, hasUnknown, discount, discountPct, total: subtotal - discount, reward, items };
}

export const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export function openWhatsApp(text) {
  const url = waLink(text);
  const w = window.open(url, '_blank');
  if (w) { try { w.opener = null; } catch { /* ignore */ } } else { location.href = url; }
}

export function orderMessage({ name = '', place = '', note = '' } = {}) {
  const s = summary();
  const L = [];
  L.push(`🛍️ *NOUVELLE COMMANDE — ${CONFIG.shopName.toUpperCase()}*`);
  L.push('━━━━━━━━━━━━━━━');
  s.items.forEach((i, n) => {
    const opts = [i.color, i.size && `taille ${i.size}`].filter(Boolean).join(' · ');
    const unit = typeof i.price === 'number' ? fmtPrice(i.price) : 'prix à confirmer';
    const line = typeof i.price === 'number' ? ` = ${fmtPrice(i.price * i.qty)}` : '';
    L.push(`${n + 1}. *${i.name}*${opts ? ` (${opts})` : ''}`);
    L.push(`     ${i.qty} × ${unit}${line}`);
  });
  L.push('━━━━━━━━━━━━━━━');
  if (s.subtotal) L.push(`Sous-total : ${fmtPrice(s.subtotal)}`);
  if (s.reward) L.push(`🎁 Code jeu : *${s.reward.code}* — ${s.reward.reward}`);
  if (s.discount) L.push(`Remise jeu (-${s.discountPct} %, à valider) : -${fmtPrice(s.discount)}`);
  if (s.total) L.push(`💰 *TOTAL : ${fmtPrice(s.total)}*${s.hasUnknown ? ' + articles à prix à confirmer' : ''}`);
  else L.push('💰 *TOTAL : à confirmer*');
  if (name) L.push(`👤 Nom : ${name}`);
  if (place) L.push(`📍 Livraison : ${place}`);
  if (note) L.push(`📝 Note : ${note}`);
  L.push('');
  L.push('Merci de me confirmer la disponibilité et la livraison 🙏');
  return L.join('\n');
}

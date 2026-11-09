// =====================================================================
//  JENEK BOUTIQUE — RÉGLAGES DU SITE
//  Modifie les valeurs ici : tout le site (boutons WhatsApp, panier,
//  jeu) utilise automatiquement ces informations.
//  (Les produits et leurs prix se modifient dans index.html, section
//   « BOUTIQUE » : attribut data-price de chaque article.)
// =====================================================================

export const CONFIG = {
  shopName: 'Jenek Boutique',

  // Numéro WhatsApp au format international, SANS « + » ni espaces.
  // 05 44 16 60 11 (Côte d'Ivoire, indicatif 225) → 2250544166011
  whatsapp: '2250544166011',
  phoneDisplay: '05 44 16 60 11',

  tiktok: 'https://www.tiktok.com/@jenek.busines',
  tiktokHandle: '@jenek.busines',
  city: "Abidjan, Côte d'Ivoire",
  currency: 'FCFA',

  // ---------------------------------------------------------------
  //  JEU « PÉPITE RUSH » : paliers à atteindre et récompenses.
  //  discount = pourcentage de remise appliqué au panier (0 = aucune).
  //  Change librement les scores, les noms et les récompenses.
  // ---------------------------------------------------------------
  paliers: [
    { id: 'PEPITE', name: 'Pépite',         emoji: '🥉', score: 3000,  reward: '-5 % sur ta commande',     discount: 5 },
    { id: 'BOSS',   name: 'Boss',           emoji: '🥈', score: 12000, reward: '-10 % sur ta commande',    discount: 10 },
    { id: 'ROI',    name: 'Roi de la sape', emoji: '🥇', score: 25000, reward: '-15 % + une surprise 🎁', discount: 15 },
  ],
  gameDuration: 60, // durée d'une partie, en secondes
};

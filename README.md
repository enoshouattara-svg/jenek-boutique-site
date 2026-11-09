# Jenek Boutique : site e-commerce 3D

Site vitrine et boutique en ligne de **Jenek Boutique** (Abidjan) : animations 3D (Three.js, GSAP),
panier avec commande sur WhatsApp et mini-jeu **« Pépite Rush »** qui débloque des réductions.

| Dossier / fichier | Contenu |
|---|---|
| `jenek-boutique/` | le site, à mettre en ligne tel quel |
| `jenek-boutique/js/config.js` | numéro WhatsApp, paliers et récompenses du jeu |
| `video-promo/` | vidéos promo (TikTok, statut WhatsApp) et légendes |
| `GUIDE-MISE-EN-LIGNE.md` | guide de mise en ligne et de modification |

## Lancer le site en local

```bash
python -m http.server 8770 --directory jenek-boutique
```

Puis ouvrir http://localhost:8770 (la 3D, le panier et le jeu ont besoin d'un serveur web).

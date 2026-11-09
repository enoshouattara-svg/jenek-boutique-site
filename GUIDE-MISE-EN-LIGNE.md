# 👑 Jenek Boutique — guide de mise en ligne

Ton site complet est dans le dossier **`jenek-boutique`**. C'est **ce dossier** qu'on met en ligne.

> ⚠️ Si tu ouvres `index.html` en double-cliquant dessus, la 3D, le panier et le jeu ne marcheront pas :
> ils ont besoin d'un vrai serveur web. Utilise **Live Server** dans VS Code (étape 0) ou mets le site en ligne (étape 1).

---

## 0. Travailler sur le site dans VS Code

1. Ouvre ce dossier dans VS Code (**Fichier → Ouvrir le dossier…**). Le site est dans `jenek-boutique/`.
2. VS Code te propose d'installer l'extension recommandée **Live Server** : clique **Installer**.
   (Sinon : onglet **Extensions** à gauche → cherche « Live Server » de Ritwick Dey → **Installer**.)
3. Clique sur **« Go Live »** tout en bas à droite : ton site s'ouvre dans le navigateur (http://127.0.0.1:5500).
   À chaque enregistrement (**Ctrl+S**), la page se recharge toute seule.
4. Les fichiers à connaître :
   - `jenek-boutique/index.html` → textes, articles, prix, couleurs, tailles ;
   - `jenek-boutique/js/config.js` → numéro WhatsApp, paliers et récompenses du jeu ;
   - `jenek-boutique/css/style.css` → couleurs et design ;
   - `jenek-boutique/img/p/` → photos des articles.
5. Quand tes modifications sont prêtes, remets le dossier `jenek-boutique` en ligne (étape 1, point 6).

---

## 1. Mettre le site en ligne gratuitement (Netlify, environ 5 minutes)

1. Va sur **https://app.netlify.com/signup** et crée un compte gratuit (e-mail ou Google).
2. Une fois connecté, ouvre **https://app.netlify.com/drop**.
3. **Glisse-dépose le dossier `jenek-boutique`** dans la zone.
4. Netlify te donne une adresse du type `https://nom-au-hasard.netlify.app`.
5. Renomme le site : **Site configuration → Change site name → `jenek-boutique`**.
   Ton adresse devient **https://jenek-boutique.netlify.app** : c'est l'adresse déjà inscrite dans le site pour Google.
   - Si ce nom est déjà pris, choisis-en un autre (ex. `jenekboutique-ci`), puis remplace
     `jenek-boutique.netlify.app` par ta nouvelle adresse dans `index.html`, `sitemap.xml` et `robots.txt`
     (ou demande-moi de le faire).
6. **Pour mettre à jour le site plus tard** : onglet **Deploys** → glisse à nouveau le dossier dans la zone « Drag and drop ».

---

## 2. Apparaître sur Google

1. Ouvre **https://search.google.com/search-console** → **Ajouter une propriété** → **Préfixe de l'URL**
   → colle `https://jenek-boutique.netlify.app/`.
2. Vérification, méthode la plus simple : **Fichier HTML**
   - télécharge le fichier proposé (`googleXXXX.html`) ;
   - mets-le dans le dossier `jenek-boutique` ;
   - re-glisse le dossier sur Netlify, puis clique **Valider**.
3. Menu **Sitemaps** → tape `sitemap.xml` → **Envoyer**.
4. **Inspection de l'URL** → colle ton adresse → **Demander une indexation**.
5. Le site apparaît en général sur Google entre quelques jours et 3 semaines.

## 3. Bing, Yahoo, DuckDuckGo, Ecosia, Qwant

- **https://www.bing.com/webmasters** → **Importer depuis Google Search Console** (un clic).
  Bing alimente aussi Yahoo, DuckDuckGo et Ecosia, et en partie Qwant.

---

## 4. Booster ta visibilité (très important)

- **Fiche Google (Google Maps)** : **https://business.google.com** → crée « Jenek Boutique »,
  catégorie *Magasin de vêtements*, ajoute ton numéro, l'adresse du site et des photos.
  C'est ce qui te fait sortir quand quelqu'un cherche « t-shirt Abidjan » ou « boutique vêtements Abidjan ».
- **TikTok** : le lien WhatsApp de ta bio est **expiré** (il affiche « Le lien n'est plus valide »).
  Remplace-le par l'adresse de ton site ou par `https://wa.me/2250544166011`.
- Partage le lien du site dans ton statut WhatsApp, tes groupes, sur Facebook et Instagram :
  plus il y a de liens vers ton site, plus Google lui fait confiance.
- **Plus tard** : un nom de domaine à toi (ex. `jenekboutique.com`, environ 10 000 FCFA par an),
  à brancher dans Netlify : **Domain management → Add a domain**.

---

## 5. Modifier les infos toi-même

| Quoi | Où |
|---|---|
| Numéro WhatsApp, paliers et récompenses du jeu | `js/config.js` |
| Prix d'un article | `index.html` : cherche l'article (ex. `pull-capuche`), mets le prix dans `data-price="8000"`, puis remplace `<p class="card__price card__price--ask">Prix sur WhatsApp</p>` par `<p class="card__price"><strong>8 000</strong> FCFA</p>` |
| Couleurs et tailles d'un article | `index.html` : `data-colors="Noir,Blanc"` et `data-sizes="S,M,L,XL,XXL"` |
| Photos | dossier `img/p/` (format portrait, environ 480 × 600 px), puis le nom du fichier dans `data-gallery` |

---

## 6. Ce que fait le site

- **Accueil 3D** : couronne dorée Jenek et carrousel 3D de tes articles (on peut le faire tourner, et cliquer un article l'ouvre).
- **Boutique** : 14 articles, filtres, fiche produit (couleurs, tailles, quantité, photos).
- **Panier → « Valider ma commande sur WhatsApp »** : le client arrive dans ta discussion WhatsApp avec
  un message tout prêt (articles, couleurs, tailles, total, nom, commune de livraison).
- **Studio 3D** : le T-shirt couleur unique en 3D, couleur et taille au choix.
- **Jeu « Pépite Rush »** : 60 secondes pour attraper les articles dans le sac Jenek.
  Trois paliers (Pépite, Boss, Roi de la sape) → un code récompense envoyé sur ton WhatsApp ou appliqué au panier.
- **Vidéos TikTok** (lecteur officiel), bouton WhatsApp flottant, FAQ, contact, QR code WhatsApp sur ordinateur.
- **Référencement** : titres et descriptions, données structurées (boutique, produit, FAQ), sitemap avec
  images, robots.txt, image d'aperçu pour WhatsApp et Facebook, icônes, page 404.
- **Aucune dépendance externe** pour la 3D et les animations (fichiers inclus dans `lib/`) :
  le site reste rapide et fonctionne même si un service externe tombe.

## 7. À compléter

- [x] Les 13 articles sans prix restent en **« Prix sur WhatsApp »** (choix volontaire) : le client clique
      « Demander le prix » et t'écrit directement. Tu pourras ajouter les prix plus tard (voir section 5).
- [x] Les **récompenses du jeu** sont confirmées : Pépite (3 000 pts) → −5 %, Boss (12 000 pts) → −10 %,
      Roi de la sape (25 000 pts) → −15 % + une surprise. Tu peux les changer à tout moment dans `js/config.js`.
- [ ] Teste le bouton WhatsApp depuis ton téléphone (le site écrit au **05 44 16 60 11**).

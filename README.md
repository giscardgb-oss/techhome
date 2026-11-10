# Tech Home

Site vitrine tech avec liens partenaires (Amazon, Jumia, AliExpress…). Les visiteurs lisent votre avis sur un produit, cliquent sur « Voir sur Amazon.fr » et achètent sur la boutique : vous touchez la commission.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html`, `app.js` | Le site public (accueil, recherche, catégories, fiches produit) |
| `admin.html`, `admin.js` | L'espace administrateur (ajouter, modifier, supprimer des produits) |
| `legal.html` | Mentions légales, confidentialité, liens partenaires |
| `data.json` | Le catalogue : réglages du site + produits |
| `common.js`, `styles.css` | Code et style partagés |
| `images/` | Les photos envoyées depuis l'admin |

## Mise en ligne gratuite (GitHub Pages)

1. Créez un compte sur github.com.
2. Créez un dépôt public nommé `techhome` et envoyez-y tous ces fichiers.
3. Dans le dépôt : Settings → Pages → Source « Deploy from a branch » → branche `main`, dossier `/ (root)`.
4. Le site est en ligne après une minute à l'adresse `https://VOTRE-COMPTE.github.io/techhome/`.

## Nom de domaine (ex. techhome.shop)

1. Achetez le domaine chez un registraire (Namecheap, OVH, Porkbun…).
2. Dans GitHub : Settings → Pages → Custom domain → saisissez le domaine, puis cochez « Enforce HTTPS » quand c'est proposé.
3. Chez le registraire, ajoutez les enregistrements DNS indiqués par GitHub (4 enregistrements `A` vers les adresses de GitHub Pages et un `CNAME` `www` vers `VOTRE-COMPTE.github.io`).

## Ajouter des produits

1. Ouvrez `https://votre-site/admin.html`.
2. « Mise en ligne » : collez votre compte GitHub, le dépôt et une clé d'accès (Fine-grained token limité à ce dépôt, autorisation « Contents : Read and write »).
3. « Ajouter un produit » : nom, avis, photo, et un lien partenaire par boutique.
4. « Publier en ligne » : le site est à jour en une minute environ.

Sans connexion GitHub, l'admin fonctionne en mode aperçu : les changements restent dans votre navigateur.

## Créer un lien partenaire Amazon

1. Inscrivez-vous au Club Partenaires Amazon (partenaires.amazon.fr pour l'Europe, affiliate-program.amazon.com pour l'international).
2. Connecté à votre compte Partenaire, ouvrez la page du produit sur Amazon : la barre SiteStripe apparaît en haut.
3. Cliquez « Obtenir un lien » → « Texte » et copiez le lien court (amzn.to/…) ou le lien complet qui contient `tag=votre-identifiant`.
4. Collez-le dans le champ du lien d'achat du produit.

Règles importantes d'Amazon : 3 ventes qualifiées dans les 180 jours suivant l'inscription, la mention « En tant que Partenaire Amazon… » visible sur le site (déjà intégrée), pas de prix figé pour les produits Amazon, pas de photos copiées, pas d'achats via vos propres liens.

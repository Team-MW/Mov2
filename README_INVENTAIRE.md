# Marché de Mo' — Système d'Inventaire

Ce document détaille les travaux réalisés sur le système d'inventaire et l'architecture des bases de données.

## 🛠 Travaux Réalisés
- **Résolution de la boucle de redirection :** Correction d'un problème où les pages d'inventaire étaient traitées comme statiques par Astro en mode `hybrid`, ce qui empêchait la lecture des cookies de session. L'ajout de `export const prerender = false;` a forcé le rendu côté serveur (SSR) pour ces pages.
- **Refactorisation de l'authentification :** Utilisation de `cookies.set` et `cookies.delete` natifs d'Astro dans les routes d'API pour une gestion plus robuste des sessions.
- **Simplification de la clé secrète :** Utilisation directe de `SUPABASE_SERVICE_ROLE_KEY` pour signer les tokens de session afin d'éviter les incohérences de chargement des variables d'environnement en mode dev.
- **Amélioration de la navigation :** Ajout d'un lien "Admin Global" dans la barre de navigation de l'inventaire pour retourner facilement au tableau de bord principal (`/admin`).
- **Vérification de la réactivité :** Les pages d'inventaire utilisent des classes Tailwind adaptées pour tous les écrans (ex: tableaux avec défilement horizontal sur mobile).

## 🗄 Architecture des Bases de Données
Le projet utilise **deux instances Supabase distinctes** pour séparer les données du site public et de l'inventaire :

1. **Base de Données Principale (Site Public)**
   - **URL :** `https://rlqesmyifbqfbblttrhl.supabase.co`
   - **Usage :** Stocke les promotions, les produits du catalogue public, et les médias associés.
   - **Variables :** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

2. **Base de Données d'Inventaire**
   - **URL :** `https://mbqfsibfsmnagzscrxic.supabase.co`
   - **Usage :** Dédiée spécifiquement au système d'inventaire en magasin (suivi des stocks, DLC, etc.).
   - **Variables :** `INVENTAIRE_SUPABASE_URL`, `INVENTAIRE_SUPABASE_ANON_KEY`, `INVENTAIRE_SUPABASE_SERVICE_ROLE_KEY`.

Cette séparation permet de ne pas mélanger les données de gestion interne avec les données publiques et d'appliquer des règles de sécurité (RLS) différentes.

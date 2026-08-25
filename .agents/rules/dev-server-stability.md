# Règle : Stabilité des serveurs de développement (Node.js, Astro, Next.js)

## Contexte
Il arrive fréquemment que les serveurs de développement (`npm run dev`) pour Astro, Next.js, Vite ou React plantent silencieusement, se fassent tuer par le terminal ("zsh: terminated"), ou bloquent à cause de problèmes d'environnement récurrents.

## Instructions obligatoires pour l'assistant

Si l'utilisateur rencontre un problème au lancement de son serveur de développement ou lors d'un `npm install`, applique IMMÉDIATEMENT ces vérifications avant de chercher plus loin :

1. **Conflit de version Node.js (EBADENGINE)** 
   - Vérifie la version locale de l'utilisateur avec `node -v`.
   - Regarde le champ `engines.node` dans le `package.json`.
   - Si ça ne correspond pas, modifie discrètement le `package.json` pour assouplir la règle (ex: `>=20.0.0`) afin d'éviter que NPM ne panique et supprime des modules.

2. **Processus Fantômes (Zombies / Port EADDRINUSE)**
   - Si le terminal tue le script instantanément ou que le port est bloqué, cherche et tue les processus Node qui tournent en arrière-plan sur les ports classiques (3000, 4321, 5173, etc.).

3. **Le fameux bug "js-yaml / gray-matter" (Spécifique Astro / SSG)**
   - Si Astro crashe avec l'erreur `TypeError: Cannot read properties of undefined (reading 'bind')` dans `engines.js`, c'est un conflit de version `js-yaml` (v3 vs v4).
   - **Solution imposée :** Ne t'amuse pas avec les `overrides` NPM. Crée un script `postinstall` (ex: `scripts/patch-gray-matter.mjs`) qui remplace `yaml.safeLoad.bind(yaml)` par un wrapper `function` sécurisé, et ajoute-le au `package.json` pour que le patch soit persistant.

4. **Nettoyage des caches locaux**
   - En cas de comportement incohérent après une longue pause, n'hésite pas à supprimer les dossiers `.vite/`, `.next/` ou `.astro/` pour forcer une recompilation propre.

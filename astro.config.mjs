// @ts-nocheck
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  // Canonical site URL — used by sitemap, robots.txt, RSS, and Open Graph
  // tags. Must match the production domain exactly (no trailing slash).
  // Update this whenever the public domain changes.
  site: 'https://marchedemov2.vercel.app',
  output: 'hybrid',
  adapter: vercel({
    // ─── Vercel Web Analytics ─────────────────────────────────────────────
    // DÉSACTIVÉ par défaut. Activation en 2 étapes (ordre important) :
    //   1. Vercel Dashboard → ce projet → onglet "Analytics" → Enable.
    //   2. Passer ci-dessous à `enabled: true` puis redéployer.
    // L'inverse génère un 404 permanent sur /_vercel/insights/script.js
    // pour chaque visiteur (et casse aucun rendu, mais pollue la console).
    // Le script est sans cookie ni PII → conforme RGPD sans bandeau.
    webAnalytics: { enabled: true },
    imageService: true,
  }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
    sitemap({
      filter: (page) => 
        !page.includes('/admin') && 
        !page.includes('/404') && 
        !page.includes('/recherche') &&
        !page.includes('/mentions-legales') &&
        !page.includes('/politique-de-cookies') &&
        !page.includes('/termes-et-conditions'),
      /**
       * @param {import('@astrojs/sitemap').SitemapItem} item
       */
      serialize(item) {
        // Personnalisation SEO : Priority et ChangeFreq
        if (item.url === 'https://marchedemov2.vercel.app' || item.url === 'https://marchedemov2.vercel.app/') {
          item.changefreq = 'daily';
          item.priority = 1.0;
        } else if (item.url.includes('/rayons/') || item.url.includes('/promos')) {
          item.changefreq = 'daily';
          item.priority = 0.9;
        } else if (item.url.includes('/produits/') || item.url.includes('/recettes')) {
          item.changefreq = 'weekly';
          item.priority = 0.8;
        } else if (item.url.includes('/actualites') || item.url.includes('/magasins')) {
          item.changefreq = 'weekly';
          item.priority = 0.8;
        } else {
          item.changefreq = 'monthly';
          item.priority = 0.5;
        }
        return item;
      }
    }),
  ],
  /* Prefetch every internal link the moment it scrolls into view.
     Astro auto-throttles requests (2 concurrent) and respects the
     Save-Data header, so mobile users on 3G are not penalised. The
     viewport strategy gives "tap = instant page" on mobile, where
     `hover` events don't exist. Works hand-in-hand with the
     <ViewTransitions /> wiring in Layout.astro : the target HTML is
     already in the browser cache when the user commits the click. */
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  image: {
    // Hostnames acceptés par <Image> et <Picture>. Tout `<img>` raw n'est
    // pas concerné — uniquement les composants Astro Image.
    // Audit DB+catalogue (avr. 2026) : openfoodfacts (349), auchan (8),
    // grandfrais (1) sont les origines actives à autoriser.
    remotePatterns: [
      { protocol: 'https', hostname: 'static.wixstatic.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
      { protocol: 'https', hostname: 'cdn.auchan.fr' },
      { protocol: 'https', hostname: 'www.grandfrais.com' },
    ],
  },
});

import type { APIRoute } from "astro";
import { RAYONS_LIST } from "../../lib/site";
import { getAllProduits } from "../../lib/produits-repo";
import { getCollection } from "astro:content";

let cachedIndex: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cachedIndex && (now - cacheTimestamp < CACHE_TTL)) {
    return new Response(JSON.stringify(cachedIndex), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60, s-maxage=600, stale-while-revalidate=300",
      },
    });
  }

  const produits = await getAllProduits();

  /* Actualités (MD collection) */
  let actus: Array<{ titre: string; slug: string; categorie: string }> = [];
  try {
    const entries = await getCollection("articles");
    actus = entries
      .filter((e: any) => e.data.actif !== false)
      .map((e: any) => ({
        titre: e.data.titre,
        slug: e.slug,
        categorie: e.data.categorie ?? "Actualité",
      }));
  } catch {
    // collection optional
  }

  /* Recettes */
  let recettes: Array<{ titre: string; slug: string; rayon?: string }> = [];
  try {
    const entries = await getCollection("recettes" as any);
    recettes = entries
      .filter((e: any) => e.data.actif !== false)
      .map((e: any) => ({
        titre: e.data.titre,
        slug: e.slug,
        rayon: e.data.rayonPrincipal,
      }));
  } catch {
    // collection optional
  }

  const index = {
    produits: produits.map((p) => ({
      type: "produit" as const,
      title: p.nom,
      slug: p.slug,
      rayon: p.rayon,
      origine: p.origine ?? "",
      badge: p.badge ?? "",
      image: p.image ?? "",
      href: `/produits/${p.slug}`,
    })),
    rayons: RAYONS_LIST.map((r) => ({
      type: "rayon" as const,
      title: r.nom,
      slug: r.slug,
      tagline: r.tagline ?? "",
      image: r.image,
      accent: r.accent ?? "#1C6B35",
      href: `/rayons/${r.slug}`,
    })),
    actus: actus.map((a) => ({
      type: "actu" as const,
      title: a.titre,
      slug: a.slug,
      categorie: a.categorie,
      href: `/actualites/${a.slug}`,
    })),
    recettes: recettes.map((r) => ({
      type: "recette" as const,
      title: r.titre,
      slug: r.slug,
      rayon: r.rayon ?? "",
      href: `/recettes/${r.slug}`,
    })),
  };

  cachedIndex = index;
  cacheTimestamp = now;

  return new Response(JSON.stringify(index), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=600, stale-while-revalidate=300",
    },
  });
};


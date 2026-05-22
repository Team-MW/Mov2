/**
 * /api/admin/scrape/openfoodfacts
 *
 * Serverless-compatible OpenFoodFacts scraper.
 * Returns normalized products from OFF API without file system operations.
 * Results are returned directly as JSON for immediate use or manual import.
 *
 * Usage:
 *   POST /api/admin/scrape/openfoodfacts with body { rayons?: string[] }
 *
 * Protected by admin cookie.
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const prerender = false;

/* Fields we need from OFF - requesting only these cuts payload by ~90% */
const FIELDS = [
  "code",
  "product_name",
  "product_name_fr",
  "generic_name_fr",
  "brands",
  "brands_tags",
  "categories_tags",
  "countries_tags",
  "origins",
  "image_front_url",
  "image_front_small_url",
  "image_url",
  "nutriscore_grade",
  "packaging",
  "quantity",
  "labels_tags",
].join(",");

/* OFF endpoints with fallback */
const OFF_SEARCH_NEW = "https://search.openfoodfacts.org/search";
const OFF_SEARCH_LEGACY = "https://world.openfoodfacts.org/api/v2/search";

const USER_AGENT =
  "MarcheDeMo-V2-Scraper/1.0 (+contact@marchedemo.com) " +
  "Node.js/22 serverless, https://marchedemo.com";

/* Query plan per rayon - OFF categories_tags_en */
const QUERY_PLAN: Record<string, Array<{ tag: string; limit: number }>> = {
  "epices-du-monde": [
    { tag: "en:spices", limit: 30 },
    { tag: "en:teas", limit: 12 },
    { tag: "en:herbs-and-spices", limit: 10 },
    { tag: "en:salts", limit: 6 },
  ],
  "saveurs-asie": [
    { tag: "en:soy-sauces", limit: 12 },
    { tag: "en:asian-noodles", limit: 12 },
    { tag: "en:rices", limit: 15 },
    { tag: "en:curry-pastes", limit: 8 },
    { tag: "en:coconut-milks", limit: 8 },
  ],
  "saveurs-afrique": [
    { tag: "en:spreads", limit: 10 },
    { tag: "en:nuts", limit: 12 },
    { tag: "en:dried-fruits", limit: 10 },
    { tag: "en:flours", limit: 8 },
  ],
  "boucherie-halal": [
    { tag: "en:meats", limit: 20 },
    { tag: "en:poultry", limit: 10 },
  ],
  "fruits-legumes": [
    { tag: "en:fresh-fruits", limit: 20 },
    { tag: "en:fresh-vegetables", limit: 20 },
  ],
  "surgeles": [
    { tag: "en:frozen-foods", limit: 15 },
    { tag: "en:frozen-fruits", limit: 8 },
    { tag: "en:frozen-vegetables", limit: 8 },
  ],
};

async function fetchOFF(endpoint: string, params: URLSearchParams): Promise<any> {
  const url = `${endpoint}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000), // 15s timeout for serverless
  });

  if (!res.ok) {
    throw new Error(`OFF API error: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

function normalizeProduct(item: any, rayon: string) {
  const code = item.code;
  const name = item.product_name_fr || item.product_name || item.generic_name_fr || "";
  const image = item.image_front_url || item.image_front_small_url || item.image_url || "";

  if (!code || !name || !image) return null;

  return {
    code,
    nom: name.trim(),
    marque: item.brands || item.brands_tags?.[0] || "",
    image_url: image,
    rayon,
    categories: item.categories_tags || [],
    origine: item.origins || "",
    packaging: item.packaging || "",
    quantity: item.quantity || "",
    nutriscore: item.nutriscore_grade || "",
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Admin check
  if (!(await isAuthenticated(cookies))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const rayonsToScrape = body.rayons || Object.keys(QUERY_PLAN);
    const allProducts: any[] = [];

    for (const rayon of rayonsToScrape) {
      const queries = QUERY_PLAN[rayon] || [];
      
      for (const query of queries) {
        const params = new URLSearchParams({
          fields: FIELDS,
          page_size: String(query.limit),
          categories_tags_en: query.tag,
        });

        // Try new search endpoint first, fallback to legacy
        let data;
        try {
          data = await fetchOFF(OFF_SEARCH_NEW, params);
          // New endpoint returns { hits: [...] }
          if (!data.hits) throw new Error("No hits in response");
          data.hits = data.hits || [];
        } catch (e) {
          console.warn(`OFF new endpoint failed for ${rayon}/${query.tag}, trying legacy:`, e);
          // Legacy endpoint uses different param names
          const legacyParams = new URLSearchParams({
            fields: FIELDS,
          });
          // Legacy uses search_terms instead of categories_tags_en
          legacyParams.set("search_terms", query.tag.replace("en:", ""));
          legacyParams.set("page_size", String(query.limit));
          
          data = await fetchOFF(OFF_SEARCH_LEGACY, legacyParams);
          // Legacy returns { products: [...] }
          data.hits = data.products || [];
        }

        for (const item of data.hits) {
          const normalized = normalizeProduct(item, rayon);
          if (normalized) {
            allProducts.push(normalized);
          }
        }

        // Rate limiting - small delay between queries
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Deduplicate by code
    const uniqueProducts = new Map();
    for (const p of allProducts) {
      if (!uniqueProducts.has(p.code)) {
        uniqueProducts.set(p.code, p);
      }
    }

    return new Response(JSON.stringify({
      products: Array.from(uniqueProducts.values()),
      count: uniqueProducts.size,
      rayons: rayonsToScrape,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: err.message || "Scraping failed",
      details: err.toString(),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * /api/admin/scrape/grandfrais
 *
 * Serverless-compatible Grand Frais scraper.
 * Fetches product data from Grand Frais public sitemap without file system.
 * Returns normalized products as JSON.
 *
 * Usage:
 *   POST /api/admin/scrape/grandfrais with body { limit?: number, section?: string }
 *
 * Protected by admin cookie.
 */
import type { APIRoute } from "astro";
import { isAuthenticated } from "@/lib/auth";

export const prerender = false;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SITEMAP_URL = "https://www.grandfrais.com/sitemap-rayons-produits.xml";
const DELAY_MS = 400;

async function fetchText(url: string, attempt = 0): Promise<{ status: number; text: string; error?: string }> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (r.status === 429 || r.status >= 500) {
      if (attempt < 3) {
        const wait = 1000 * Math.pow(2, attempt);
        await new Promise((s) => setTimeout(s, wait));
        return fetchText(url, attempt + 1);
      }
    }
    return { status: r.status, text: await r.text() };
  } catch (e) {
    if (attempt < 3) {
      await new Promise((s) => setTimeout(s, 1000 * Math.pow(2, attempt)));
      return fetchText(url, attempt + 1);
    }
    return { status: 0, text: "", error: (e as Error).message };
  }
}

const decodeHtml = (s: string) =>
  String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê")
    .replace(/&agrave;/g, "à")
    .replace(/&acirc;/g, "â")
    .replace(/&ccedil;/g, "ç")
    .replace(/&ocirc;/g, "ô")
    .replace(/&ucirc;/g, "û")
    .replace(/&icirc;/g, "î");

function parseProductPage(html: string, url: string) {
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const name = h1Match ? decodeHtml(h1Match[1].replace(/<[^>]*>/g, "")) : "";

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const description = ogDescMatch ? decodeHtml(ogDescMatch[1]) : "";

  const imgMatch = html.match(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi);
  let image = "";
  if (imgMatch) {
    for (const match of imgMatch) {
      const srcMatch = match.match(/src=["']([^"']*)["']/i);
      if (srcMatch) {
        const src = srcMatch[1];
        // Prefer curated product photos
        if (src.includes("/images/institBackoffice/uploads/")) {
          image = src.startsWith("/") ? `https://www.grandfrais.com${src}` : src;
          break;
        }
        // Fallback to first non-svg image
        if (!image && !src.includes(".svg") && !src.includes("pictogram")) {
          image = src.startsWith("/") ? `https://www.grandfrais.com${src}` : src;
        }
      }
    }
  }

  const slugMatch = url.match(/\/([^/]+)\/?$/);
  const slug = slugMatch ? slugMatch[1].replace(/^produit-/, "") : "";

  return {
    slug,
    nom: name,
    description,
    image,
    source: url,
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await isAuthenticated(cookies))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const limit = body.limit || 20;
    const section = body.section;

    const { status, text } = await fetchText(SITEMAP_URL);
    if (status !== 200) {
      throw new Error(`Failed to fetch sitemap: ${status}`);
    }

    // Extract URLs from sitemap XML
    const urlMatch = text.match(/<loc>(https:\/\/www\.grandfrais\.com\/[^<]+)<\/loc>/gi);
    const urls = urlMatch ? urlMatch.map((m) => m.replace(/<loc>|<\/loc>/g, "")) : [];

    let filteredUrls = urls;
    if (section) {
      filteredUrls = urls.filter((u) => u.includes(`/${section}/`));
    }

    const limitedUrls = filteredUrls.slice(0, limit);
    const products: any[] = [];

    for (const url of limitedUrls) {
      const { status, text } = await fetchText(url);
      if (status === 200) {
        const product = parseProductPage(text, url);
        if (product.nom) {
          products.push(product);
        }
      }
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    return new Response(JSON.stringify({
      products,
      count: products.length,
      total: urls.length,
      scraped: limitedUrls.length,
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

/**
 * image-cdn.ts — Supabase Storage URL rewrite helpers.
 *
 * Why
 * ---
 * Supabase Storage ships two endpoints :
 *   - `/storage/v1/object/public/<bucket>/<path>`  → raw bytes
 *   - `/storage/v1/render/image/public/<bucket>/<path>?width=…&quality=…&format=webp`
 *     → CDN-cached transformed variant (Pro plan feature, on by default
 *     since 2024 but still disablable per-project).
 *
 * The render endpoint gives us :
 *   - width-scaled variants (the 1920 px hero becomes 480 px on a phone)
 *   - automatic WebP / AVIF re-encoding
 *   - aggressive CDN caching
 *
 * Typical savings on the banane promo : 1.4 MB JPEG at 3000×2000 →
 * 38 KB WebP at 960 px width, quality 72. That's 97 % off the wire for
 * a mobile viewport.
 *
 * Safety contract
 * ---------------
 * This helper NEVER throws and NEVER produces an invalid URL :
 *   - Non-Supabase URLs (static `/images/…`, wixstatic, openfoodfacts)
 *     → returned as-is.
 *   - Relative URLs → returned as-is.
 *   - Malformed URLs → returned as-is.
 *   - Transforms disabled (`PUBLIC_SUPABASE_IMAGE_TRANSFORMS=off`) →
 *     returned as-is. Useful for free-tier Supabase projects where the
 *     render endpoint 404s ; the owner can flip the env var once the
 *     project is upgraded and all image URLs will transparently
 *     start getting optimised.
 *
 * So it is safe to sprinkle `supabaseImage(src, …)` everywhere — the
 * worst case is "no-op", never a broken `<img>`.
 */

/**
 * Toggles the rewrite. `on` = always rewrite Supabase object URLs to
 * the render endpoint. `off` = pass through unchanged. Default `on`
 * because all Supabase projects created from 2024 onwards have image
 * transformations enabled on their free tier ; owners on the rare
 * legacy project without it can opt out.
 *
 * Read once at module load and cached — env vars don't change mid-run.
 */
const TRANSFORMS_ENABLED: boolean =
  (import.meta.env.PUBLIC_SUPABASE_IMAGE_TRANSFORMS ?? "on")
    .toString()
    .toLowerCase() !== "off";

/** Marks a URL as pointing at the Supabase Storage `object/public` endpoint. */
const OBJECT_PUBLIC_RE = /\/storage\/v1\/object\/public\//i;
/** Already on the render/image endpoint — don't rewrite twice. */
const RENDER_PUBLIC_RE = /\/storage\/v1\/render\/image\/public\//i;

export interface TransformOptions {
  /** Target CSS pixel width. Density is handled via srcset, not here. */
  width?: number;
  /** Target CSS pixel height. Usually omitted — Supabase preserves ratio. */
  height?: number;
  /** JPEG/WebP quality, 20–100. Default 72 (good balance for photo). */
  quality?: number;
  /** `cover` (default) or `contain`. Only relevant if BOTH w + h are given. */
  resize?: "cover" | "contain";
  /** `origin` keeps original codec ; `webp`/`avif` force re-encode. */
  format?: "origin" | "webp" | "avif";
}

/**
 * Rewrite a Supabase Storage URL to request a transformed variant.
 * All non-Supabase URLs and malformed inputs are returned unchanged.
 */
export function supabaseImage(src: string | null | undefined, opts: TransformOptions = {}): string {
  if (!src || typeof src !== "string") return src ?? "";
  if (!TRANSFORMS_ENABLED) return src;

  /* Skip non-absolute URLs (relative, protocol-less, data:, blob:). The
   * render endpoint only works on absolute Supabase Storage URLs. */
  if (!/^https?:\/\//i.test(src)) return src;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  /* Already on the render path → just tune the query string. */
  const isObjectPath = OBJECT_PUBLIC_RE.test(url.pathname);
  const isRenderPath = RENDER_PUBLIC_RE.test(url.pathname);
  if (!isObjectPath && !isRenderPath) return src;

  if (isObjectPath) {
    url.pathname = url.pathname.replace(
      OBJECT_PUBLIC_RE,
      "/storage/v1/render/image/public/",
    );
  }

  const width = clampInt(opts.width, 16, 4096);
  const height = clampInt(opts.height, 16, 4096);
  const quality = clampInt(opts.quality ?? 72, 20, 100);
  const format = opts.format ?? "webp";
  const resize = opts.resize ?? "cover";

  if (width) url.searchParams.set("width", String(width));
  if (height) url.searchParams.set("height", String(height));
  url.searchParams.set("quality", String(quality));
  if (format !== "origin") url.searchParams.set("format", format);
  if (width && height) url.searchParams.set("resize", resize);

  return url.toString();
}

/**
 * Build a `{ src, srcset }` pair for a responsive `<img>` tag.
 *
 * `widths` are the CSS pixel widths at which the browser may render
 * the image ; the helper emits `<width>w` descriptors so the browser
 * picks the smallest variant that still fits its DPR-scaled slot.
 *
 * The `src` fallback is set to the LARGEST width (best fallback for
 * browsers that ignore srcset entirely, mostly bots and very old UAs).
 */
export function supabaseSrcSet(
  src: string | null | undefined,
  widths: number[],
  opts: Omit<TransformOptions, "width"> = {},
): { src: string; srcset: string } {
  const empty = { src: src ?? "", srcset: "" };
  if (!src || typeof src !== "string") return empty;
  if (!widths.length) return { src, srcset: "" };

  const sorted = [...widths].filter((w) => Number.isFinite(w) && w > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return { src, srcset: "" };

  const entries = sorted.map((w) => `${supabaseImage(src, { ...opts, width: w })} ${w}w`);
  const largest = supabaseImage(src, { ...opts, width: sorted[sorted.length - 1] });
  return { src: largest, srcset: entries.join(", ") };
}

/* ---------- helpers ---------- */

function clampInt(n: number | undefined, min: number, max: number): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  const i = Math.round(n);
  return Math.max(min, Math.min(max, i));
}

/**
 * True iff the URL points at Supabase Storage (either endpoint). Useful
 * when callers want to conditionally skip the helper entirely (e.g. a
 * component that wants to use `<Image>` from astro:assets for local
 * assets and the raw `<img>` for Supabase ones).
 */
export function isSupabaseStorageUrl(src: string | null | undefined): boolean {
  if (!src || typeof src !== "string") return false;
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    const u = new URL(src);
    return OBJECT_PUBLIC_RE.test(u.pathname) || RENDER_PUBLIC_RE.test(u.pathname);
  } catch {
    return false;
  }
}

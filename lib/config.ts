/**
 * Build-time flags. `NEXT_PUBLIC_*` values are inlined by Next.js,
 * so they are safe to read in client components.
 */

/** True for the static GitHub Pages build. It has no API routes, so it uses sample data. */
export const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** Path prefix when the site is served from a sub-path, e.g. `/x-map` on GitHub Pages. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const REPO_URL = "https://github.com/manavhirani/x-map";

/** Prefix a public asset path with the base path (next/link does this itself; plain URLs do not). */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

import type { NextConfig } from "next";

/**
 * Two build targets:
 *
 * - Default (`npm run build`): a normal Next.js server with the API routes.
 * - Static demo (`npm run build:demo`, NEXT_PUBLIC_DEMO_MODE=true): a static
 *   export for GitHub Pages. API routes (`route.ts`) are left out by limiting
 *   page extensions to `.tsx`, and the app uses built-in sample data.
 */
const isStaticDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const nextConfig: NextConfig = isStaticDemo
  ? {
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
      trailingSlash: true,
      images: { unoptimized: true },
      pageExtensions: ["tsx"],
    }
  : {};

export default nextConfig;

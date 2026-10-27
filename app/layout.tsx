import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Public URL of the site, for absolute link-preview URLs.
 * Set NEXT_PUBLIC_SITE_URL, or let Vercel provide its production domain.
 */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://manavhirani.github.io/x-map")
).replace(/\/$/, "");

const TITLE = "X-Map: breaking news on a 3D globe";
const DESCRIPTION =
  "Open-source map of breaking news. Grok finds the stories, the X API adds the conversation, MapLibre GL draws the globe.";
const PREVIEW_IMAGE = {
  url: `${SITE_URL}/screenshots/map-dark.jpg`,
  width: 1600,
  height: 1000,
  alt: "News stories as glowing markers on a dark 3D globe",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "X-Map",
    title: TITLE,
    description: DESCRIPTION,
    images: [PREVIEW_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [PREVIEW_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The app is dark-only.
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X-Map: breaking news on a 3D globe",
  description:
    "Open-source map of breaking news. Grok finds the stories, the X API adds the conversation, MapLibre GL draws the globe.",
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

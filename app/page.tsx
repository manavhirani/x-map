import Link from "next/link";
import { Flame, Globe, Layers, Map as MapIcon, Radio, Sparkles } from "lucide-react";
import { GitHubLogo, XLogo } from "@/components/icons";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { IS_STATIC_DEMO, REPO_URL, withBasePath } from "@/lib/config";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Grok-curated news",
    text: "Grok finds high-impact stories from the last 7 days and streams them in as it goes.",
  },
  {
    icon: XLogo,
    title: "Posts from X",
    text: "Each story shows top posts from the X API, with replies, reposts and likes.",
  },
  {
    icon: Globe,
    title: "3D globe or flat map",
    text: "A WebGL globe with an atmosphere glow, or a classic Mercator map. Switch with one click.",
  },
  {
    icon: Flame,
    title: "Heat and glow layers",
    text: "A density heatmap at world scale, then pulsing markers in category colours as you zoom in.",
  },
  {
    icon: Layers,
    title: "Category filters",
    text: "Filter by Politics, Science, Technology, Sports and more. Chips build from the loaded stories.",
  },
  {
    icon: Radio,
    title: "Works without keys",
    text: "No API keys? The app falls back to built-in sample stories, so you can try it right away.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />

      <main className="relative flex-1 overflow-hidden">
        {/* Soft colour wash behind the hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-20rem] -z-0 mx-auto h-[40rem] max-w-5xl rounded-full bg-gradient-to-tr from-sky-500/25 via-violet-500/20 to-rose-500/25 blur-3xl"
        />

        <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:pt-24">
          {IS_STATIC_DEMO && (
            <p className="mx-auto mb-6 w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              Live demo with sample data
            </p>
          )}
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
            Breaking news on a{" "}
            <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-rose-500 bg-clip-text text-transparent">
              living globe
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            X-Map uses Grok to find the stories that matter, places them on an interactive 3D map, and shows what people
            on X are saying about each one.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/map">
                <MapIcon /> Launch map
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <GitHubLogo /> View on GitHub
              </a>
            </Button>
          </div>

          <Link
            href="/map"
            className="group relative mt-14 block aspect-[8/5] overflow-hidden rounded-2xl border bg-muted shadow-2xl ring-1 ring-black/5 transition-transform hover:-translate-y-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer */}
            <img
              src={withBasePath("/screenshots/map-dark.jpg")}
              alt="X-Map showing news stories as glowing markers on a dark 3D globe, with a story list on the left"
              width={1600}
              height={1000}
              className="w-full"
            />
          </Link>
        </section>

        <section className="relative mx-auto grid max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card/60 p-5 backdrop-blur transition-colors hover:bg-card">
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" />
              </div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Built with Next.js, MapLibre GL, Grok and the X API.
      </footer>
    </div>
  );
}

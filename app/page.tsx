"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, Globe, Navigation, ZoomIn } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-16 px-4 pb-20">
        <div className="text-center space-y-12 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                Explore the World
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Navigate through an interactive, open-source map.
                Discover locations, zoom in, and explore with ease.
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => router.push("/map")}
                size="lg"
                className="px-6"
              >
                <Map className="mr-2 h-4 w-4" />
                Launch Map
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <Card>
              <CardHeader className="text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Open Source</CardTitle>
                <CardDescription>
                  Built with open-source technologies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Navigation className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Interactive Navigation</CardTitle>
                <CardDescription>
                  Pan, zoom, and explore with smooth, responsive controls.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <ZoomIn className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Full Screen Mode</CardTitle>
                <CardDescription>
                  Immersive fullscreen experience for detailed exploration.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

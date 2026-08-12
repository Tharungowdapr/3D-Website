import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Overlay } from "@/components/aurora/Overlay";
import { useScrollProgressDriver } from "@/hooks/useScrollProgress";

const AuroraCanvas = lazy(() =>
  import("@/components/aurora/Scene").then((m) => ({ default: m.AuroraCanvas })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURORA — Go Beyond | Cinematic Spacecraft Launch Experience" },
      {
        name: "description",
        content:
          "Scroll through the assembly, ignition and launch of AURORA Mission 01 — an interactive 3D aerospace experience from hangar to orbit.",
      },
      { property: "og:title", content: "AURORA — Go Beyond" },
      {
        property: "og:description",
        content:
          "An interactive cinematic 3D spacecraft experience: explore components, assemble the vehicle, ignite the engines and reach space.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useScrollProgressDriver();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative bg-background">
      <h1 className="sr-only">AURORA Mission 01 — cinematic spacecraft launch experience</h1>

      <div className="fixed inset-0 z-0">
        {mounted && (
          <Suspense fallback={null}>
            <AuroraCanvas />
          </Suspense>
        )}
      </div>

      <Overlay />

      {/* scroll timeline driver */}
      <div className="pointer-events-none relative z-[1] h-[1800vh]" aria-hidden />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-[6vw] py-7">
        <span className="text-eyebrow text-foreground">AURORA</span>
        <span className="text-eyebrow text-steel">Mission 01 / Orbital</span>
      </header>
    </main>
  );
}

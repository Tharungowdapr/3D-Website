import { useEffect, useRef, useSyncExternalStore } from "react";

/** Global scroll progress store (0..1) shared by DOM overlay + 3D scene. */
let raw = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const scrollStore = {
  get: () => raw,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useScrollProgressDriver() {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (Math.abs(next - raw) > 0.00005) {
        raw = next;
        emit();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

/** Reactive progress for DOM overlays. */
export function useScrollProgress() {
  return useSyncExternalStore(
    scrollStore.subscribe,
    scrollStore.get,
    () => 0,
  );
}

/** Non-reactive ref for the render loop. */
export function useScrollRef() {
  const ref = useRef(0);
  useEffect(() => {
    const unsub = scrollStore.subscribe(() => {
      ref.current = scrollStore.get();
    });
    return () => {
      unsub();
    };
  }, []);
  ref.current = scrollStore.get();
  return ref;
}

export function useMouseParallax() {
  const ref = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ref.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ref.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return ref;
}

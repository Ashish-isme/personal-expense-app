// Small, optional motion (GSAP). Everything here is skipped when the user has
// asked their device to reduce motion.
import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const REDUCED = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED).matches;
}

/**
 * Eases a page's top-level sections in (a short fade and rise, lightly
 * staggered) whenever `key` changes — used on route changes.
 */
export function usePageEnter<T extends HTMLElement>(key: unknown): RefObject<T | null> {
  const ref = useRef<T>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.from(ref.current.children, {
        opacity: 0,
        y: 8,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.04,
        clearProps: "opacity,transform",
      });
    },
    { scope: ref, dependencies: [key] }
  );
  return ref;
}

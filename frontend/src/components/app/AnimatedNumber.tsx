import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
}

/** Counts from the previous value to the new one. Renders the final value directly when motion is reduced. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        shown.current = value;
        el.textContent = format(value);
        return;
      }
      const state = { n: shown.current };
      gsap.to(state, {
        n: value,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => {
          shown.current = state.n;
          el.textContent = format(state.n);
        },
      });
    },
    { dependencies: [value] }
  );

  return (
    // Starts from the last shown value (0 on first render); GSAP takes it from there.
    <span ref={ref} className={className}>
      {format(prefersReducedMotion() ? value : shown.current)}
    </span>
  );
}

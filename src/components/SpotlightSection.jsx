// FILE: src/components/SpotlightSection.jsx
import { useRef } from "react";

export default function SpotlightSection({ className = "", children }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <section ref={ref} onMouseMove={onMove} className={`spotlight ${className}`}>
      {children}
    </section>
  );
}

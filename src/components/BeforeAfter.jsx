import { useState } from "react";

export default function BeforeAfter({
  before = "/images/before.jpg",
  after = "/images/after.jpg",
  height = 320,
}) {
  const [x, setX] = useState(50);

  return (
    <section className="py-8">
      <div className="max-w-screen-xl mx-auto px-4">
        <h2 className="text-xl font-semibold text-white mb-4">Before & After</h2>

        <div
          className="relative w-full overflow-hidden rounded-lg border border-white/10"
          style={{ height }}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setX(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            const r = e.currentTarget.getBoundingClientRect();
            setX(Math.max(0, Math.min(100, ((t.clientX - r.left) / r.width) * 100)));
          }}
        >
          <img src={after} alt="After" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ width: `${x}%`, overflow: "hidden" }}>
            <img src={before} alt="Before" className="w-full h-full object-cover" />
          </div>

          <div className="absolute inset-y-0" style={{ left: `${x}%` }}>
            <div className="h-full w-0.5 bg-emerald-400 shadow-[0_0_0_2px_rgba(0,0,0,.4)]" />
            <div className="-translate-x-1/2 absolute top-1/2 -mt-4 left-0 bg-emerald-500 text-white text-xs px-2 py-1 rounded">
              Drag
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

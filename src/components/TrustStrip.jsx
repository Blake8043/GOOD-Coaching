export default function TrustStrip() {
  const items = [
    { label: "Licensed & Insured", sub: "TECL ######" },
    { label: "Same-Day Service", sub: "Call before 2pm" },
    { label: "Financing Available", sub: "On approved credit" },
  ];
  return (
    <section className="py-4 border-y border-white/10 bg-black/40">
      <div className="max-w-screen-xl mx-auto px-4 grid gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 text-sm">
            <div className="h-8 w-8 rounded-md bg-emerald-600/20 border border-emerald-500/30" />
            <div>
              <div className="font-semibold text-white">{it.label}</div>
              <div className="text-white/70">{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

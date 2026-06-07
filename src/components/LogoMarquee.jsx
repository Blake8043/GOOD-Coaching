export default function LogoMarquee() {
  const logos = [
    "/logos/visa.svg",
    "/logos/mastercard.svg",
    "/logos/amex.svg",
    "/logos/financing.svg",
    "/logos/angislist.svg",
    "/logos/txdot.svg",
  ];
  return (
    <section className="py-6 bg-black/30">
      <div className="max-w-screen-xl mx-auto px-4 overflow-hidden">
        <div className="flex gap-10 animate-[marquee_30s_linear_infinite]">
          {[...logos, ...logos].map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-8 opacity-75 hover:opacity-100 transition"
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </section>
  );
}

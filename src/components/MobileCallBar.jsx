import { Link } from "react-router-dom";

export default function MobileCallBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="mx-3 mb-3 rounded-2xl bg-emerald-600 text-white shadow-lg flex overflow-hidden">
        <a href="tel:2812520777" className="flex-1 py-3 text-center font-semibold">Call Now</a>
        <Link to="/contact" className="flex-1 py-3 text-center bg-emerald-700/40 border-l border-white/20">Request Quote</Link>
      </div>
    </div>
  );
}

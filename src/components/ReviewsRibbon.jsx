import { FaStar } from "react-icons/fa";

export default function ReviewsRibbon() {
  return (
    <div className="py-4 bg-black/40 border-y border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-200">
        <span className="inline-flex items-center gap-2">
          <FaStar className="text-amber-400" /><FaStar className="text-amber-400" />
          <FaStar className="text-amber-400" /><FaStar className="text-amber-400" />
          <FaStar className="text-amber-400" /> 4.9 average (320+ reviews)
        </span>
        <span className="opacity-50">•</span>
        <span>BBB Accredited • Licensed & Insured • Same-Day Service</span>
      </div>
    </div>
  );
}

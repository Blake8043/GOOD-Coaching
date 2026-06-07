import { Link } from "react-router-dom";

export default function BrandLogo({
  className = "",
  imageClassName = "",
  compact = false,
  to = "/",
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center rounded-2xl bg-[#073d2f] px-5 py-2.5 shadow-lg shadow-[#12372a]/20 ring-1 ring-white/25 ${className}`}
      aria-label="GOOD Coaching home"
    >
      <img
        src="/brand/good_coaching_logo.png?v=real-logo-box"
        alt="GOOD Coaching"
        className={`w-auto object-contain ${compact ? "h-9" : "h-12"} ${imageClassName}`}
      />
    </Link>
  );
}
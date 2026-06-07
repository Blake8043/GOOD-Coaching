// FILE: src/components/FancyCard.jsx
export default function FancyCard({
  variant = "glow",     // "glow" | "sheen" | "grid" | "plain"
  tilt = true,
  className = "",
  children,
}) {
  const skin =
    variant === "glow" ? "card-pro--glow" :
    variant === "sheen" ? "card-pro--sheen" :
    variant === "grid" ? "card-pro--grid" :
    "card-pro";

  const card = <div className={`${skin} ${className}`}>{children}</div>;
  if (!tilt) return card;

  return (
    <div className="tilt">
      <div className="tilt-inner">{card}</div>
    </div>
  );
}

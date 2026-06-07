import PrimaryButton from "./PrimaryButton";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  PhoneCall,
  CreditCard,
  Wrench,
  Users,
  MessageCircle,
} from "lucide-react";

export default function ButtonBanner() {
  const scrollRef = useRef();
  const [scrolled, setScrolled] = useState(false);

  // Track page scroll to shrink banner
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Horizontal scroll with mouse wheel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const buttons = [
    { label: "Home", href: "/", icon: Home },
    { label: "Book Service", href: "/contact", icon: PhoneCall },
    { label: "Pricing Info", href: "/payments", icon: CreditCard },
    { label: "Services", href: "/services", icon: Wrench },
    { label: "Testimonials", href: "/testimonials", icon: Users },
    { label: "FAQ", href: "/faq", icon: MessageCircle },
  ];

  return (
    <div
      className={`sticky top-0 z-40 backdrop-blur-sm shadow-md border-b border-gray-200 transition-all duration-300 ${
        scrolled ? "bg-emerald-700/95" : "bg-[#fff8e7]/90"
      }`}
    >
      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto px-6 transition-all duration-300 ${
          scrolled ? "py-2" : "py-3"
        } no-scrollbar`}
      >
        {buttons.map((btn, i) => {
          const Icon = btn.icon;
          return (
            <motion.div
              key={i}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <PrimaryButton href={btn.href}>
                <Icon size={18} />
                {btn.label}
              </PrimaryButton>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

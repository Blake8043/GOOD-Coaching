import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const testimonials = [
  { name: "John D.", text: "The video review made my next practice session much more focused." },
  { name: "Sarah L.", text: "I loved getting clear notes from a coach without needing to schedule around travel." },
  { name: "Carlos M.", text: "The strategy feedback helped me understand what to change in doubles." },
];

export default function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const active = testimonials[index];
  const next = () => setIndex((current) => (current + 1) % testimonials.length);
  const previous = () => setIndex((current) => (current - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % testimonials.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-4xl py-20">
      <div className="relative rounded-xl">
        <motion.div
          key={active.name}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-xl border border-gray-700 bg-neutral-900 p-8 text-center"
        >
          <p className="mb-6 text-gray-300 italic">&quot;{active.text}&quot;</p>
          <p className="font-bold text-green-400">- {active.name}</p>
        </motion.div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" onClick={previous} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/80 text-[#12372a]" aria-label="Previous testimonial">
            <FaChevronLeft />
          </button>
          {testimonials.map((item, itemIndex) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`h-2.5 w-2.5 rounded-full ${itemIndex === index ? "bg-[#c6ff4a]" : "bg-white/35"}`}
              aria-label={`Show testimonial ${itemIndex + 1}`}
              aria-current={itemIndex === index ? "true" : undefined}
            />
          ))}
          <button type="button" onClick={next} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/80 text-[#12372a]" aria-label="Next testimonial">
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

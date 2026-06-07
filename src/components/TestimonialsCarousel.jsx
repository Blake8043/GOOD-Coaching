import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { motion } from "framer-motion";

export default function TestimonialsCarousel() {
  const testimonials = [
    { name: "John D.", text: "The video review made my next practice session much more focused." },
    { name: "Sarah L.", text: "I loved getting clear notes from a coach without needing to schedule around travel." },
    { name: "Carlos M.", text: "The strategy feedback helped me understand what to change in doubles." },
  ];

  return (
    <div className="mx-auto max-w-4xl py-20">
      <Swiper modules={[Pagination, Autoplay]} spaceBetween={30} slidesPerView={1} pagination={{ clickable: true }} autoplay={{ delay: 4000 }} className="rounded-xl">
        {testimonials.map((t, i) => (
          <SwiperSlide key={i}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="rounded-xl border border-gray-700 bg-neutral-900 p-8 text-center">
              <p className="mb-6 text-gray-300 italic">&quot;{t.text}&quot;</p>
              <p className="font-bold text-green-400">- {t.name}</p>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

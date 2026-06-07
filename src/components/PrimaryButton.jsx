import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function PrimaryButton({ href = "#", children }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={href}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-semibold shadow-lg transition"
      >
        {children}
      </Link>
    </motion.div>
  );
}

// FILE: src/pages/DashboardUser.jsx
import { Link } from "react-router-dom";

export default function DashboardUser() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 px-6">
      <div className="max-w-4xl mx-auto bg-gray-900/80 border border-white/10 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">My Account</h1>
        <p className="text-gray-300 mb-6">
          Your new dashboard lives here:
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard" className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500">
            Open Dashboard
          </Link>
          <Link to="/dashboard/orders" className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            My Orders
          </Link>
          <Link to="/dashboard/quotes" className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            My Quotes
          </Link>
        </div>
      </div>
    </div>
  );
}

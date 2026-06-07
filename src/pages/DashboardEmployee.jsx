// FILE: src/pages/DashboardEmployee.jsx
import { Link } from "react-router-dom";

export default function DashboardEmployee() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Employee Console</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">Orders</h2>
            <p className="text-gray-400 mb-4">View and update order statuses.</p>
            <Link
              to="/admin/orders"
              className="inline-block px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500"
            >
              Manage Orders
            </Link>
          </div>

          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">Quotes</h2>
            <p className="text-gray-400 mb-4">Review quote requests, approve/reject, set estimates.</p>
            <Link
              to="/admin/quotes"
              className="inline-block px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500"
            >
              Manage Quotes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

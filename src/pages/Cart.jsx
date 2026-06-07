// FILE: src/pages/Cart.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const KEY = "bpj_cart";

const readCart = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
};
const writeCart = (arr) => {
  localStorage.setItem(KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event("bpj_cart_update"));
};

export default function Cart() {
  const nav = useNavigate();
  const [items, setItems] = useState(readCart());

  useEffect(() => {
    // If another tab updates the cart
    const onStorage = (e) => {
      if (e.key === KEY) setItems(readCart());
    };
    const onCart = () => setItems(readCart());
    window.addEventListener("storage", onStorage);
    window.addEventListener("bpj_cart_update", onCart);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("bpj_cart_update", onCart); };
  }, []);

  const updateQty = (id, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    const next = items.map((it) => (it.id === id ? { ...it, qty: q } : it));
    setItems(next); writeCart(next);
  };

  const removeItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next); writeCart(next);
  };

  const clearCart = () => {
    setItems([]); writeCart([]);
  };

  const enriched = useMemo(
    () => items.map((it) => ({ ...it, qty: it.qty ?? 1, line: 0 })),
    [items]
  );

  const subtotal = enriched.reduce((s, it) => s + it.line, 0);
  const tax = Math.round(subtotal * 0.0825 * 100) / 100; // sample tax 8.25%
  const total = Math.round((subtotal + tax) * 100) / 100;

  return (
    <div className="min-h-screen bg-black text-white pt-32 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

        {enriched.length === 0 ? (
          <div className="bg-gray-900 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-300 mb-4">Your cart is empty.</p>
            <Link to="/marketplace" className="inline-block bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {enriched.map((it) => (
                <div key={it.id} className="flex items-center gap-4 bg-gray-900 border border-white/10 rounded-xl p-4">
                  <div className="h-20 w-20 bg-gray-800 rounded-lg grid place-items-center text-gray-500 text-xs">
                    Image
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-gray-400 text-sm capitalize">{it.tag || "part"}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <label className="text-sm text-gray-400">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => updateQty(it.id, e.target.value)}
                        className="w-20 bg-gray-800 border border-white/10 rounded px-2 py-1"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-500">View plan price or request quote</div>
                    <div className="text-sm text-gray-400">Line: ${it.line.toFixed(2)}</div>
                    <button onClick={() => removeItem(it.id)} className="mt-2 text-red-300 hover:text-red-400 text-sm">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={clearCart} className="text-red-300 hover:text-red-400 text-sm">
                Clear cart
              </button>
            </div>

            {/* Summary */}
            <div className="bg-gray-900 border border-white/10 rounded-xl p-6 h-fit">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300 mt-1">
                <span>Estimated Tax</span><span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 my-3" />
              <div className="flex justify-between text-white font-bold text-lg">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>

              <button
                onClick={() => nav("/payments")}
                className="mt-6 w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg"
              >
                Proceed to Checkout
              </button>
              <Link to="/marketplace" className="block text-center text-gray-300 hover:text-white mt-3">
                Continue shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

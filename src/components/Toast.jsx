import { createContext, useContext, useCallback, useState, useEffect } from "react";

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

/** Minimal toast provider */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, type = "success", ttl = 3000) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-[100]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg border ${
              t.type === "error"
                ? "bg-red-600/90 border-red-400 text-white"
                : "bg-green-600/90 border-green-400 text-white"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

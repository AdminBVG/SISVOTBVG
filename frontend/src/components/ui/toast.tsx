import React, { createContext, useContext, useState } from 'react';

interface Toast {
  id: number;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  add: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = (message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ toasts, add }}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="toast show text-bg-dark border-0 shadow-sm mb-2">
            <div className="toast-body">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx.add;
};

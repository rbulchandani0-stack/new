import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { feedbackService, ToastItem } from '../services/feedbackService';

export const GlobalToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = feedbackService.subscribeToasts((currentToasts) => {
      setToasts([...currentToasts]);
    });
    return () => unsub();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => {
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
        let borderColor = 'border-blue-500/30';
        let bgColor = 'bg-[#181818]';

        if (toast.type === 'success') {
          icon = <CheckCircle className="w-5 h-5 text-[#00C853] shrink-0" />;
          borderColor = 'border-[#00C853]/40';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-[#FF3B30] shrink-0" />;
          borderColor = 'border-[#FF3B30]/40';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          borderColor = 'border-amber-500/40';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md ${bgColor} ${borderColor} text-white`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              {toast.title && <div className="text-xs font-bold text-white mb-0.5">{toast.title}</div>}
              <div className="text-xs text-[#CCCCCC] leading-relaxed break-words">{toast.message}</div>
            </div>
            <button
              onClick={() => feedbackService.dismissToast(toast.id)}
              className="text-[#8A8A8A] hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

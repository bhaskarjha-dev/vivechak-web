import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { subscribeToast } from '@/shared/lib/toast';

export const ToastHost: React.FC = () => {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const timerRef = useRef<number | null>(null);
  const idRef = useRef(1);

  useEffect(() => {
    const unsub = subscribeToast((text) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setToast({ id: idRef.current++, text });
      timerRef.current = window.setTimeout(() => setToast(null), 2100);
    });
    return () => {
      unsub();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="toast-host" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast-pill mono"
            initial={{ opacity: 0, y: -14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 440, damping: 30 }}
          >
            <span className="toast-check" aria-hidden="true">
              <Check size={12} strokeWidth={3} />
            </span>
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

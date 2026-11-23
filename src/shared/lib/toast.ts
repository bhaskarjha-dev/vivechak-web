type ToastListener = (msg: string) => void;

const listeners = new Set<ToastListener>();

export function showToast(message: string): void {
  listeners.forEach((fn) => fn(message));
}

export function subscribeToast(fn: ToastListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

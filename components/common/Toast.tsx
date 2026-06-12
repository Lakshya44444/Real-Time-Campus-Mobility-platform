"use client";

import { useState, useEffect } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

// Store for managing toasts globally
const toastStore: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

export function showToast(
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
  duration = 3000
) {
  const id = Math.random().toString(36).substring(7);
  const toast: Toast = { id, message, type, duration };

  toastStore.push(toast);
  listeners.forEach((listener) => listener([...toastStore]));

  if (duration > 0) {
    setTimeout(() => {
      const index = toastStore.findIndex((t) => t.id === id);
      if (index > -1) {
        toastStore.splice(index, 1);
        listeners.forEach((listener) => listener([...toastStore]));
      }
    }, duration);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg text-white shadow-lg animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-green-500"
              : toast.type === "error"
              ? "bg-red-500"
              : toast.type === "warning"
              ? "bg-yellow-500"
              : "bg-blue-500"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

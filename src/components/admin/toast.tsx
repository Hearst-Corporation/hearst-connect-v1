'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
}

type ToastContextValue = {
  showToast: (message: string, options?: { type?: ToastType }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (ctx === null) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<readonly Toast[]>([])

  const showToast = useCallback((message: string, options?: { type?: ToastType }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const toast: Toast = { id, message, type: options?.type ?? 'info' }
    setToasts((prev) => [...prev, toast])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
                toast.type === 'success'
                  ? 'bg-success-400 text-success-ink ring-success-500'
                  : toast.type === 'error'
                    ? 'bg-danger-400 text-danger-ink ring-danger-500'
                    : 'bg-accent-400 text-accent-ink ring-accent-500'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

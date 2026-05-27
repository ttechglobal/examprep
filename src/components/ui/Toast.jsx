'use client'

import { useEffect, useState } from 'react'

export function Toast({ message, type = 'warning', onDismiss }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 5000)
    return () => clearTimeout(t)
  }, [message])

  if (!visible) return null

  const styles = {
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    urgent:  'bg-red-50 border-red-400 text-red-800',
    success: 'bg-green-50 border-green-300 text-green-800',
    info:    'bg-indigo-50 border-indigo-300 text-indigo-800',
  }

  const icons = {
    warning: '⏳',
    urgent:  '🚨',
    success: '✓',
    info:    'ℹ',
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${styles[type]}`}>
      <span>{icons[type]}</span>
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); onDismiss?.() }}
        className="ml-auto text-xs opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  )
}
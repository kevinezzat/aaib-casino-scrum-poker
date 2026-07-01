import React from 'react'

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-md md:p-lg"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="bg-surface-container border border-outline-variant rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in max-w-sm w-full p-lg md:p-xl"
        style={{ animationDuration: '0.22s' }}
      >
        <h2 className="font-headline-md text-on-surface mb-xs">{title}</h2>
        <p className="font-body-md text-on-surface-variant mb-xl">{message}</p>
        
        <div className="flex justify-end gap-sm">
          <button
            onClick={onCancel}
            className="px-md py-sm rounded-xl font-label-md uppercase hover:bg-surface-container-highest text-on-surface transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-md py-sm rounded-xl font-label-md uppercase transition-colors ${isDestructive ? 'bg-error text-on-error hover:bg-error/90' : 'bg-primary text-on-primary hover:bg-surface-tint'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

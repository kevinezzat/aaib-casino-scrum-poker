import React, { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * QrPopover — floating card anchored below the nav bar QR button.
 * Closes on backdrop click or the × button.
 *
 * @param {boolean}  open          — controlled visibility
 * @param {string}   sessionCode   — room code used to build the join URL
 * @param {Function} onClose       — called when user dismisses the popover
 */
export default function QrPopover({ open, sessionCode, onClose }) {
  const cardRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !sessionCode) return null

  const joinUrl = `${window.location.origin}/join/${sessionCode}`

  return (
    /* Transparent full-screen layer so outside clicks are detected */
    <div className="fixed inset-0 z-[150] pointer-events-none">
      {/* Card — top-right, below the 48px nav */}
      <div
        ref={cardRef}
        className="pointer-events-auto absolute top-[56px] right-sm animate-scale-in"
        style={{ animationDuration: '0.18s' }}
      >
        <div className="bg-surface-container border border-outline-variant rounded-2xl shadow-2xl p-md flex flex-col items-center gap-sm min-w-[220px]">
          {/* Header */}
          <div className="flex items-center justify-between w-full">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              Scan to Join
            </span>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface transition-colors p-[2px] rounded"
              aria-label="Close QR popover"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-xl p-sm shadow-inner">
            <QRCodeSVG
              value={joinUrl}
              size={160}
              bgColor="#ffffff"
              fgColor="#1a1a2e"
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Room code badge */}
          <div className="flex flex-col items-center gap-[2px]">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Room code
            </span>
            <span className="font-mono font-bold text-on-surface tracking-[0.25em] text-[18px]">
              {sessionCode}
            </span>
          </div>

          {/* Copyable URL */}
          <button
            className="w-full flex items-center gap-xs bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-lg px-sm py-xs transition-colors group"
            title="Click to copy join link"
            onClick={() => navigator.clipboard?.writeText(joinUrl)}
          >
            <span className="material-symbols-outlined text-[14px] text-secondary group-hover:scale-110 transition-transform">
              link
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate text-left flex-1">
              {joinUrl}
            </span>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-secondary transition-colors">
              content_copy
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

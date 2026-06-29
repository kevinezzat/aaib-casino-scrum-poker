import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * StatusPill — floating bottom-left status indicator on the desktop table view.
 * HTML ref: lines 572–582.
 * Now includes an inline QR popover on the "Scan to join" button.
 */
export default function StatusPill({ voteCount, totalCount, sessionCode }) {
  const [showQr, setShowQr] = useState(false)
  const joinUrl = sessionCode
    ? `${window.location.origin}/join/${sessionCode}`
    : null

  return (
    <div
      id="status-pill"
      className="status-pill absolute bottom-md left-md z-40 animate-slide-up"
    >
      {/* The pill itself */}
      <div className="bg-surface-container/90 border border-outline-variant rounded-full flex items-center gap-md px-sm py-xs">
        <div className="flex items-center gap-xs">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="font-body-sm text-body-sm text-on-surface font-medium" id="vote-count">
            {voteCount} / {totalCount} voted
          </span>
        </div>
        <div className="w-[1px] h-4 bg-outline-variant" />
        <button
          className="flex items-center gap-xs text-secondary hover:text-secondary-fixed-dim transition-colors font-medium group"
          onClick={() => setShowQr((v) => !v)}
          title="Show QR code to join"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
            qr_code_2
          </span>
          <span className="font-label-sm text-label-sm uppercase">Scan to join</span>
        </button>
      </div>

      {/* Inline QR popover — floats above the pill */}
      {showQr && joinUrl && (
        <div
          className="absolute bottom-[calc(100%+8px)] left-0 animate-scale-in"
          style={{ animationDuration: '0.15s', transformOrigin: 'bottom left' }}
        >
          <div className="bg-surface-container border border-outline-variant rounded-2xl shadow-2xl p-md flex flex-col items-center gap-sm min-w-[200px]">
            {/* Header */}
            <div className="flex items-center justify-between w-full">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Scan to Join
              </span>
              <button
                onClick={() => setShowQr(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-[2px] rounded"
                aria-label="Close QR"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* QR */}
            <div className="bg-white rounded-lg p-xs shadow-inner">
              <QRCodeSVG
                value={joinUrl}
                size={140}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Room code */}
            <span className="font-mono font-bold text-on-surface tracking-[0.2em] text-[16px]">
              {sessionCode}
            </span>

            {/* Copy link */}
            <button
              className="w-full flex items-center gap-xs bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-lg px-sm py-xs transition-colors group"
              title="Copy join link"
              onClick={() => navigator.clipboard?.writeText(joinUrl)}
            >
              <span className="material-symbols-outlined text-[13px] text-secondary">link</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate flex-1 text-left">
                {joinUrl}
              </span>
              <span className="material-symbols-outlined text-[13px] text-on-surface-variant group-hover:text-secondary transition-colors">
                content_copy
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

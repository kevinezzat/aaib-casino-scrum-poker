import React from 'react'

/**
 * StatusPill — floating bottom-left status indicator on the desktop table view.
 * HTML ref: lines 572–582.
 */
export default function StatusPill({ voteCount, totalCount, onQrClick }) {
  return (
    <div
      id="status-pill"
      className="status-pill absolute bottom-md left-md bg-surface-container/90 border border-outline-variant rounded-full flex items-center gap-md px-sm py-xs z-40 animate-slide-up"
    >
      <div className="flex items-center gap-xs">
        <span className="w-2 h-2 rounded-full bg-secondary" />
        <span className="font-body-sm text-body-sm text-on-surface font-medium" id="vote-count">
          {voteCount} / {totalCount} voted
        </span>
      </div>
      <div className="w-[1px] h-4 bg-outline-variant" />
      <button
        className="flex items-center gap-xs text-secondary hover:text-secondary-fixed-dim transition-colors font-medium group"
        onClick={onQrClick}
      >
        <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
          qr_code_2
        </span>
        <span className="font-label-sm text-label-sm uppercase">Scan to join</span>
      </button>
    </div>
  )
}

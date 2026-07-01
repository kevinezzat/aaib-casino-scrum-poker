import React from 'react'

/**
 * CenterPot — issue card, 3D chip stack, and reveal/new-round button.
 * Enhanced chip stack with depth layers and spring animation.
 */
export default function CenterPot({ issueKey, issueTitle, revealed, onReveal, isHost }) {
  return (
    <div className="flex flex-col items-center gap-sm z-10">
      {/* Issue card */}
      {issueKey && (
        <div
          id="issue-card"
          className="bg-surface-container-high/95 border border-outline-variant rounded-lg p-sm min-w-[220px] text-center animate-scale-in backdrop-blur-sm"
          style={{ animationDelay: '0.4s' }}
        >
          <span className="font-body-sm text-body-sm text-on-surface block mb-xs font-bold">
            {issueKey}
          </span>
          <span className="font-label-sm text-label-sm text-secondary block font-semibold uppercase tracking-wide">
            {issueTitle}
          </span>
        </div>
      )}

      {/* Enhanced 3D chip stack */}
      <div
        className="chip-stack relative w-16 h-16 flex items-center justify-center cursor-pointer"
        title="Votes collected"
      >
        {/* Bottom shadow layer */}
        <div className="absolute w-10 h-10 rounded-full bg-black/20 blur-sm top-5 left-5" />
        {/* Chip 1 — back */}
        <div className="absolute w-10 h-10 rounded-full border-4 border-secondary-container bg-secondary-fixed-dim top-0 left-0 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.15),inset_0_2px_4px_rgba(255,255,255,0.3)] transition-all" />
        {/* Chip 2 — mid */}
        <div className="absolute w-10 h-10 rounded-full border-4 border-secondary-container bg-secondary-fixed-dim top-2 left-2 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.15),inset_0_2px_4px_rgba(255,255,255,0.3)] transition-all" />
        {/* Chip 3 — front with question mark */}
        <div className="absolute w-10 h-10 rounded-full border-4 border-secondary-container bg-secondary-fixed-dim top-4 left-4 flex items-center justify-center text-on-secondary-container font-bold text-lg shadow-[inset_0_-3px_6px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all">
          ?
        </div>
      </div>

      {/* Reveal / New Round button — host only */}
      {isHost && (
        <button
          id="btn-reveal"
          className={`reveal-btn px-md py-sm rounded-lg font-label-md text-label-md uppercase mt-xs font-bold tracking-wider ${
            revealed
              ? 'bg-secondary text-on-secondary'
              : 'bg-primary-container text-on-primary-container animate-reveal-glow'
          }`}
          onClick={onReveal}
        >
          {revealed ? 'New Round' : 'Reveal all chips'}
        </button>
      )}
    </div>
  )
}

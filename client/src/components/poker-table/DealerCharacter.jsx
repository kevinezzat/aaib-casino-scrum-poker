import React from 'react'

// SVG served from public/ — no bundler processing needed
const CROUPIER_SVG = '/croupier.svg'

/**
 * DealerCharacter — Scrum Master / Dealer avatar floating above the table.
 * Uses the croupier SVG asset. The black paths are inverted + warm-tinted
 * via CSS filter so they contrast against the dark green felt.
 */
export default function DealerCharacter({ name }) {
  return (
    <div className="absolute -top-[80px] left-1/2 -translate-x-1/2">
      <div
        className="flex flex-col items-center animate-float"
        style={{ animationDelay: '0.3s' }}
      >
      {/* Croupier figure */}
      <img
        src={CROUPIER_SVG}
        alt="Dealer"
        width={72}
        height={72}
        style={{
          // black SVG → warm cream/gold that pops on dark green felt
          opacity: 0.95,
          display: 'block',
        }}
      />

      {/* Drop shadow ellipse */}
      <div className="w-10 h-2 bg-black/15 rounded-full blur-sm -mt-1" />

      {/* Name badge */}
      <div className="bg-surface-container-high border border-outline-variant px-xs py-[3px] rounded mt-1 whitespace-nowrap shadow-sm">
        <span className="font-label-sm text-[10px] text-on-surface uppercase font-bold tracking-wider">
          {name ? `${name} · Dealer` : 'Scrum Master · Dealer'}
        </span>
      </div>
      </div>
    </div>
  )
}

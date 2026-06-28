import React from 'react'

/**
 * DealerCharacter — enhanced Scrum Master / Dealer avatar floating above the table.
 * Enhanced from reference: tuxedo details, bow-tie, croupier visor, drop shadow.
 */
export default function DealerCharacter() {
  return (
    <div
      className="absolute -top-[64px] left-1/2 -translate-x-1/2 flex flex-col items-center animate-float"
      style={{ animationDelay: '0.3s' }}
    >
      {/* Head */}
      <div className="w-12 h-12 rounded-full border-2 border-outline-variant bg-surface-bright flex items-center justify-center overflow-hidden relative shadow-md">
        {/* Croupier visor stripe */}
        <div className="absolute top-0 w-full h-[30%] bg-inverse-surface border-b-2 border-primary-container flex items-end justify-center pb-[2px]">
          <div className="w-6 h-1 rounded-sm bg-primary-fixed-dim opacity-60" />
        </div>
        {/* Face */}
        <div className="w-5 h-5 rounded-full bg-on-surface mt-3 shadow-inner" />
      </div>

      {/* Tuxedo body */}
      <div
        className="w-[56px] h-[34px] rounded-t-xl border-2 border-outline-variant bg-inverse-surface border-b-0 flex justify-center items-start pt-1 relative -mt-1 shadow-md"
      >
        {/* Lapels */}
        <div className="absolute inset-x-2 top-1 flex justify-between">
          <div className="w-4 h-5 bg-surface-container-low rounded-br-lg" />
          <div className="w-4 h-5 bg-surface-container-low rounded-bl-lg" />
        </div>
        {/* Bow tie */}
        <div className="relative z-10 flex items-center gap-[2px] mt-1">
          <div className="w-[6px] h-[4px] bg-primary-container rounded-sm" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
          <div className="w-[3px] h-[3px] rounded-full bg-primary-container" />
          <div className="w-[6px] h-[4px] bg-primary-container rounded-sm" style={{ clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }} />
        </div>
        {/* Shirt stud */}
        <div className="w-1 h-1 rounded-full bg-primary-fixed absolute bottom-2 left-1/2 -translate-x-1/2" />
      </div>

      {/* Drop shadow ellipse */}
      <div className="w-10 h-2 bg-black/10 rounded-full blur-sm -mt-1" />

      {/* Name badge */}
      <div className="bg-surface-container-high border border-outline-variant px-xs py-[3px] rounded absolute -bottom-6 whitespace-nowrap shadow-sm">
        <span className="font-label-sm text-[10px] text-on-surface uppercase font-bold tracking-wider">
          Scrum Master · Dealer
        </span>
      </div>
    </div>
  )
}

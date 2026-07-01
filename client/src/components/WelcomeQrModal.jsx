import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * WelcomeQrModal — landscape two-column overlay shown to the host on first join.
 * Left: QR code. Right: headline, room code, copy URL, Start Session CTA.
 * Does NOT close on outside click.
 */
export default function WelcomeQrModal({ open, sessionCode, hostName, onClose, isBlank }) {
  const [copied, setCopied] = useState(false)

  if (!open || !sessionCode) return null

  const joinUrl = `${window.location.origin}/join/${sessionCode}${isBlank ? '?blank=true' : ''}`

  const handleCopy = () => {
    navigator.clipboard?.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    /* Dark backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-lg"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
    >
      {/* Landscape card — flex-row */}
      <div
        className="bg-surface-container border border-outline-variant rounded-3xl shadow-2xl flex flex-row overflow-hidden animate-scale-in relative"
        style={{ animationDuration: '0.22s', maxWidth: '780px', width: '100%', maxHeight: '90vh' }}
      >
        {/* ── Left: QR panel ── */}
        <div
          className="flex flex-col items-center justify-center gap-md p-xl shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, #1a2e1a 0%, #003d28 100%)', minWidth: '260px' }}
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 40%, rgba(107,248,187,0.12) 0%, transparent 70%)' }}
          />

          {/* QR code */}
          <div className="relative z-10 bg-white rounded-2xl p-sm shadow-xl">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#1a1a2e"
              level="M"
              includeMargin={false}
            />
          </div>

          {/* "Scan to join" label */}
          <span className="relative z-10 font-label-sm text-label-sm text-white/70 uppercase tracking-widest text-center">
            Scan to join
          </span>
        </div>

        {/* ── Right: Info + actions ── */}
        <div className="flex flex-col justify-center gap-md p-xl flex-1 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-40 h-40 bg-secondary/8 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-sm mb-sm">
              <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shadow-md shrink-0">
                <span
                  className="material-symbols-outlined text-on-primary-container text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  casino
                </span>
              </div>
              <div>
                <h1 className="font-headline-md text-on-surface leading-tight">
                  Your room is ready!
                </h1>
                <p className="font-body-sm text-on-surface-variant">
                  Welcome,{' '}
                  <span className="text-secondary font-semibold">{hostName}</span>
                </p>
              </div>
            </div>
            <p className="font-body-sm text-on-surface-variant">
              Share the code or QR with your team to let them join.
            </p>
          </div>

          {/* Room code */}
          <div className="relative z-10 flex flex-col gap-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Room Code
            </span>
            <span className="font-mono font-black text-on-surface tracking-[0.3em] text-[26px] bg-surface-container-high px-md py-sm rounded-xl border border-outline-variant inline-block w-fit">
              {sessionCode}
            </span>
          </div>

          {/* Copy URL */}
          <button
            className="relative z-10 flex items-center gap-sm bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-xl px-sm py-xs transition-colors group w-full"
            onClick={handleCopy}
            title="Copy join link"
          >
            <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">link</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate flex-1 text-left">
              {joinUrl}
            </span>
            <span
              className={`material-symbols-outlined text-[15px] shrink-0 transition-colors ${copied ? 'text-secondary' : 'text-on-surface-variant group-hover:text-secondary'
                }`}
            >
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>

          {/* CTA */}
          <button
            onClick={onClose}
            className="relative z-10 bg-primary hover:bg-surface-tint text-on-primary font-label-md py-sm rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center gap-xs font-bold w-full"
          >
            Start Session
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )
}


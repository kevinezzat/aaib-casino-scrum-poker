import React from 'react'

/**
 * TopNavBar — fixed top bar across desktop and mobile.
 * HTML ref: lines 523–558 of design-reference/index.html
 */
export default function TopNavBar({ issueKey, timerSeconds, onTimerClick, onQrClick, isHost, onLeaveAction, onSummaryClick }) {
  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0')
  const secs = (timerSeconds % 60).toString().padStart(2, '0')
  const timerWarning = timerSeconds <= 30

  return (
    <nav
      id="top-nav"
      className="bg-surface-container-low fixed top-0 w-full h-[48px] border-b border-outline-variant flex justify-between items-center px-sm z-50 animate-fade-in"
    >
      <div className="flex items-center gap-md">
        {/* Brand */}
        <div className="flex items-center gap-xs">
          <span
            className="material-symbols-outlined text-primary text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            casino
          </span>
          <span className="font-headline-md text-[16px] md:text-[18px] font-bold text-primary tracking-tight">
            AAIB Scrum Poker
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex gap-xs ml-sm">
          <a
            id="nav-session"
            className="nav-link active text-primary font-medium px-base py-xs flex items-center h-full text-body-sm transition-colors"
            href="#"
          >
            Session Details
          </a>
          <a
            id="nav-summary"
            className="nav-link text-on-surface-variant font-medium hover:text-on-surface px-base py-xs flex items-center h-full text-body-sm transition-colors cursor-pointer"
            onClick={onSummaryClick}
          >
            Summary
          </a>
        </div>
      </div>

      <div className="flex items-center gap-xs md:gap-sm">
        {/* Live Badge */}
        <div className="flex items-center gap-xs md:order-2">
          <span className="live-dot w-2 h-2 rounded-full bg-secondary" />
          <span className="font-label-sm text-label-sm text-on-surface uppercase font-semibold hidden md:inline">
            Live
          </span>
        </div>

        {/* Issue + Timer Pill */}
        <div className="flex items-center gap-xs bg-surface-container-high px-xs md:px-sm py-xs rounded-full border border-outline-variant md:order-1">
          {issueKey && (
            <>
              <span className="font-body-sm text-body-sm text-on-surface font-semibold text-[12px] md:text-[14px]">
                {issueKey}
              </span>
              <span className="w-[1px] h-4 bg-outline-variant" />
            </>
          )}
          <span
            id="session-timer"
            className={`font-body-sm text-body-sm font-semibold timer-text text-[12px] md:text-[14px] ${
              timerWarning ? 'text-error' : 'text-secondary'
            }`}
          >
            {mins}:{secs}
          </span>
        </div>

        {/* Action Buttons (desktop only) */}
        <div className="flex gap-xs md:order-3">
          <button
            id="btn-timer"
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all p-base rounded-lg hidden md:block"
            title="Timer"
            onClick={onTimerClick}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              timer
            </span>
          </button>
          <button
            id="btn-qr"
            className="qr-btn text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all p-base rounded-lg hidden md:block"
            title="QR Code"
            onClick={onQrClick}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              qr_code_2
            </span>
          </button>
          <button
            id="btn-leave"
            className="text-error hover:bg-error/10 transition-all px-sm py-xs rounded-lg flex items-center gap-xs ml-xs"
            title={isHost ? "End Session" : "Leave Session"}
            onClick={onLeaveAction}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isHost ? "power_settings_new" : "logout"}
            </span>
            <span className="hidden md:inline font-label-md font-semibold">
              {isHost ? "End" : "Leave"}
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}

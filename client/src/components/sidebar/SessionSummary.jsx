import React, { useState } from 'react'

/**
 * SessionSummary — live summary panel showing results for each completed round.
 * Rendered inside the IssueSidebar when the "Summary" tab is active.
 */
export default function SessionSummary({ summaryRounds = [] }) {
  const [expandedRound, setExpandedRound] = useState(null)

  const totalPoints = summaryRounds.reduce((sum, r) => {
    const val = typeof r.finalValue === 'number' ? r.finalValue : 0
    return sum + val
  }, 0)

  if (summaryRounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-xl text-center gap-sm">
        <span
          className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-40"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          hourglass_empty
        </span>
        <p className="font-body-md text-on-surface-variant">
          No rounds completed yet.
        </p>
        <p className="font-body-sm text-on-surface-variant opacity-60">
          Results will appear here as issues are estimated.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-sm">
      {/* Stats bar */}
      <div className="flex items-center justify-between bg-surface-container rounded-lg px-sm py-xs border border-outline-variant">
        <div className="flex items-center gap-xs">
          <span
            className="material-symbols-outlined text-[16px] text-secondary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            task_alt
          </span>
          <span className="font-label-sm text-on-surface-variant">
            {summaryRounds.length} issue{summaryRounds.length !== 1 ? 's' : ''} estimated
          </span>
        </div>
        <div className="flex items-center gap-xs">
          <span
            className="material-symbols-outlined text-[16px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            speed
          </span>
          <span className="font-label-sm font-bold text-primary">
            {totalPoints} SP
          </span>
        </div>
      </div>

      {/* Round cards */}
      {summaryRounds.map((round, idx) => {
        const isExpanded = expandedRound === idx
        const numericVotes = round.votes
          .map((v) => v.value)
          .filter((v) => typeof v === 'number')
        const isConsensus =
          numericVotes.length > 1 &&
          numericVotes.every((v) => v === numericVotes[0])

        return (
          <div
            key={round.storyId || idx}
            className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden transition-all"
          >
            {/* Card header — always visible */}
            <button
              onClick={() => setExpandedRound(isExpanded ? null : idx)}
              className="w-full text-left px-sm py-xs flex items-center gap-sm hover:bg-surface-container-high transition-colors"
            >
              {/* Round number */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="font-label-sm text-primary font-bold text-[11px]">
                  {idx + 1}
                </span>
              </span>

              {/* Issue info */}
              <div className="flex-1 min-w-0">
                <div className="font-label-sm font-bold text-on-surface truncate">
                  {round.externalId}
                </div>
                <div className="font-body-sm text-on-surface-variant truncate text-[12px]">
                  {round.summary}
                </div>
              </div>

              {/* Final value badge */}
              <span className="flex-shrink-0 flex items-center gap-[3px] bg-secondary/15 border border-secondary/40 rounded-full px-xs py-[2px]">
                <span
                  className="material-symbols-outlined text-[12px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock
                </span>
                <span className="font-label-sm text-secondary font-bold" style={{ fontSize: '12px' }}>
                  {round.finalValue}
                </span>
              </span>

              {/* Expand icon */}
              <span
                className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {/* Expanded vote details */}
            {isExpanded && (
              <div className="px-sm pb-sm pt-xs border-t border-outline-variant animate-fade-in">
                {/* Consensus indicator */}
                {isConsensus && (
                  <div className="flex items-center gap-xs mb-xs px-xs py-[3px] rounded-md bg-secondary/10 border border-secondary/20">
                    <span
                      className="material-symbols-outlined text-[14px] text-secondary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      handshake
                    </span>
                    <span className="font-label-sm text-secondary text-[11px]">
                      Consensus reached!
                    </span>
                  </div>
                )}

                {/* Vote list */}
                <div className="flex flex-col gap-[4px]">
                  {round.votes.map((vote, vIdx) => (
                    <div
                      key={vIdx}
                      className="flex items-center justify-between py-[3px] px-xs rounded-md hover:bg-surface-container-high transition-colors"
                    >
                      <div className="flex items-center gap-xs">
                        <span
                          className="material-symbols-outlined text-[14px] text-on-surface-variant"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          person
                        </span>
                        <span className="font-body-sm text-on-surface text-[12px]">
                          {vote.participantName}
                        </span>
                      </div>
                      <span
                        className={`font-label-sm font-bold text-[12px] px-xs py-[1px] rounded-full border ${
                          vote.value === round.finalValue
                            ? 'bg-secondary/15 border-secondary/40 text-secondary'
                            : 'bg-surface-container-high border-outline-variant text-on-surface-variant'
                        }`}
                      >
                        {vote.value === 'coffee' ? '☕' : vote.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

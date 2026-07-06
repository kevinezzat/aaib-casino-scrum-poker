import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * SessionEndPage — displayed after a session ends.
 * Shows the final summary of all estimated issues with per-member votes.
 * Receives data via location.state from the PokerTablePage navigation.
 */
export default function SessionEndPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Data passed via navigation state
  const {
    sessionSummary = null,
    summaryRounds = [],
  } = location.state || {}

  // Priority: 1) summaryRounds (client-accumulated, has votes)
  //           2) sessionSummary.roundSummaries (server-accumulated, has votes)
  //           3) sessionSummary.stories (basic fallback, no per-member votes)
  const rounds = summaryRounds.length > 0
    ? summaryRounds
    : (sessionSummary?.roundSummaries?.length > 0)
      ? sessionSummary.roundSummaries
      : (sessionSummary?.stories || []).map((s) => ({
          storyId: s.storyId,
          externalId: s.externalId,
          summary: s.summary,
          finalValue: s.finalValue,
          votes: [],
        }))

  const sessionName = sessionSummary?.sessionName || 'Poker Session'

  const totalPoints = rounds.reduce((sum, r) => {
    const val = typeof r.finalValue === 'number' ? r.finalValue : 0
    return sum + val
  }, 0)

  const totalIssues = rounds.length

  return (
    <div className="bg-surface-container-lowest min-h-screen flex items-center justify-center p-md">
      <div className="w-full max-w-2xl bg-surface-container rounded-3xl border border-outline-variant shadow-xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-primary/5 border-b border-outline-variant px-lg py-md">
          <div className="flex items-center gap-sm mb-sm">
            <span
              className="material-symbols-outlined text-primary text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              emoji_events
            </span>
            <div>
              <h1 className="font-headline-md text-on-surface text-[22px] font-bold m-0">
                Session Complete
              </h1>
              <p className="font-body-sm text-on-surface-variant m-0">
                {sessionName}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-md mt-sm">
            <div className="flex items-center gap-xs bg-surface-container rounded-lg px-sm py-xs border border-outline-variant">
              <span
                className="material-symbols-outlined text-[18px] text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                task_alt
              </span>
              <span className="font-label-md text-on-surface font-bold">{totalIssues}</span>
              <span className="font-body-sm text-on-surface-variant">issues</span>
            </div>
            <div className="flex items-center gap-xs bg-surface-container rounded-lg px-sm py-xs border border-outline-variant">
              <span
                className="material-symbols-outlined text-[18px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                speed
              </span>
              <span className="font-label-md text-on-surface font-bold">{totalPoints}</span>
              <span className="font-body-sm text-on-surface-variant">story points</span>
            </div>
          </div>
        </div>

        {/* Summary table */}
        <div className="px-lg py-md max-h-[60vh] overflow-y-auto">
          {rounds.length === 0 ? (
            <div className="text-center py-xl">
              <span
                className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-40"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                info
              </span>
              <p className="font-body-md text-on-surface-variant mt-sm">
                No issues were estimated in this session.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-sm">
              {rounds.map((round, idx) => (
                <div
                  key={round.storyId || idx}
                  className="bg-surface-container-high rounded-xl border border-outline-variant overflow-hidden"
                >
                  {/* Issue header */}
                  <div className="flex items-center justify-between px-sm py-xs border-b border-outline-variant">
                    <div className="flex items-center gap-sm min-w-0">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <span className="font-label-sm text-primary font-bold text-[12px]">
                          {idx + 1}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <div className="font-label-sm font-bold text-on-surface truncate">
                          {round.externalId}
                        </div>
                        <div className="font-body-sm text-on-surface-variant truncate text-[12px]">
                          {round.summary}
                        </div>
                      </div>
                    </div>
                    <span className="flex-shrink-0 flex items-center gap-[4px] bg-secondary/15 border border-secondary/40 rounded-full px-sm py-[3px] ml-sm">
                      <span
                        className="material-symbols-outlined text-[14px] text-secondary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        lock
                      </span>
                      <span className="font-label-md text-secondary font-bold">
                        {round.finalValue}
                      </span>
                    </span>
                  </div>

                  {/* Per-member votes */}
                  {round.votes && round.votes.length > 0 && (
                    <div className="px-sm py-xs">
                      <div className="flex flex-wrap gap-xs">
                        {round.votes.map((vote, vIdx) => (
                          <div
                            key={vIdx}
                            className={`flex items-center gap-xs px-xs py-[3px] rounded-lg border text-[12px] ${
                              vote.value === round.finalValue
                                ? 'bg-secondary/10 border-secondary/30'
                                : 'bg-surface-container border-outline-variant'
                            }`}
                          >
                            <span
                              className="material-symbols-outlined text-[13px] text-on-surface-variant"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              person
                            </span>
                            <span className="font-body-sm text-on-surface">
                              {vote.participantName}
                            </span>
                            <span
                              className={`font-label-sm font-bold ${
                                vote.value === round.finalValue
                                  ? 'text-secondary'
                                  : 'text-on-surface-variant'
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
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-lg py-md border-t border-outline-variant">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-on-primary hover:bg-surface-tint px-lg py-sm rounded-xl font-label-md uppercase tracking-wider transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

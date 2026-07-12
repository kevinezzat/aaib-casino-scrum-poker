import React from 'react'

/** Mobile: mini table status + player list panel */
export function MobileTablePanel({ issue, players, isActive }) {
  return (
    <div
      id="mobile-table-panel"
      className={`mobile-panel ${isActive ? 'flex' : 'hidden'} md:hidden flex-1 flex-col bg-background overflow-y-auto pb-[88px]`}
    >
      <div className="px-margin-mobile pt-md flex flex-col gap-md flex-1">
        {issue && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
            <div className="flex justify-between items-center mb-sm">
              <span className="font-label-md text-label-md text-secondary">{issue.externalId || issue.key}</span>
              <div className="flex items-center gap-xs">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="font-label-sm text-label-sm text-on-surface-variant">Voting Open</span>
              </div>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">{issue.summary || issue.title}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{issue.description || 'No description'}</p>
            {issue.acceptanceCriteria && (
              <>
                <h3 className="font-body-sm text-body-sm font-bold text-secondary mb-xs mt-md uppercase tracking-wider">
                  Acceptance Criteria
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {issue.acceptanceCriteria.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-sm">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            Players at table
          </h2>
          <div className="flex flex-col gap-xs">
            {players.map((player) => (
              <div
                key={player.name}
                className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-base"
              >
                <div className="flex items-center gap-sm">
                  <div
                    className={`w-8 h-8 rounded-full ${player.avatarBg || ''} border border-outline-variant`}
                    style={player.avatarBg ? {} : { backgroundColor: (player.color || '#6c748b') + '33' }}
                  />
                  <span className="font-body-sm text-body-sm text-on-surface font-medium">{player.name}</span>
                </div>
                <span
                  className="material-symbols-outlined text-secondary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Mobile: voting progress / status panel */
export function MobileStatusPanel({ issue, players, isActive }) {
  return (
    <div
      id="mobile-status-panel"
      className={`mobile-panel ${isActive ? 'flex' : 'hidden'} md:hidden flex-1 flex-col bg-background overflow-y-auto pb-[88px]`}
    >
      <div className="px-margin-mobile pt-md flex flex-col gap-md">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-sm">Voting Status</h2>
          <div className="flex items-center gap-sm mb-md">
            <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full"
                style={{ width: `${(players.filter((p) => p.hasVoted || p.vote).length / Math.max(players.length, 1)) * 100}%` }}
              />
            </div>
            <span className="font-label-md text-label-md text-secondary">
              {players.filter((p) => p.hasVoted || p.vote).length}/{players.length}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            All team members have submitted their estimates. Waiting for Scrum Master to reveal.
          </p>
        </div>
        {issue && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">
              Current Issue
            </h3>
            <span className="font-body-sm text-body-sm text-secondary font-semibold">{issue.externalId || issue.key}</span>
            <p className="font-body-sm text-body-sm text-on-surface mt-xs">{issue.summary || issue.title}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Mobile: team member list panel */
export function MobileTeamPanel({ players, isActive }) {
  return (
    <div
      id="mobile-team-panel"
      className={`mobile-panel ${isActive ? 'flex' : 'hidden'} md:hidden flex-1 flex-col bg-background overflow-y-auto pb-[88px]`}
    >
      <div className="px-margin-mobile pt-md flex flex-col gap-md">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <div className="flex justify-between items-center mb-md">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Team</h2>
            <span className="font-label-sm text-label-sm bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full font-bold">
              {players.length} members
            </span>
          </div>
          <div className="flex flex-col gap-sm">
            {players.map((player) => {
              const roleLabel = player.role
                ? player.role.charAt(0).toUpperCase() + player.role.slice(1)
                : 'Voter'
              return (
                <div key={player.name} className="flex items-center gap-sm p-base rounded-lg bg-surface-container-low">
                  <div
                    className={`w-10 h-10 rounded-full ${player.avatarBg || ''} border-2 border-outline-variant`}
                    style={player.avatarBg ? {} : { backgroundColor: (player.color || '#6c748b') + '33' }}
                  />
                  <div className="flex-1">
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold block">{player.name}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{roleLabel}</span>
                  </div>
                  <span className="font-label-sm text-[10px] bg-secondary-container text-on-secondary-container px-xs py-[2px] rounded font-bold uppercase">
                    Online
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

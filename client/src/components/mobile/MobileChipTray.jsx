import React from 'react'

const DECK = [
  { value: '1',      label: '1' },
  { value: '2',      label: '2' },
  { value: '3',      label: '3' },
  { value: '5',      label: '5' },
  { value: '8',      label: '8' },
  { value: '13',     label: '13' },
  { value: '20',     label: '20' },
  { value: '?',      label: '?' },
  { value: 'coffee', icon: 'coffee' },
]

/**
 * MobileChipTray — full-screen mobile voting view.
 *
 * States:
 *  - No chip selected  → "Place Chip" button disabled
 *  - Chip selected, not placed → "Place Chip · {value}" button enabled
 *  - Chip placed, same chip selected → "Retrieve Vote" button (amber) — lets user take it back
 *  - Chip placed, different chip selected → "Confirm Change · {value}" button (primary) — re-votes
 */
export default function MobileChipTray({
  issue,
  selectedChip,
  chipPlaced,
  onChipSelect,
  onPlaceChip,
  isActive,
  isSpectator = false,
}) {
  // Derive the action button's label, colour, and icon
  let actionLabel, actionIcon, actionClass

  if (chipPlaced) {
    // Chip is placed — show retrieve
    actionLabel = 'Retrieve Vote'
    actionIcon  = 'undo'
    actionClass = 'bg-amber-500 hover:bg-amber-400'
  } else if (selectedChip) {
    // Chip selected but not yet placed
    const display = selectedChip === 'coffee' ? 'Break ☕' : selectedChip
    actionLabel = `Place Chip · ${display}`
    actionIcon  = 'arrow_forward'
    actionClass = 'bg-secondary hover:bg-secondary/90'
  } else {
    // Nothing selected
    actionLabel = 'Select a chip first'
    actionIcon  = 'arrow_forward'
    actionClass = 'bg-secondary/40'
  }

  return (
    <div
      id="mobile-chips-panel"
      className={`mobile-panel ${isActive ? 'flex' : 'hidden'} md:hidden flex-1 flex-col bg-background overflow-y-auto pb-[88px]`}
    >
      <main className="flex-1 px-margin-mobile pt-md flex flex-col gap-md">

        {/* Issue card */}
        <div
          id="mobile-issue-card"
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md animate-fade-in"
        >
          <div className="flex justify-between items-start mb-sm">
            <span className="font-label-md text-label-md text-secondary font-semibold">
              {issue?.externalId || issue?.key || ''}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Voting Open</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">
            {issue?.summary || issue?.title || 'No active issue'}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
            {issue?.description || ''}
          </p>
          {issue?.acceptanceCriteria && (
            <div className="mt-xs">
              <span className="font-label-sm font-bold text-secondary uppercase text-[10px] tracking-wider block mb-1">
                Acceptance Criteria
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                {issue.acceptanceCriteria}
              </p>
            </div>
          )}
        </div>

        {isSpectator ? (
          /* Spectator view */
          <div className="flex-1 flex flex-col items-center justify-center gap-lg py-xl text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(188,198,224,0.18) 0%, rgba(188,198,224,0.04) 100%)',
                border: '2px dashed rgba(188,198,224,0.4)',
              }}
            >
              <span
                className="material-symbols-outlined text-[40px] text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                visibility
              </span>
            </div>
            <div>
              <p className="font-label-lg text-on-surface font-semibold mb-xs">You're watching</p>
              <p className="font-body-sm text-on-surface-variant">
                Spectators can see all votes but cannot place chips.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Status banner when chip is placed */}
            {chipPlaced && (
              <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/30 rounded-xl px-md py-sm animate-fade-in">
                <span
                  className="material-symbols-outlined text-secondary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <p className="font-label-sm text-secondary font-semibold">
                  Vote submitted — tap any chip or "Retrieve Vote" to change it.
                </p>
              </div>
            )}

            {/* Chip tray */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="font-label-md text-label-md text-on-surface-variant mb-md uppercase tracking-wider text-center">
                {chipPlaced ? 'Change your estimate' : 'Select your estimate'}
              </h2>
              <div id="chip-grid" className="grid grid-cols-3 gap-md justify-items-center">
                {DECK.map((chip) => {
                  const isSelected = selectedChip === chip.value
                  // Placed chip gets a distinct "voted" ring; other chips are fully interactive
                  const isPlacedChip = chipPlaced && isSelected
                  return (
                    <button
                      key={chip.value}
                      aria-label={`Estimate ${chip.value}`}
                      className={`estimate-chip ${isSelected ? 'selected' : ''} ${
                        isPlacedChip ? 'ring-2 ring-secondary ring-offset-2' : ''
                      }`}
                      data-value={chip.value}
                      onClick={() => onChipSelect(chip.value)}
                    >
                      {chip.icon ? (
                        <span className="material-symbols-outlined text-3xl z-10 pointer-events-none text-on-surface">
                          {chip.icon}
                        </span>
                      ) : (
                        <span className="font-headline-xl text-headline-xl z-10 pointer-events-none text-on-surface">
                          {chip.label}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action button */}
            <div className="mt-auto pt-sm w-full">
              <button
                id="btn-place-chip"
                className={`place-chip-btn w-full text-white font-label-md text-label-md py-4 rounded-xl flex items-center justify-center gap-2 font-bold tracking-wide uppercase transition-all ${actionClass}`}
                disabled={!chipPlaced && !selectedChip}
                onClick={onPlaceChip}
              >
                <span id="place-chip-label">{actionLabel}</span>
                <span className="material-symbols-outlined text-[18px]">{actionIcon}</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

import React from 'react'

const DECK = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '5', label: '5' },
  { value: '8', label: '8' },
  { value: '13', label: '13' },
  { value: '20', label: '20' },
  { value: '?', label: '?' },
  { value: 'coffee', icon: 'coffee' },
]

/**
 * MobileChipTray — full-screen mobile voting view.
 * HTML ref: lines 742–796.
 */
export default function MobileChipTray({
  issueKey,
  issueTitle,
  issueDescription,
  selectedChip,
  chipPlaced,
  onChipSelect,
  onPlaceChip,
  isActive,
}) {
  const placeLabel = chipPlaced
    ? '✓ Chip Placed!'
    : selectedChip === 'coffee'
      ? 'Need a Break'
      : selectedChip
        ? `Place Chip · ${selectedChip}`
        : 'Place Chip'

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
            <span className="font-label-md text-label-md text-secondary font-semibold">{issueKey}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Voting Open</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">{issueTitle}</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{issueDescription}</p>
        </div>

        {/* Chip tray */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="font-label-md text-label-md text-on-surface-variant mb-md uppercase tracking-wider text-center">
            Select your estimate
          </h2>
          <div id="chip-grid" className="grid grid-cols-3 gap-md justify-items-center">
            {DECK.map((chip) => {
              const isSelected = selectedChip === chip.value
              return (
                <button
                  key={chip.value}
                  aria-label={`Estimate ${chip.value}`}
                  className={`estimate-chip ${isSelected ? 'selected' : ''} ${chipPlaced && !isSelected ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  data-value={chip.value}
                  onClick={() => onChipSelect(chip.value)}
                >
                  {chip.icon ? (
                    <span className={`material-symbols-outlined text-3xl z-10 pointer-events-none ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {chip.icon}
                    </span>
                  ) : (
                    <span className={`font-headline-xl text-headline-xl z-10 pointer-events-none ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {chip.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Place chip action */}
        <div className="mt-auto pt-sm w-full">
          <button
            id="btn-place-chip"
            className={`place-chip-btn w-full text-white font-label-md text-label-md py-4 rounded-xl flex items-center justify-center gap-2 font-bold tracking-wide uppercase transition-all ${chipPlaced ? 'bg-secondary' : 'bg-[#ef4444]'
              }`}
            style={{ opacity: selectedChip ? 1 : 0.5 }}
            disabled={!selectedChip}
            onClick={onPlaceChip}
          >
            <span id="place-chip-label">{placeLabel}</span>
            <span className="material-symbols-outlined text-[18px]">
              {chipPlaced ? 'check' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </main>
    </div>
  )
}

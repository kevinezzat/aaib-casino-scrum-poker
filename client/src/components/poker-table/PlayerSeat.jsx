import React from 'react'

/**
 * Map position prop → absolute positioning classes (verbatim from HTML).
 * Enhanced: 44px avatar with monogram + coloured glow ring.
 */
const POSITION_CLASSES = {
  left:           'absolute left-[-32px] top-1/2 -translate-y-1/2 flex flex-col items-center',
  right:          'absolute right-[-32px] top-1/2 -translate-y-1/2 flex flex-col items-center',
  'bottom-left':  'absolute bottom-6 left-14 flex flex-col items-center',
  'bottom-right': 'absolute bottom-6 right-14 flex flex-col items-center',
  'bottom-center':'absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center',
}

/** Chip offsets per seat position (mimics HTML absolute positioning) */
const CHIP_CLASSES = {
  left:           'vote-chip absolute top-1/2 -right-16 w-9 h-9 rounded-full border-[3px] border-dashed bg-surface-container-lowest flex items-center justify-center font-bold text-on-surface text-sm',
  right:          'vote-chip absolute top-1/2 -left-16 w-9 h-9 rounded-full border-[3px] border-dashed bg-surface-container-lowest flex items-center justify-center font-bold text-on-surface text-sm',
  'bottom-left':  'vote-chip absolute -top-12 left-10 w-9 h-9 rounded-full border-[3px] border-dashed bg-surface-container-lowest flex items-center justify-center font-bold text-on-surface text-sm',
  'bottom-right': 'vote-chip absolute -top-12 right-10 w-9 h-9 rounded-full border-[3px] border-dashed bg-surface-container-lowest flex items-center justify-center font-bold text-on-surface text-sm',
  'bottom-center':'vote-chip absolute -top-14 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full border-[3px] border-dashed bg-surface-container-lowest flex items-center justify-center font-bold text-on-surface text-sm',
}

/**
 * PlayerSeat — one player at the table.
 * Enhanced: 44px avatar, initials monogram, coloured glow ring, revealed vote styling.
 */
export default function PlayerSeat({
  name,
  color,
  avatarBg,
  chipBorderColor,
  position,
  vote,
  revealed,
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hasVotedMarker = vote === '✓'
  const isRevealed = revealed && vote && !hasVotedMarker

  return (
    <div
      className={`player-seat ${POSITION_CLASSES[position]}`}
      style={{ '--player-color': color }}
    >
      {/* Enhanced avatar: 44px + monogram + coloured glow */}
      <div
        className={`player-avatar w-11 h-11 rounded-full border-2 border-outline-variant ${avatarBg || ''} mb-1 transition-all flex items-center justify-center text-xs font-bold text-on-surface/70`}
        style={{
          boxShadow: `0 0 0 3px ${color}55, 0 0 12px ${color}33`,
          ...(avatarBg ? {} : { backgroundColor: color + '33' }),
        }}
      >
        {initials}
      </div>

      {/* Name badge */}
      <span className="font-label-sm text-label-sm text-on-surface bg-surface border border-outline-variant px-xs py-[1px] rounded font-semibold shadow-sm whitespace-nowrap">
        {name}
      </span>

      {/* Vote chip */}
      <div
        className={`${CHIP_CLASSES[position]} ${chipBorderColor || ''} ${
          isRevealed
            ? 'border-solid bg-secondary-container text-on-secondary-container border-secondary-fixed'
            : hasVotedMarker
            ? 'border-solid border-secondary/50'
            : 'border-dashed'
        } ${revealed ? 'vote-chip revealed' : ''}`}
        data-player={name.toLowerCase()}
        style={{
          ...(isRevealed ? { fontWeight: 800, fontSize: '16px' } : {}),
          ...(chipBorderColor ? {} : { borderColor: color + '88' }),
        }}
      >
        {isRevealed ? vote : hasVotedMarker ? '✓' : '?'}
      </div>
    </div>
  )
}

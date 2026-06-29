import React from 'react'
import DealerCharacter from './DealerCharacter'
import CenterPot from './CenterPot'
import PlayerSeat from './PlayerSeat'
import StatusPill from './StatusPill'

/**
 * PokerTable — the full desktop table canvas.
 * Enhanced: multi-ring border with gold/dark trim, richer felt vignette.
 * HTML ref: lines 569–654.
 */
export default function PokerTable({ players, issue, revealed, onReveal, isHost, sessionCode, dealerName }) {
  const voteCount = players.filter((p) => p.hasVoted || p.vote).length

  return (
    <main
      id="desktop-table-view"
      className="hidden md:flex flex-1 relative items-center justify-center bg-surface-container-lowest p-lg overflow-hidden"
    >
      {/* Status pill */}
      <StatusPill voteCount={voteCount} totalCount={players.length} sessionCode={sessionCode} />

      {/* Table shell — enhanced multi-ring border */}
      <div
        id="poker-table"
        className="relative w-full max-w-[820px] h-[62%] min-h-[360px] max-h-[540px] rounded-[200px] p-[6px] animate-scale-in"
        style={{
          animationDuration: '0.6s',
          background: 'linear-gradient(145deg, #d4af37 0%, #8b7536 40%, #c9a227 70%, #f0d060 100%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {/* Dark trim ring */}
        <div
          className="w-full h-full rounded-[194px] p-[4px]"
          style={{ background: '#1a2e1a' }}
        >
          {/* Inner green felt */}
          <div
            className="w-full h-full rounded-[190px] relative flex items-center justify-center overflow-visible"
            style={{
              background: 'radial-gradient(ellipse 90% 70% at 50% 35%, #007a52 0%, #005a3c 50%, #003d28 100%)',
            }}
          >
            {/* Felt vignette overlay */}
            <div
              className="absolute inset-0 rounded-[190px] pointer-events-none"
              style={{
                backgroundImage: [
                  'radial-gradient(ellipse 120% 80% at 50% 40%, rgba(255,255,255,0.07) 0%, transparent 65%)',
                  'radial-gradient(circle at 15% 55%, rgba(255,255,255,0.04) 0%, transparent 35%)',
                  'radial-gradient(circle at 85% 55%, rgba(255,255,255,0.04) 0%, transparent 35%)',
                  'radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0,0,0,0.25) 0%, transparent 60%)',
                ].join(', '),
              }}
            />

            {/* Dealer */}
            <DealerCharacter name={dealerName} />

            {/* Center pot */}
            <CenterPot
              issueKey={issue.key}
              issueTitle={issue.title}
              revealed={revealed}
              onReveal={onReveal}
              isHost={isHost}
            />

            {/* Player seats */}
            {players.map((player) => (
              <PlayerSeat key={player._id} {...player} revealed={revealed} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

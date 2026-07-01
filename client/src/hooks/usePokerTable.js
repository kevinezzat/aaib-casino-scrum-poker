import { useState, useEffect, useCallback } from 'react'

const INITIAL_TIMER = 300 // 5 minutes

// ── Position layout for up to 8 players ──────────────────────────
const SEAT_POSITIONS = [
  'left',
  'right',
  'bottom-left',
  'bottom-right',
  'bottom-center',
  'left',    // wraps for 6+
  'right',
  'bottom-center',
]

// ── Map participant color → Tailwind avatar/chip classes ─────────
// Since live participants have hex colors (not Tailwind classes),
// we use inline styles for the avatar bg and chip border.
function mapParticipantToPlayer(participant, index, revealedVotes) {
  const position = SEAT_POSITIONS[index % SEAT_POSITIONS.length]

  // Find this participant's revealed vote (if any)
  const revealed = revealedVotes?.find(
    (v) => v.participantId === participant._id || v.participantId?.toString() === participant._id
  )

  return {
    _id: participant._id,
    name: participant.name,
    color: participant.color || '#6c748b',
    // Use inline style instead of Tailwind class for dynamic colors
    avatarBg: '',
    chipBorderColor: '',
    position,
    vote: revealed ? String(revealed.value) : (participant.hasVoted ? '✓' : null),
    hasVoted: participant.hasVoted || false,
    role: participant.role,
  }
}

export function usePokerTable({ socketHook } = {}) {
  // ── Timer ─────────────────────────────────────────────────────────
  const [timerSeconds, setTimerSeconds] = useState(INITIAL_TIMER)

  useEffect(() => {
    let id;
    if (socketHook?.roundStatus !== 'revealed') {
      id = setInterval(() => {
        setTimerSeconds((s) => (s > 0 ? s - 1 : 0))
      }, 1000)
    }
    return () => {
      if (id) clearInterval(id)
    }
  }, [socketHook?.roundStatus])

  useEffect(() => {
    if (socketHook?.roundStatus === 'voting') {
      setTimerSeconds(INITIAL_TIMER)
    }
  }, [socketHook?.roundStatus])

  // ── Revealed state (driven by socket or local toggle) ─────────────
  const revealed = socketHook?.roundStatus === 'revealed'

  const handleReveal = useCallback(() => {
    if (socketHook?.sessionId) {
      // Live: emit reveal-chips to server
      socketHook.revealChips(socketHook.sessionId).catch((err) => {
        console.error('[usePokerTable] revealChips failed:', err.message)
      })
    }
  }, [socketHook])

  const handleNewRound = useCallback(() => {
    if (socketHook?.sessionId) {
      socketHook.newRound(socketHook.sessionId).catch((err) => {
        console.error('[usePokerTable] newRound failed:', err.message)
      })
    }
  }, [socketHook])

  // ── Desktop: sidebar tab ─────────────────────────────────────────
  const [activeSidebarTab, setActiveSidebarTab] = useState('description')

  const handleSidebarTab = useCallback((tab) => {
    setActiveSidebarTab(tab)
  }, [])

  // ── Mobile: chip selection ────────────────────────────────────────
  const [selectedChip, setSelectedChip] = useState(null)
  const [chipPlaced, setChipPlaced] = useState(false)

  const handleChipSelect = useCallback((value) => {
    if (chipPlaced) return
    setSelectedChip(value)
  }, [chipPlaced])

  const handlePlaceChip = useCallback(() => {
    if (!selectedChip) return

    if (!chipPlaced) {
      setChipPlaced(true)

      // Live: emit place-chip to server
      if (socketHook?.sessionId) {
        socketHook.placeChip(socketHook.sessionId, 'current', selectedChip).catch((err) => {
          console.error('[usePokerTable] placeChip failed:', err.message)
          setChipPlaced(false) // rollback on error
        })
      }
    } else {
      setChipPlaced(false)
    }
  }, [selectedChip, chipPlaced, socketHook])

  // Reset chip state on new round
  useEffect(() => {
    if (socketHook?.roundStatus === 'voting') {
      setSelectedChip(null)
      setChipPlaced(false)
    }
  }, [socketHook?.roundStatus])

  // ── Mobile: panel switching ───────────────────────────────────────
  const [activeMobilePanel, setActiveMobilePanel] = useState('mobile-chips-panel')

  const handleMobilePanel = useCallback((panelId) => {
    setActiveMobilePanel(panelId)
  }, [])

  // ── Build players list from live participants ─────────────────────
  // Dealer (host) does not sit at the table — they are the DealerCharacter
  const allParticipants = socketHook?.participants || []

  // Voters sit at the table with chip slots
  const voterParticipants = allParticipants.filter((p) => p.role === 'voter')
  const players = voterParticipants.map((p, i) =>
    mapParticipantToPlayer(p, i, socketHook?.revealedVotes)
  )

  // Spectators watch from the sideline — pass raw participant data
  const spectators = allParticipants.filter((p) => p.role === 'spectator')

  // Expose the dealer participant so their name can be shown on the avatar
  const dealerParticipant = allParticipants.find((p) => p.role === 'dealer') || null

  return {
    timerSeconds,
    revealed,
    activeSidebarTab,
    selectedChip,
    chipPlaced,
    activeMobilePanel,
    players,
    spectators,
    dealerParticipant,
    handlers: {
      handleReveal,
      handleNewRound,
      handleSidebarTab,
      handleChipSelect,
      handlePlaceChip,
      handleMobilePanel,
    },
  }
}

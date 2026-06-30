import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { usePokerTable } from '../hooks/usePokerTable'
import TopNavBar from '../components/TopNavBar'
import PokerTable from '../components/poker-table/PokerTable'
import IssueSidebar from '../components/sidebar/IssueSidebar'
import MobileChipTray from '../components/mobile/MobileChipTray'
import MobileNavBar from '../components/mobile/MobileNavBar'
import { MobileTablePanel, MobileStatusPanel, MobileTeamPanel } from '../components/mobile/MobilePanels'
import QrPopover from '../components/QrPopover'
import WelcomeQrModal from '../components/WelcomeQrModal'

// ── Stub issue data (no issue CRUD yet in Phase 1) ────────────────
const STUB_ISSUE = {
  key: 'AUTH-204',
  title: 'Add OAuth login flow',
  description:
    "As a user, I want to be able to log in using my Google or Microsoft account so that I don't have to remember another password.",
}

export default function PokerTablePage() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [localPlayer, setLocalPlayer] = useState(null)
  const [playerRole, setPlayerRole] = useState('voter')
  const [sessionId, setSessionId] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const [showWelcomeQr, setShowWelcomeQr] = useState(false)
  const joiningRef = useRef(false)

  // ── Socket connection ───────────────────────────────────────────
  const socket = useSocket()

  // ── Join session once connected ─────────────────────────────────
  useEffect(() => {
    const playerName = sessionStorage.getItem('playerName')

    if (!playerName) {
      navigate(`/join/${code}`)
      return
    }

    setLocalPlayer(playerName)
    setPlayerRole(sessionStorage.getItem('playerRole') || 'voter')
  }, [code, navigate])

  // Join the socket room once we have a player name and are connected
  useEffect(() => {
    if (!localPlayer || !socket.isConnected || sessionId || joiningRef.current) return

    joiningRef.current = true

    const normalizedCode = code.toUpperCase()
    const hostToken = localStorage.getItem(`scrum_host_${normalizedCode}`)

    socket
      .joinSession(normalizedCode, localPlayer, hostToken, playerRole)
      .then((response) => {
        setSessionId(response.sessionId)
        const hostConfirmed = response.isHost === true
        setIsHost(hostConfirmed)
        // Auto-open welcome modal for the host on first join
        if (hostConfirmed) setShowWelcomeQr(true)
      })
      .catch((err) => {
        console.error('[PokerTablePage] join failed:', err.message)
        setJoinError(err.message)
        joiningRef.current = false // allow retry on error
      })
  }, [localPlayer, socket.isConnected, sessionId, code, socket.joinSession, playerRole])

  // ── Poker table logic (wired to socket) ─────────────────────────
  const socketHookData = {
    participants: socket.participants,
    revealedVotes: socket.revealedVotes,
    roundStatus: socket.roundStatus,
    sessionId,
    revealChips: socket.revealChips,
    newRound: socket.newRound,
    placeChip: socket.placeChip,
  }

  const {
    timerSeconds,
    revealed,
    activeSidebarTab,
    selectedChip,
    chipPlaced,
    activeMobilePanel,
    players,
    spectators,
    dealerParticipant,
    handlers,
  } = usePokerTable({ socketHook: socketHookData })

  // Dealer name: prefer the live socket participant, fall back to local player name
  // so the host sees their name immediately before the round-trip completes.
  const dealerName = dealerParticipant?.name ?? (isHost ? localPlayer : null)

  // Is the current user a spectator?
  const isSpectator = playerRole === 'spectator'

  // ── Loading / error states ──────────────────────────────────────
  if (!localPlayer) return null

  if (joinError) {
    return (
      <div className="bg-surface-container-lowest min-h-screen flex items-center justify-center p-md">
        <div className="text-center max-w-sm">
          <span className="material-symbols-outlined text-error text-[48px] mb-sm">error</span>
          <h1 className="font-headline-md text-on-surface mb-xs">Failed to Join</h1>
          <p className="font-body-md text-on-surface-variant mb-md">{joinError}</p>
          <button
            onClick={() => navigate(`/join/${code}`)}
            className="text-primary font-label-md uppercase hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="bg-surface-container-lowest min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-sm">
          <span className="material-symbols-outlined animate-spin text-[32px] text-secondary">sync</span>
          <span className="font-body-md text-on-surface-variant">Joining room {code}…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface h-screen overflow-hidden flex flex-col font-sans">
      {/* Fixed top nav */}
      <TopNavBar
        issueKey={STUB_ISSUE.key}
        timerSeconds={timerSeconds}
        onQrClick={() => setShowQr((v) => !v)}
      />

      {/* QR popover (nav button) */}
      <QrPopover
        open={showQr}
        sessionCode={code}
        onClose={() => setShowQr(false)}
      />

      {/* Welcome modal — host only, auto-opens on first join */}
      <WelcomeQrModal
        open={showWelcomeQr}
        sessionCode={code}
        hostName={localPlayer}
        onClose={() => setShowWelcomeQr(false)}
      />

      {/* Main content — below 48px nav */}
      <div className="flex flex-1 mt-[48px] relative w-full h-[calc(100vh-48px)]">

        {/* Desktop poker table */}
        <PokerTable
          players={players}
          spectators={spectators}
          issue={STUB_ISSUE}
          revealed={revealed}
          isHost={isHost}
          isSpectator={isSpectator}
          sessionCode={code}
          dealerName={dealerName}
          onReveal={revealed ? handlers.handleNewRound : handlers.handleReveal}
        />

        {/* Mobile panels */}
        <MobileTablePanel
          issue={STUB_ISSUE}
          players={players}
          isActive={activeMobilePanel === 'mobile-table-panel'}
        />
        <MobileStatusPanel
          issue={STUB_ISSUE}
          players={players}
          isActive={activeMobilePanel === 'mobile-status-panel'}
        />
        <MobileChipTray
          issueKey={STUB_ISSUE.key}
          issueTitle={STUB_ISSUE.title}
          issueDescription={STUB_ISSUE.description}
          selectedChip={selectedChip}
          chipPlaced={chipPlaced}
          onChipSelect={handlers.handleChipSelect}
          onPlaceChip={handlers.handlePlaceChip}
          isActive={activeMobilePanel === 'mobile-chips-panel'}
          isSpectator={isSpectator}
        />
        <MobileTeamPanel
          players={players}
          isActive={activeMobilePanel === 'mobile-team-panel'}
        />

        {/* Desktop right sidebar */}
        <IssueSidebar
          issueKey={STUB_ISSUE.key}
          issueTitle={STUB_ISSUE.title}
          activeTab={activeSidebarTab}
          onTabChange={handlers.handleSidebarTab}
        />
      </div>

      {/* Mobile bottom nav */}
      <MobileNavBar
        activePanel={activeMobilePanel}
        onPanelChange={handlers.handleMobilePanel}
      />
    </div>
  )
}

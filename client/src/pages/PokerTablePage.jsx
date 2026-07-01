import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
import ConfirmModal from '../components/ConfirmModal'

// We will fetch stories and use the socket's selectedIssue.

export default function PokerTablePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const isBlankUrl = queryParams.get('blank') === 'true'
  const isBlank = isBlankUrl || sessionStorage.getItem('isBlank') === 'true'
  
  useEffect(() => {
    if (isBlankUrl) {
      sessionStorage.setItem('isBlank', 'true')
    }
  }, [isBlankUrl])
  
  

  const [localPlayer, setLocalPlayer] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const [showWelcomeQr, setShowWelcomeQr] = useState(false)
  const [stories, setStories] = useState([])
  const [confirmModal, setConfirmModal] = useState({ open: false, isEnd: false })
  const [toast, setToast] = useState(null)
  const joiningRef = useRef(false)

  // ── Socket connection ───────────────────────────────────────────
  const socket = useSocket()

  // ── Join session once connected ─────────────────────────────────
  useEffect(() => {
    const playerName = sessionStorage.getItem('playerName')

    if (!playerName) {
      navigate(`/join/${code}${location.search}`)
      return
    }

    setLocalPlayer(playerName)
  }, [code, navigate, location.search])

  // Join the socket room once we have a player name and are connected
  useEffect(() => {
    if (!localPlayer || !socket.isConnected || sessionId || joiningRef.current) return

    joiningRef.current = true

    const normalizedCode = code.toUpperCase()
    const hostToken = localStorage.getItem(`scrum_host_${normalizedCode}`)

    socket
      .joinSession(normalizedCode, localPlayer, hostToken)
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
  }, [localPlayer, socket.isConnected, sessionId, code, socket.joinSession])

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
    dealerParticipant,
    handlers,
  } = usePokerTable({ socketHook: socketHookData })

  // ── Fetch stories for this session ──────────────────────────────
  useEffect(() => {
    if (!sessionId || isBlank) return
    const fetchSessionStories = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/stories`)
        if (res.ok) {
          const data = await res.json()
          setStories(data)
        }
      } catch (err) {
        console.error('Failed to fetch stories', err)
      }
    }
    fetchSessionStories()
  }, [sessionId, isBlank])

  // currentIssue is either the one selected via socket, or fallback to first story if host hasn't selected yet, or null if blank
  const currentIssue = isBlank 
    ? null 
    : socket.selectedIssue || (stories.length > 0 ? stories[0] : null)

  const handleSelectIssue = (storyId) => {
    socket.selectIssue(sessionId, storyId).catch(err => console.error(err))
  }

  // Dealer name: prefer the live socket participant, fall back to local player name
  // so the host sees their name immediately before the round-trip completes.
  const dealerName = dealerParticipant?.name ?? (isHost ? localPlayer : null)

  // ── Session Ended Effect ────────────────────────────────────────
  useEffect(() => {
    if (socket.sessionEnded) {
      // Clear host token and player data if needed, then navigate
      sessionStorage.removeItem('playerName')
      const normalizedCode = code.toUpperCase()
      localStorage.removeItem(`scrum_host_${normalizedCode}`)
      
      if (isHost) {
        navigate('/')
      } else {
        navigate('/thank-you')
      }
    }
  }, [socket.sessionEnded, navigate, code, isHost])

  // ── Participant Left Toast ───────────────────────────────────────
  useEffect(() => {
    if (socket.participantLeft) {
      setToast(`${socket.participantLeft.name} has left the session.`)
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [socket.participantLeft])

  const handleLeaveAction = () => {
    setConfirmModal({ open: true, isEnd: isHost })
  }

  const handleConfirmAction = () => {
    setConfirmModal({ open: false, isEnd: false })
    if (confirmModal.isEnd) {
      socket.endSession(sessionId).then(() => {
        navigate('/')
      }).catch(err => console.error(err))
    } else {
      navigate('/thank-you')
    }
  }

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
        issueKey={currentIssue?.externalId || currentIssue?.key}
        timerSeconds={timerSeconds}
        onQrClick={() => setShowQr((v) => !v)}
        isHost={isHost}
        onLeaveAction={handleLeaveAction}
      />

      {/* QR popover (nav button) */}
      <QrPopover
        open={showQr}
        sessionCode={code}
        onClose={() => setShowQr(false)}
        isBlank={isBlank}
      />

      {/* Welcome modal — host only, auto-opens on first join */}
      <WelcomeQrModal
        open={showWelcomeQr}
        sessionCode={code}
        hostName={localPlayer}
        onClose={() => setShowWelcomeQr(false)}
        isBlank={isBlank}
      />

      {/* Confirm Modal for End/Leave */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.isEnd ? "End Session" : "Leave Session"}
        message={
          confirmModal.isEnd 
            ? "Are you sure you want to end this session for everyone?" 
            : "Are you sure you want to leave this session?"
        }
        confirmText={confirmModal.isEnd ? "End Session" : "Leave"}
        isDestructive={true}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ open: false, isEnd: false })}
      />

      {/* Simple Toast for Participant Left */}
      {toast && (
        <div className="fixed top-[64px] right-4 z-50 animate-fade-in bg-surface-container-high text-on-surface px-md py-sm rounded-xl shadow-lg border border-outline-variant flex items-center gap-xs">
          <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
          <span className="font-body-sm">{toast}</span>
        </div>
      )}

      {/* Main content — below 48px nav */}
      <div className="flex flex-1 mt-[48px] relative w-full h-[calc(100vh-48px)]">

        {/* Desktop poker table */}
        <PokerTable
          players={players}
          issue={currentIssue}
          revealed={revealed}
          isHost={isHost}
          sessionCode={code}
          dealerName={dealerName}
          onReveal={revealed ? handlers.handleNewRound : handlers.handleReveal}
        />

        {/* Mobile panels */}
        <MobileTablePanel
          issue={currentIssue}
          players={players}
          isActive={activeMobilePanel === 'mobile-table-panel'}
        />
        <MobileStatusPanel
          issue={currentIssue}
          players={players}
          isActive={activeMobilePanel === 'mobile-status-panel'}
        />
        <MobileChipTray
          issue={currentIssue}
          selectedChip={selectedChip}
          chipPlaced={chipPlaced}
          onChipSelect={handlers.handleChipSelect}
          onPlaceChip={handlers.handlePlaceChip}
          isActive={activeMobilePanel === 'mobile-chips-panel'}
        />
        <MobileTeamPanel
          players={players}
          isActive={activeMobilePanel === 'mobile-team-panel'}
        />

        {/* Desktop right sidebar */}
        {!isBlank && (
          <IssueSidebar
            issue={currentIssue}
            activeTab={activeSidebarTab}
            onTabChange={handlers.handleSidebarTab}
            isHost={isHost}
            stories={stories}
            onSelectIssue={handleSelectIssue}
          />
        )}
      </div>

      {/* Mobile bottom nav */}
      <MobileNavBar
        activePanel={activeMobilePanel}
        onPanelChange={handlers.handleMobilePanel}
      />
    </div>
  )
}

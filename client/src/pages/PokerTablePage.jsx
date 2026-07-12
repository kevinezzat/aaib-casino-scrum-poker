import React, { useEffect, useState, useRef, useCallback } from 'react'
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
import LockEstimationModal from '../components/LockEstimationModal'
import { fetchApi } from '../utils/api'

// We will fetch stories and use the socket's selectedIssue.

export default function PokerTablePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const isBlankUrl = queryParams.get('blank') === 'true'
  const isBlank = isBlankUrl || sessionStorage.getItem(`isBlank_${code}`) === 'true'
  
  useEffect(() => {
    if (isBlankUrl && code) {
      sessionStorage.setItem(`isBlank_${code}`, 'true')
    }
  }, [isBlankUrl, code])



  const [localPlayer, setLocalPlayer] = useState(null)
  const [playerRole, setPlayerRole] = useState('voter')
  const [sessionId, setSessionId] = useState(null)
  const [deckType, setDeckType] = useState('fibonacci')
  const [isHost, setIsHost] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const [showWelcomeQr, setShowWelcomeQr] = useState(false)
  const [stories, setStories] = useState([])
  const [confirmModal, setConfirmModal] = useState({ open: false, isEnd: false })
  const [toast, setToast] = useState(null)
  const [showLockModal, setShowLockModal] = useState(false)
  const [lockedValue, setLockedValue] = useState(null)
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
    setPlayerRole(sessionStorage.getItem('playerRole') || 'voter')
  }, [code, navigate, location.search])

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
        if (response.deckType) setDeckType(response.deckType)
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
    lockEstimation: socket.lockEstimation,
  }

  const {
    timerSeconds,
    revealed,
    isLocked,
    activeSidebarTab,
    selectedChip,
    chipPlaced,
    activeMobilePanel,
    players,
    spectators,
    dealerParticipant,
    handlers,
  } = usePokerTable({ socketHook: socketHookData })

  // ── Fetch stories for this session ──────────────────────────────
  useEffect(() => {
    if (!sessionId || isBlank) return
    const fetchSessionStories = async () => {
      try {
        const res = await fetchApi(`/api/sessions/${sessionId}/stories`)
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

  // ── Deck values for the lock modal ──────────────────────────────
  const DECK_VALUES = {
    fibonacci: [1, 2, 3, 5, 8, 13, 20, 40, '?'],
    'powers-of-2': [1, 2, 4, 8, 16, 32, 64, '?'],
    tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  }
  const deckValues = DECK_VALUES[deckType] || DECK_VALUES.fibonacci

  // ── Handle estimation-locked socket event ────────────────────────
  useEffect(() => {
    if (socket.lockedEstimation === null) {
      // Round was reset — clear the locked badge
      setLockedValue(null)
      return
    }
    const { storyId, finalValue, nextStory } = socket.lockedEstimation

    // Update the local stories array with the new storyPoints
    setStories((prev) =>
      prev.map((s) =>
        s._id === storyId ? { ...s, storyPoints: finalValue } : s
      )
    )

    // Save locked value for the badge display
    setLockedValue(finalValue)
    setShowLockModal(false)

    // Auto-advance: select the next story via socket
    if (nextStory && isHost) {
      socket.selectIssue(sessionId, nextStory._id).catch(err => console.error(err))
    }
  }, [socket.lockedEstimation])

  // ── Handle dealer confirming lock-in ────────────────────────────
  const handleConfirmLock = useCallback(async (finalValue) => {
    if (!currentIssue || !sessionId) return

    // Find the next story in the list for auto-advance
    const currentIdx = stories.findIndex((s) => s._id === currentIssue._id)
    const nextStory = currentIdx !== -1 && currentIdx < stories.length - 1
      ? stories[currentIdx + 1]
      : null

    handlers.handleLockEstimation(
      currentIssue._id,
      finalValue,
      nextStory?._id ?? null
    )

    if (currentIssue.externalId && currentIssue.externalId.includes('-')) {
      try {
        const response = await fetchApi(`/api/jira/issues/${currentIssue.externalId}/story-points`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: code,
            storyPoints: finalValue,
          })
        })
        if (response.ok) {
          setToast(`Updated Jira issue ${currentIssue.externalId}`)
        } else if (response.status !== 401) {
          const errData = await response.json().catch(() => ({}))
          console.error('Jira update failed:', errData)
          setToast(`Failed to update Jira: ${errData.error || 'Unknown error'}`)
        }
      } catch (err) {
        console.error('Failed to write to Jira:', err)
      }
    }
  }, [currentIssue, sessionId, stories, handlers, code])

  // ── Auto-dismiss toast after 4 seconds ─────────────────────────
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

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

      // Navigate to session-end page with summary data
      navigate('/session-end', {
        state: {
          sessionSummary: socket.sessionSummaryData,
          summaryRounds: socket.summaryRounds || [],
        },
      })
    }
  }, [socket.sessionEnded, navigate, code, isHost, socket.sessionSummaryData, socket.summaryRounds])

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
      // Host ending: the session-ended socket event will trigger navigation
      socket.endSession(sessionId).catch(err => console.error(err))
    } else {
      navigate('/thank-you')
    }
  }
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
        issueKey={currentIssue?.externalId || currentIssue?.key}
        timerSeconds={timerSeconds}
        onQrClick={() => setShowQr((v) => !v)}
        isHost={isHost}
        onLeaveAction={handleLeaveAction}
        onSummaryClick={() => handlers.handleSidebarTab('summary')}
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

      {/* Lock Estimation Modal — host only, appears after reveal */}
      <LockEstimationModal
        open={showLockModal}
        votes={socket.revealedVotes || []}
        deckValues={deckValues}
        issueKey={currentIssue?.externalId || currentIssue?.key}
        onConfirm={handleConfirmLock}
        onCancel={() => setShowLockModal(false)}
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
          spectators={spectators}
          revealed={revealed}
          isLocked={isLocked}
          lockedValue={lockedValue}
          isHost={isHost}
          isSpectator={isSpectator}
          sessionCode={code}
          dealerName={dealerName}
          onReveal={handlers.handleReveal}
          onNewRound={handlers.handleNewRound}
          onOpenLockModal={() => setShowLockModal(true)}
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
          isSpectator={isSpectator}
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
            summaryRounds={socket.summaryRounds || []}
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

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePokerTable } from '../hooks/usePokerTable'
import TopNavBar from '../components/TopNavBar'
import PokerTable from '../components/poker-table/PokerTable'
import IssueSidebar from '../components/sidebar/IssueSidebar'
import MobileChipTray from '../components/mobile/MobileChipTray'
import MobileNavBar from '../components/mobile/MobileNavBar'
import { MobileTablePanel, MobileStatusPanel, MobileTeamPanel } from '../components/mobile/MobilePanels'

// ── Stub data (Phase 2 static; replaced by live data in Phase 4) ──────────────
const STUB = {
  issue: {
    key: 'AUTH-204',
    title: 'Add OAuth login flow',
    description:
      "As a user, I want to be able to log in using my Google or Microsoft account so that I don't have to remember another password.",
  },
  players: [
    {
      name: 'Alex',
      color: '#6c748b',
      avatarBg: 'bg-tertiary-container',
      chipBorderColor: 'border-tertiary-container',
      position: 'left',
      vote: '3',
    },
    {
      name: 'Sam',
      color: '#ffdad7',
      avatarBg: 'bg-primary-fixed',
      chipBorderColor: 'border-primary-fixed',
      position: 'right',
      vote: '5',
    },
    {
      name: 'Jordan',
      color: '#6cf8bb',
      avatarBg: 'bg-secondary-fixed',
      chipBorderColor: 'border-secondary-fixed',
      position: 'bottom-left',
      vote: '5',
    },
    {
      name: 'Casey',
      color: '#bec6e0',
      avatarBg: 'bg-tertiary-fixed-dim',
      chipBorderColor: 'border-tertiary-fixed-dim',
      position: 'bottom-right',
      vote: '8',
    },
    {
      name: 'Taylor',
      color: '#8f6f6d',
      avatarBg: 'bg-outline',
      chipBorderColor: 'border-outline',
      position: 'bottom-center',
      vote: '5',
    },
  ],
}

export default function PokerTablePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  
  const [localPlayer, setLocalPlayer] = useState(null)

  useEffect(() => {
    // 1. Check if the user has an identity in this browser
    const playerName = sessionStorage.getItem('playerName')
    
    if (!playerName) {
      // Missing identity — they must have navigated here directly
      navigate(`/join/${code}`)
      return
    }

    setLocalPlayer(playerName)
    // Future Phase: socket.emit('join-session', { roomCode: code, playerName, role: 'voter' })
  }, [code, navigate])

  const {
    timerSeconds,
    revealed,
    activeSidebarTab,
    selectedChip,
    chipPlaced,
    activeMobilePanel,
    handlers,
  } = usePokerTable()

  // Wait until localPlayer is resolved before rendering the table
  if (!localPlayer) return null

  return (
    <div className="bg-surface-container-lowest text-on-surface h-screen overflow-hidden flex flex-col font-sans">
      {/* Fixed top nav */}
      <TopNavBar
        issueKey={STUB.issue.key}
        timerSeconds={timerSeconds}
      />

      {/* Main content — below 48px nav */}
      <div className="flex flex-1 mt-[48px] relative w-full h-[calc(100vh-48px)]">

        {/* Desktop poker table */}
        <PokerTable
          players={STUB.players}
          issue={STUB.issue}
          revealed={revealed}
          onReveal={handlers.handleReveal}
        />

        {/* Mobile panels */}
        <MobileTablePanel
          issue={STUB.issue}
          players={STUB.players}
          isActive={activeMobilePanel === 'mobile-table-panel'}
        />
        <MobileStatusPanel
          issue={STUB.issue}
          players={STUB.players}
          isActive={activeMobilePanel === 'mobile-status-panel'}
        />
        <MobileChipTray
          issueKey={STUB.issue.key}
          issueTitle={STUB.issue.title}
          issueDescription={STUB.issue.description}
          selectedChip={selectedChip}
          chipPlaced={chipPlaced}
          onChipSelect={handlers.handleChipSelect}
          onPlaceChip={handlers.handlePlaceChip}
          isActive={activeMobilePanel === 'mobile-chips-panel'}
        />
        <MobileTeamPanel
          players={STUB.players}
          isActive={activeMobilePanel === 'mobile-team-panel'}
        />

        {/* Desktop right sidebar */}
        <IssueSidebar
          issueKey={STUB.issue.key}
          issueTitle={STUB.issue.title}
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

import { useState, useEffect, useCallback } from 'react'

const INITIAL_TIMER = 300 // 5 minutes

export function usePokerTable() {
  // ── Timer ─────────────────────────────────────────────────────────
  const [timerSeconds, setTimerSeconds] = useState(INITIAL_TIMER)

  useEffect(() => {
    const id = setInterval(() => {
      setTimerSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Desktop: reveal / new-round ───────────────────────────────────
  const [revealed, setRevealed] = useState(false)

  const handleReveal = useCallback(() => {
    setRevealed((r) => !r)
  }, [])

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
    } else {
      setChipPlaced(false)
    }
  }, [selectedChip, chipPlaced])

  // ── Mobile: panel switching ───────────────────────────────────────
  const [activeMobilePanel, setActiveMobilePanel] = useState('mobile-chips-panel')

  const handleMobilePanel = useCallback((panelId) => {
    setActiveMobilePanel(panelId)
  }, [])

  return {
    timerSeconds,
    revealed,
    activeSidebarTab,
    selectedChip,
    chipPlaced,
    activeMobilePanel,
    handlers: {
      handleReveal,
      handleSidebarTab,
      handleChipSelect,
      handlePlaceChip,
      handleMobilePanel,
    },
  }
}

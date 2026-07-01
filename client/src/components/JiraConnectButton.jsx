import React from 'react'
import { useJiraConnection } from '../hooks/useJiraConnection'

export default function JiraConnectButton({ className = '', roomCode }) {
  const { connected, loading, connect } = useJiraConnection(roomCode)

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-on-surface-variant ${className}`}>
        <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
        <span className="font-body-sm">Checking Jira...</span>
      </div>
    )
  }

  if (connected) {
    return (
      <div className={`flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20 ${className}`}>
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        <span className="font-label-sm uppercase tracking-wider">Jira Connected</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={connect}
      className={`flex items-center gap-2 bg-[#0052CC] hover:bg-[#0065FF] text-white px-4 py-2 rounded-lg font-label-md transition-colors shadow-sm ${className}`}
    >
      <span className="material-symbols-outlined text-[20px]">api</span>
      Connect Jira
    </button>
  )
}

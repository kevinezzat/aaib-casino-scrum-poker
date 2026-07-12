import React, { useEffect, useState } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { useJiraConnection } from '../hooks/useJiraConnection'

export default function GlobalJiraHandler() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  
  // Extract roomCode from paths like /create/:code or /session/:code
  const match = location.pathname.match(/\/(?:create|session)\/([^/]+)/)
  const roomCode = match ? match[1] : null

  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: string }
  const [showReauthBanner, setShowReauthBanner] = useState(false)
  const { connect } = useJiraConnection(roomCode)

  useEffect(() => {
    // 1. Check for OAuth redirect query parameters
    const jiraConnected = searchParams.get('jiraConnected')
    const reason = searchParams.get('reason')

    if (jiraConnected === 'true') {
      setToast({ type: 'success', message: 'Successfully connected to Jira!' })
      searchParams.delete('jiraConnected')
      searchParams.delete('reason')
      setSearchParams(searchParams, { replace: true })
    } else if (jiraConnected === 'false') {
      setToast({ type: 'error', message: `Jira connection failed: ${reason || 'Unknown error'}` })
      searchParams.delete('jiraConnected')
      searchParams.delete('reason')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Auto-dismiss toast after 5 seconds (resets if a new toast appears)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    // 2. Listen for reauth events
    const handleReauth = () => {
      setShowReauthBanner(true)
    }
    window.addEventListener('jira_reauth_required', handleReauth)

    return () => {
      window.removeEventListener('jira_reauth_required', handleReauth)
    }
  }, [])

  // Auto-dismiss the reauth banner after 10 seconds so it never gets stuck
  useEffect(() => {
    if (!showReauthBanner) return
    const timer = setTimeout(() => setShowReauthBanner(false), 10000)
    return () => clearTimeout(timer)
  }, [showReauthBanner])

  return (
    <>
      {/* Toast Notification (Top Right) */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border ${
            toast.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-error-container border-error/20 text-on-error-container'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-body-sm">{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Re-auth Banner (Top Full Width) */}
      {showReauthBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-error-container text-on-error-container px-4 py-3 flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px]">warning</span>
            <span className="font-body-md font-medium">Your Jira connection expired — reconnect to continue importing issues</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowReauthBanner(false)
                connect()
              }}
              className="bg-error text-on-error px-4 py-1.5 rounded-md font-label-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Reconnect
            </button>
            <button 
              onClick={() => setShowReauthBanner(false)}
              className="hover:opacity-70 transition-opacity flex items-center justify-center p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

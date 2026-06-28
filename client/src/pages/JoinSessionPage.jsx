import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function JoinSessionPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [error, setError] = useState(null)
  
  const [voterName, setVoterName] = useState('')
  const [joining, setJoining] = useState(false)

  // Fetch session details on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`http://localhost:3001/api/sessions/${code}`)
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Session not found')
        }
        
        setSession(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingSession(false)
      }
    }
    
    if (code) fetchSession()
  }, [code])

  const handleJoin = (e) => {
    e.preventDefault()
    if (!voterName.trim() || !session) return

    setJoining(true)
    
    // Save local identity
    sessionStorage.setItem('playerName', voterName.trim())
    sessionStorage.removeItem('isHost') // Ensure they aren't marked as host from a previous session
    
    // Navigate to the table
    navigate(`/session/${session.roomCode}`)
  }

  if (loadingSession) {
    return (
      <div className="bg-surface-container-lowest min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[32px] text-secondary">sync</span>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center p-md">
      
      {/* Brand logo at top */}
      <div className="flex items-center gap-xs mb-xl animate-fade-in">
        <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          casino
        </span>
        <span className="font-headline-md text-primary tracking-tight">
          AAIB Scrum Poker
        </span>
      </div>

      <div className="max-w-sm w-full bg-surface-container border border-outline-variant rounded-2xl p-lg shadow-xl animate-scale-in relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        {error ? (
          <div className="text-center">
            <span className="material-symbols-outlined text-error text-[48px] mb-sm">error</span>
            <h1 className="font-headline-md text-on-surface mb-xs">Oops!</h1>
            <p className="font-body-md text-on-surface-variant mb-md">{error}</p>
            <button
              onClick={() => navigate('/create')}
              className="text-primary font-label-md uppercase hover:underline"
            >
              Create a new session instead
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-lg">
              <span className="font-label-md text-secondary uppercase tracking-wider mb-xs block">Joining Room</span>
              <h1 className="font-headline-lg text-on-surface mb-xs">{session.name}</h1>
              <div className="inline-block bg-surface-container-highest px-sm py-xs rounded text-on-surface-variant font-mono font-bold tracking-widest mt-xs border border-outline-variant">
                {session.roomCode}
              </div>
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-md relative z-10">
              <div className="flex flex-col gap-xs">
                <label htmlFor="voterName" className="font-label-md text-on-surface-variant">Your Name</label>
                <input
                  id="voterName"
                  type="text"
                  required
                  maxLength={60}
                  placeholder="e.g. Developer Jordan"
                  className="bg-surface-container-highest border-outline-variant rounded-lg focus:border-secondary focus:ring-secondary font-body-md"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={joining || !voterName.trim()}
                className="w-full bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md py-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-xs mt-sm"
              >
                {joining ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                ) : (
                  <>
                    Join Table
                    <span className="material-symbols-outlined text-[18px]">login</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

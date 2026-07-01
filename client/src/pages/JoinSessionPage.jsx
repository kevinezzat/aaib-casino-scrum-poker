import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'

export default function JoinSessionPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const isBlankUrl = queryParams.get('blank') === 'true'

  useEffect(() => {
    if (isBlankUrl && code) {
      sessionStorage.setItem(`isBlank_${code}`, 'true')
    }
  }, [isBlankUrl, code])


  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [error, setError] = useState(null)

  const [voterName, setVoterName] = useState('')
  const [selectedRole, setSelectedRole] = useState('voter')
  const [joining, setJoining] = useState(false)

  // Fetch session details on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const res = await fetch(`${API_URL}/api/sessions/${code}`)
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
    sessionStorage.setItem('playerRole', selectedRole)
    sessionStorage.removeItem('isHost') // Ensure they aren't marked as host from a previous session

    const isBlankStored = sessionStorage.getItem(`isBlank_${code}`) === 'true'
    const blankParam = (isBlankUrl || isBlankStored) ? '?blank=true' : ''

    // Navigate to the table
    navigate(`/session/${session.roomCode}${blankParam}`)
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
              {/* Name input */}
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

              {/* Role selector */}
              <div className="flex flex-col gap-xs">
                <span className="font-label-md text-on-surface-variant">Join as</span>
                <div className="grid grid-cols-2 gap-xs">
                  {/* Voter card */}
                  <button
                    id="role-voter"
                    type="button"
                    onClick={() => setSelectedRole('voter')}
                    className={`relative flex flex-col items-center gap-xs p-sm rounded-xl border-2 transition-all duration-200 group ${selectedRole === 'voter'
                        ? 'border-secondary bg-secondary/10 shadow-md'
                        : 'border-outline-variant bg-surface-container-high hover:border-secondary/40 hover:bg-secondary/5'
                      }`}
                    aria-pressed={selectedRole === 'voter'}
                  >
                    {selectedRole === 'voter' && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-secondary" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>check</span>
                      </span>
                    )}
                    <span
                      className={`material-symbols-outlined text-[28px] transition-colors ${selectedRole === 'voter' ? 'text-secondary' : 'text-on-surface-variant group-hover:text-secondary/70'}`}
                      style={{ fontVariationSettings: selectedRole === 'voter' ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      style
                    </span>
                    <span className={`font-label-md font-semibold transition-colors ${selectedRole === 'voter' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      Voter
                    </span>
                    <span className="font-body-sm text-on-surface-variant text-center leading-tight" style={{ fontSize: '10px' }}>
                      Cast votes on stories
                    </span>
                  </button>

                  {/* Spectator card */}
                  <button
                    id="role-spectator"
                    type="button"
                    onClick={() => setSelectedRole('spectator')}
                    className={`relative flex flex-col items-center gap-xs p-sm rounded-xl border-2 transition-all duration-200 group ${selectedRole === 'spectator'
                        ? 'border-tertiary bg-tertiary/10 shadow-md'
                        : 'border-outline-variant bg-surface-container-high hover:border-tertiary/40 hover:bg-tertiary/5'
                      }`}
                    aria-pressed={selectedRole === 'spectator'}
                  >
                    {selectedRole === 'spectator' && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-tertiary flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-tertiary" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>check</span>
                      </span>
                    )}
                    <span
                      className={`material-symbols-outlined text-[28px] transition-colors ${selectedRole === 'spectator' ? 'text-tertiary' : 'text-on-surface-variant group-hover:text-tertiary/70'}`}
                      style={{ fontVariationSettings: selectedRole === 'spectator' ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      visibility
                    </span>
                    <span className={`font-label-md font-semibold transition-colors ${selectedRole === 'spectator' ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                      Spectator
                    </span>
                    <span className="font-body-sm text-on-surface-variant text-center leading-tight" style={{ fontSize: '10px' }}>
                      Watch without voting
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={joining || !voterName.trim()}
                className={`w-full font-label-md py-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-xs mt-sm ${selectedRole === 'spectator'
                    ? 'bg-tertiary hover:bg-tertiary/90 text-on-tertiary'
                    : 'bg-secondary hover:bg-on-secondary-container text-on-secondary'
                  }`}
              >
                {joining ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                ) : (
                  <>
                    {selectedRole === 'spectator' ? 'Watch Session' : 'Join Table'}
                    <span className="material-symbols-outlined text-[18px]">
                      {selectedRole === 'spectator' ? 'visibility' : 'login'}
                    </span>
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

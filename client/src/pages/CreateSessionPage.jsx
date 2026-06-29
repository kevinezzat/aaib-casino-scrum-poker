import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CreateSessionPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    hostName: '',
    sessionName: '',
    deckType: 'fibonacci',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.hostName.trim() || !formData.sessionName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.sessionName.trim(),
          deckType: formData.deckType,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session')
      }

      // Save local identity
      sessionStorage.setItem('playerName', formData.hostName.trim())
      localStorage.setItem(`scrum_host_${data.roomCode}`, data.hostToken)

      // Navigate to the table
      navigate(`/session/${data.roomCode}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex items-center justify-center p-md">
      <div className="max-w-md w-full bg-surface-container border border-outline-variant rounded-2xl p-lg shadow-xl animate-fade-in relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center mb-lg">
          <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mb-sm shadow-md">
            <span className="material-symbols-outlined text-on-primary-container text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              casino
            </span>
          </div>
          <h1 className="font-headline-lg text-primary mb-xs text-center">New Session</h1>
          <p className="font-body-sm text-on-surface-variant text-center">Create a room and invite your team to estimate.</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-sm rounded-lg mb-md font-body-sm border border-error/20 flex items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label htmlFor="hostName" className="font-label-md text-on-surface-variant">Your Name</label>
            <input
              id="hostName"
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Scrum Master Alex"
              className="bg-surface-container-highest border-outline-variant rounded-lg focus:border-primary focus:ring-primary font-body-md"
              value={formData.hostName}
              onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label htmlFor="sessionName" className="font-label-md text-on-surface-variant">Session Name / Topic</label>
            <input
              id="sessionName"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Sprint 14 Planning"
              className="bg-surface-container-highest border-outline-variant rounded-lg focus:border-primary focus:ring-primary font-body-md"
              value={formData.sessionName}
              onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-xs mb-sm">
            <label htmlFor="deckType" className="font-label-md text-on-surface-variant">Deck Type</label>
            <select
              id="deckType"
              className="bg-surface-container-highest border-outline-variant rounded-lg focus:border-primary focus:ring-primary font-body-md"
              value={formData.deckType}
              onChange={(e) => setFormData({ ...formData, deckType: e.target.value })}
            >
              <option value="fibonacci">Fibonacci (1, 2, 3, 5, 8, 13, 20)</option>
              <option value="tshirt">T-Shirt (XS, S, M, L, XL)</option>
              <option value="powers-of-2">Powers of 2 (1, 2, 4, 8, 16)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.hostName.trim() || !formData.sessionName.trim()}
            className="w-full bg-primary hover:bg-surface-tint text-on-primary font-label-md py-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-xs"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            ) : (
              'Create Session'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

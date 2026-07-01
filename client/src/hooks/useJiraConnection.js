import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '../utils/api'

export function useJiraConnection(roomCode) {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cloudId, setCloudId] = useState(null)

  const checkStatus = useCallback(async () => {
    if (!roomCode) {
      setConnected(false)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetchApi(`/api/jira/auth/status?roomCode=${roomCode}`)
      if (res.ok) {
        const data = await res.json()
        setConnected(!!data.connected)
        setCloudId(data.cloudId || null)
      } else {
        setConnected(false)
        setCloudId(null)
      }
    } catch (err) {
      console.error('Failed to check Jira status', err)
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [roomCode])

  useEffect(() => {
    checkStatus()

    // Listen for custom re-auth event from api.js to toggle connected state automatically
    const handleReauth = () => setConnected(false)
    window.addEventListener('jira_reauth_required', handleReauth)

    return () => {
      window.removeEventListener('jira_reauth_required', handleReauth)
    }
  }, [checkStatus])

  const connect = () => {
    if (!roomCode) return
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    window.location.href = `${API_URL}/api/jira/auth/connect?roomCode=${roomCode}`
  }

  return { connected, loading, cloudId, connect, refetch: checkStatus }
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { io as ioClient } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3001'

/**
 * useSocket — centralises all Socket.IO logic for the Scrum Poker app.
 *
 * Initialises a single socket connection, exposes live state from server
 * broadcasts, and provides typed emit helpers so components never call
 * raw socket events.
 *
 * Usage:
 *   const { isConnected, participants, joinSession, placeChip, ... } = useSocket()
 */
export function useSocket() {
  const socketRef = useRef(null)

  // ── Connection state ──────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false)

  // ── Live state from server broadcasts ─────────────────────────────
  const [participants, setParticipants] = useState([])
  const [voteCount, setVoteCount] = useState({ count: 0, total: 0 })
  const [revealedVotes, setRevealedVotes] = useState(null)
  const [roundStatus, setRoundStatus] = useState('waiting')

  // ── Initialise socket connection (once) ───────────────────────────
  useEffect(() => {
    const socket = ioClient(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id)
      setIsConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.error('[socket] connection error:', err.message)
    })

    // ── Server broadcast listeners ────────────────────────────────
    socket.on('participants-updated', (data) => {
      setParticipants(data.participants || [])
    })

    socket.on('vote-update', (data) => {
      setVoteCount({
        count: data.voteCount || 0,
        total: data.totalParticipants || 0,
      })
    })

    socket.on('chips-revealed', (data) => {
      setRevealedVotes(data.votes || [])
      setRoundStatus(data.status || 'revealed')
    })

    socket.on('round-reset', (data) => {
      setRevealedVotes(null)
      setVoteCount({ count: 0, total: 0 })
      setRoundStatus(data.status || 'voting')
    })

    // Cleanup on unmount
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  // ── Emit helpers ──────────────────────────────────────────────────

  /**
   * Join a session room.
   * @param {string} roomCode  — 6-char room code
   * @param {string} playerName — display name
   * @param {'voter'|'spectator'} role
   * @returns {Promise<object>} — server acknowledgement
   */
  const joinSession = useCallback((roomCode, playerName, hostToken) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit(
        'join-session',
        { roomCode, playerName, hostToken },
        (response) => {
          if (response?.error) {
            reject(new Error(response.error))
          } else {
            setRoundStatus(response?.status || 'waiting')
            resolve(response)
          }
        }
      )
    })
  }, [])

  /**
   * Place a voting chip.
   * @param {string} sessionId
   * @param {string} itemId — story identifier (defaults to 'current')
   * @param {number|string} value — vote value (e.g. 5, '?', 'coffee')
   * @returns {Promise<object>}
   */
  const placeChip = useCallback((sessionId, itemId = 'current', value) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit(
        'place-chip',
        { sessionId, itemId, value },
        (response) => {
          if (response?.error) {
            reject(new Error(response.error))
          } else {
            resolve(response)
          }
        }
      )
    })
  }, [])

  /**
   * Reveal all chips (host only).
   * @param {string} sessionId
   * @returns {Promise<object>}
   */
  const revealChips = useCallback((sessionId) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit('reveal-chips', { sessionId }, (response) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }, [])

  /**
   * Start a new voting round (host only).
   * @param {string} sessionId
   * @param {string} itemId — defaults to 'current'
   * @returns {Promise<object>}
   */
  const newRound = useCallback((sessionId, itemId = 'current') => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit('new-round', { sessionId, itemId }, (response) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }, [])

  return {
    // Raw socket (escape hatch)
    socket: socketRef.current,

    // Connection state
    isConnected,

    // Live data from server
    participants,
    voteCount,
    revealedVotes,
    roundStatus,

    // Emit helpers
    joinSession,
    placeChip,
    revealChips,
    newRound,
  }
}

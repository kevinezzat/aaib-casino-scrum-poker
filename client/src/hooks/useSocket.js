import { useState, useEffect, useRef, useCallback } from 'react'
import { io as ioClient } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [participantLeft, setParticipantLeft] = useState(null)
  const [lockedEstimation, setLockedEstimation] = useState(null) // { storyId, finalValue, nextStory }

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
      setLockedEstimation(null)
    })

    socket.on('issue-selected', (data) => {
      setSelectedIssue(data.story || null)
    })

    socket.on('estimation-locked', (data) => {
      // Update round status back to voting so the table resets
      setRoundStatus(data.status || 'voting')
      setRevealedVotes(null)
      setVoteCount({ count: 0, total: 0 })
      // Expose locked result so the page can auto-advance the issue
      setLockedEstimation({
        storyId: data.storyId,
        finalValue: data.finalValue,
        story: data.story,
        nextStory: data.nextStory || null,
      })
    })

    socket.on('session-ended', (data) => {
      setSessionEnded(true)
    })

    socket.on('participant-left', (data) => {
      setParticipantLeft({ name: data.name, timestamp: Date.now() })
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
  const joinSession = useCallback((roomCode, playerName, hostToken, role = 'voter') => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit(
        'join-session',
        { roomCode, playerName, hostToken, role },
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

  /**
   * Select a new issue to estimate (host only).
   * @param {string} sessionId
   * @param {string} storyId
   * @returns {Promise<object>}
   */
  const selectIssue = useCallback((sessionId, storyId) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit('select-issue', { sessionId, storyId }, (response) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }, [])

  /**
   * Lock in a final estimation for a story (host only).
   * @param {string} sessionId
   * @param {string} storyId
   * @param {number|string} finalValue — the chosen estimation
   * @param {string|null} nextStoryId — optional ID of next story to auto-advance to
   * @returns {Promise<object>}
   */
  const lockEstimation = useCallback((sessionId, storyId, finalValue, nextStoryId = null) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit(
        'lock-estimation',
        { sessionId, storyId, finalValue, nextStoryId },
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
   * End the session (host only).
   * @param {string} sessionId
   * @returns {Promise<object>}
   */
  const endSession = useCallback((sessionId) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        return reject(new Error('Socket not connected'))
      }
      socket.emit('end-session', { sessionId }, (response) => {
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
    selectedIssue,
    sessionEnded,
    participantLeft,
    lockedEstimation,

    // Emit helpers
    joinSession,
    placeChip,
    revealChips,
    newRound,
    selectIssue,
    endSession,
    lockEstimation,
  }
}

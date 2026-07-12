import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchApi } from '../utils/api'
import JiraConnectButton from '../components/JiraConnectButton'
import JiraStorySelector from '../components/JiraStorySelector'
import JiraIssueList from '../components/JiraIssueList'
import CsvMappingUI from '../components/CsvMappingUI'
import { useJiraConnection } from '../hooks/useJiraConnection'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export default function CreateSessionPage() {
  const navigate = useNavigate()
  const { code: urlCode } = useParams()
  const { connected, disconnect } = useJiraConnection(urlCode)

  const [formData, setFormData] = useState({
    hostName: '',
    sessionName: '',
    deckType: 'fibonacci',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [fetchedIssues, setFetchedIssues] = useState(null)
  const [importing, setImporting] = useState(false)
  const [csvData, setCsvData] = useState(null)

  let currentStep = 1
  if (urlCode) currentStep = 2
  if (urlCode && connected) currentStep = 3
  if (urlCode && connected && fetchedIssues) currentStep = 4
  if (urlCode && csvData) currentStep = 5

  // Load hostName from session storage if they navigate back
  useEffect(() => {
    const savedName = sessionStorage.getItem('playerName')
    if (savedName && !formData.hostName) {
      setFormData(prev => ({ ...prev, hostName: savedName }))
    }
  }, [])

  const handleCreateSession = async (e) => {
    e.preventDefault()
    if (!formData.hostName.trim() || !formData.sessionName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetchApi('/api/sessions', {
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

      // Navigate to step 2 with the room code
      navigate(`/create/${data.roomCode}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartBlankSession = () => {
    if (urlCode) {
      navigate(`/session/${urlCode}?blank=true`)
    }
  }

  const handleImportStories = async (selectedIssues) => {
    setImporting(true)
    setError(null)
    try {
      const sessionRes = await fetchApi(`/api/sessions/${urlCode}`)
      if (!sessionRes.ok) throw new Error('Failed to get session info')
      const sessionData = await sessionRes.json()

      const importRes = await fetchApi(`/api/sessions/${sessionData._id}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: selectedIssues.map((i, idx) => ({
            externalId: i.key || `LOCAL-${Date.now()}-${idx}`,
            summary: i.summary || i.title,
            description: i.description || '',
            acceptanceCriteria: i.acceptanceCriteria || '',
            status: i.status || 'To Do',
            type: i.type || 'Story',
            storyPoints: i.storyPoints,
          }))
        })
      })

      if (!importRes.ok) throw new Error('Failed to import stories')

      navigate(`/session/${urlCode}`)
    } catch (err) {
      setError(err.message)
      setImporting(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError(null)
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            setError('Error parsing CSV file.')
            return
          }
          setCsvData({
            headers: results.meta.fields,
            rows: results.data
          })
        }
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = evt.target.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          if (json.length < 2) throw new Error('Spreadsheet is empty or has no data rows.')

          const headers = json[0]
          const rows = json.slice(1).map(row => {
            let obj = {}
            headers.forEach((h, i) => obj[h] = row[i])
            return obj
          })

          setCsvData({ headers, rows })
        } catch (err) {
          setError('Error parsing Excel file: ' + err.message)
        }
      }
      reader.readAsBinaryString(file)
    } else {
      setError('Unsupported file type. Please upload a .csv or .xlsx file.')
    }

    // reset input
    e.target.value = null
  }

  const renderJumpstartOption = () => (
    <div className="mt-sm">
      <div className="relative flex items-center py-4">
        <div className="flex-grow border-t border-surface-variant"></div>
        <span className="flex-shrink-0 mx-4 text-on-surface-variant font-label-sm">OR</span>
        <div className="flex-grow border-t border-surface-variant"></div>
      </div>

      <button
        onClick={handleStartBlankSession}
        disabled={loading || importing}
        className="w-full bg-transparent border-2 border-surface-variant text-on-surface-variant hover:border-secondary hover:text-secondary font-label-md py-sm rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-xs"
      >
        {loading || importing ? (
          <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
        ) : (
          <>
            Start Blank Session
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          </>
        )}
      </button>
    </div>
  )

  const stepTitles = {
    1: 'Configure your session details.',
    2: 'Choose how to import stories.',
    3: 'Select a project and board to fetch stories.',
    4: 'Select which issues to import.',
  }

  return (
    <main className="bg-surface-container-lowest text-on-surface h-screen relative flex overflow-hidden">

      {/* Left Area: Pool/Table Mock */}
      <div className="absolute top-0 left-0 w-full lg:w-[60%] h-full flex items-center justify-center pointer-events-none z-0">
        <div className="relative w-full h-full flex flex-col items-center justify-end overflow-hidden">
          {/* Abstract pool/poker table shape */}
          <div className="absolute w-[140%] h-[50%] -bottom-[10%] bg-secondary/10 rounded-[100%] shadow-[inset_0_0_80px_rgba(0,108,73,0.2)] transform -rotate-6 scale-x-125 border-[24px] border-secondary/5"></div>
          {/* Dealer Image */}
          <img src="/croupier.svg" alt="Dealer" width="450" height="450" className="relative z-10 w-[60%] max-w-[450px] object-contain drop-shadow-2xl translate-x-[-15%]" />
        </div>
      </div>

      {/* Right Area: Form */}
      <div className="relative z-10 w-full lg:w-[45%] ml-auto flex flex-col h-screen overflow-y-auto px-md py-4 lg:px-xl lg:py-md bg-surface-container-lowest/90 backdrop-blur-xl shadow-[-20px_0_40px_rgba(0,0,0,0.05)] border-l border-surface-container-high animate-fade-in">
        
        <div className="max-w-md w-full mx-auto relative my-auto">
          <div className="flex flex-col items-start mb-lg">
            <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-md shadow-sm border border-secondary/20">
              <span className="material-symbols-outlined text-secondary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                casino
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface mb-2 tracking-tight">New Session</h1>
            <p className="font-body-sm text-on-surface-variant">
              {stepTitles[currentStep]}
            </p>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container p-sm rounded-lg mb-md font-body-sm flex items-center gap-xs relative z-10">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          <div className="relative z-10">
            {currentStep === 1 && (
              <form onSubmit={handleCreateSession} className="flex flex-col gap-md animate-fade-in">
                <div className="flex flex-col gap-xs">
                  <label htmlFor="hostName" className="font-label-sm text-on-surface-variant uppercase tracking-wider ml-2">Your Name</label>
                  <input
                    id="hostName"
                    type="text"
                    required
                    maxLength={60}
                    placeholder="e.g. Scrum Master Alex"
                    className="w-full bg-surface-container-lowest border-2 border-surface-variant/50 focus:border-secondary focus:ring-4 focus:ring-secondary/20 rounded-2xl px-4 py-3 font-body-lg transition-all shadow-sm outline-none"
                    value={formData.hostName}
                    onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-xs mt-sm">
                  <label htmlFor="sessionName" className="font-label-sm text-on-surface-variant uppercase tracking-wider ml-2">Session Name / Topic</label>
                  <input
                    id="sessionName"
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Sprint 14 Planning"
                    className="w-full bg-surface-container-lowest border-2 border-surface-variant/50 focus:border-secondary focus:ring-4 focus:ring-secondary/20 rounded-2xl px-4 py-3 font-body-lg transition-all shadow-sm outline-none"
                    value={formData.sessionName}
                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-xs mt-sm mb-lg">
                  <label htmlFor="deckType" className="font-label-sm text-on-surface-variant uppercase tracking-wider ml-2">Deck Type</label>
                  <div className="relative">
                    <select
                      id="deckType"
                      className="w-full bg-surface-container-lowest border-2 border-surface-variant/50 focus:border-secondary focus:ring-4 focus:ring-secondary/20 rounded-2xl px-4 py-3 font-body-lg transition-all shadow-sm cursor-pointer appearance-none outline-none"
                      value={formData.deckType}
                      onChange={(e) => setFormData({ ...formData, deckType: e.target.value })}
                    >
                      <option value="fibonacci">Fibonacci (1, 2, 3, 5, 8, 13, 20)</option>
                      <option value="tshirt">T-Shirt (XS, S, M, L, XL)</option>
                      <option value="powers-of-2">Powers of 2 (1, 2, 4, 8, 16)</option>
                    </select>

                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!formData.hostName.trim() || !formData.sessionName.trim() || loading}
                  className="w-full bg-secondary hover:bg-secondary/90 text-on-secondary font-label-md py-4 rounded-xl uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-sm shadow-md hover:shadow-lg"
                >
                  {loading ? 'Creating...' : 'Next Step'}
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </form>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col gap-md animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">

                  {/* Jira Card */}
                  <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-xs hover:border-secondary/50 transition-colors shadow-sm hover:shadow-md">
                    <span className="material-symbols-outlined text-[28px] text-secondary">api</span>
                    <div>
                      <h2 className="font-label-md text-on-surface">Import from Jira</h2>
                      <p className="font-body-sm text-on-surface-variant mt-1 mb-2 text-balance leading-snug">
                        Connect to your Atlassian workspace to pull stories directly from a backlog or sprint.
                      </p>
                    </div>
                    <div className="mt-1">
                      <JiraConnectButton roomCode={urlCode} />
                    </div>
                  </div>

                  {/* File Upload Card */}
                  <label className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-xs hover:border-secondary/50 transition-colors shadow-sm hover:shadow-md cursor-pointer group">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <span className="material-symbols-outlined text-[28px] text-secondary group-hover:scale-110 transition-transform">upload_file</span>
                    <div>
                      <h2 className="font-label-md text-on-surface">Upload CSV / Excel</h2>
                      <p className="font-body-sm text-on-surface-variant mt-1 mb-2 text-balance leading-snug">
                        Import stories from a spreadsheet file.
                      </p>
                    </div>
                    <span className="bg-secondary/10 border border-secondary/20 px-4 py-2 mt-1 rounded-lg font-label-sm text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                      Select File
                    </span>
                  </label>
                </div>

                {renderJumpstartOption()}

                <button
                  onClick={() => navigate('/create')}
                  className="mx-auto mt-0 text-on-surface-variant hover:text-on-surface font-label-sm flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Create new session
                </button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex flex-col gap-md animate-fade-in">
                <div style={{ position: 'relative', zIndex: 10 }}>
                  <JiraStorySelector
                    roomCode={urlCode}
                    onIssuesFetched={setFetchedIssues}
                  />
                </div>

                {renderJumpstartOption()}

                <button
                  onClick={disconnect}
                  className="mx-auto mt-2 text-on-surface-variant hover:text-on-surface font-label-sm flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Switch to Excel instead
                </button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col gap-md animate-fade-in">
                <JiraIssueList
                  issues={fetchedIssues}
                  loading={importing}
                  onImport={handleImportStories}
                />
                <button
                  onClick={() => setFetchedIssues(null)}
                  className="mx-auto mt-2 text-on-surface-variant hover:text-on-surface font-label-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                  disabled={importing}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Change Filter
                </button>
                <button
                  onClick={() => { setFetchedIssues(null); disconnect() }}
                  className="mx-auto text-on-surface-variant hover:text-on-surface font-label-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                  disabled={importing}
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  Switch to Excel instead
                </button>
              </div>
            )}

            {currentStep === 5 && (
              <div className="flex flex-col gap-md animate-fade-in w-full">
                <CsvMappingUI
                  headers={csvData.headers}
                  rows={csvData.rows}
                  loading={importing}
                  onImport={handleImportStories}
                  onCancel={() => setCsvData(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

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
  const { connected } = useJiraConnection(urlCode)
  
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
        <div className="flex-grow border-t border-outline-variant"></div>
        <span className="flex-shrink-0 mx-4 text-on-surface-variant font-label-sm">OR</span>
        <div className="flex-grow border-t border-outline-variant"></div>
      </div>

      <button
        onClick={handleStartBlankSession}
        disabled={loading || importing}
        className="w-full bg-transparent border-2 border-primary text-primary hover:bg-primary/10 font-label-md py-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-xs"
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
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex items-center justify-center p-md">
      <div className="max-w-xl w-full bg-surface-container border border-outline-variant rounded-2xl p-lg shadow-xl animate-fade-in relative overflow-hidden">
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
          <p className="font-body-sm text-on-surface-variant text-center">
            {stepTitles[currentStep]}
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-sm rounded-lg mb-md font-body-sm border border-error/20 flex items-center gap-xs relative z-10">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {error}
          </div>
        )}

        <div className="relative z-10">
          {currentStep === 1 && (
            <form onSubmit={handleCreateSession} className="flex flex-col gap-md animate-fade-in">
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
                disabled={!formData.hostName.trim() || !formData.sessionName.trim() || loading}
                className="w-full bg-primary hover:bg-surface-tint text-on-primary font-label-md py-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-xs"
              >
                {loading ? 'Creating...' : 'Next Step'}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-md animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                
                {/* Jira Card */}
                <div className="bg-surface-container-highest border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center gap-sm hover:border-primary/50 transition-colors">
                  <span className="material-symbols-outlined text-[32px] text-primary">api</span>
                  <div>
                    <h3 className="font-label-lg text-on-surface">Import from Jira</h3>
                    <p className="font-body-sm text-on-surface-variant mt-1 mb-3 text-balance">
                      Connect to your Atlassian workspace to pull stories directly from a backlog or sprint.
                    </p>
                  </div>
                  <JiraConnectButton roomCode={urlCode} />
                </div>

                {/* File Upload Card */}
                <label className="bg-surface-container-highest border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center gap-sm hover:border-secondary/50 transition-colors cursor-pointer group">
                  <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls"
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                  <span className="material-symbols-outlined text-[32px] text-secondary group-hover:scale-110 transition-transform">upload_file</span>
                  <div>
                    <h3 className="font-label-lg text-on-surface">Upload CSV / Excel</h3>
                    <p className="font-body-sm text-on-surface-variant mt-1 mb-3 text-balance">
                      Import stories from a spreadsheet file.
                    </p>
                  </div>
                  <span className="bg-surface-container-highest border border-secondary px-3 py-1 rounded font-label-sm text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                    Select File
                  </span>
                </label>
              </div>

              {renderJumpstartOption()}

              <button
                onClick={() => navigate('/create')}
                className="mx-auto mt-2 text-on-surface-variant hover:text-on-surface font-label-sm flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Create new session
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-md animate-fade-in">
              <JiraStorySelector 
                roomCode={urlCode} 
                onIssuesFetched={setFetchedIssues} 
              />
              
              {renderJumpstartOption()}
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
            </div>
          )}

          {currentStep === 5 && (
            <div className="flex flex-col gap-md animate-fade-in w-full max-w-[800px] mx-auto">
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
  )
}

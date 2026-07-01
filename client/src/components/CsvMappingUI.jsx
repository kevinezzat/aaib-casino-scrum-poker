import React, { useState, useEffect } from 'react'

export default function CsvMappingUI({ headers, rows, onImport, onCancel, loading }) {
  const [mapping, setMapping] = useState({
    key: '',
    title: '',
    description: '',
    acceptanceCriteria: '',
  })

  // Try to auto-guess headers
  useEffect(() => {
    const guess = {
      key: '',
      title: '',
      description: '',
      acceptanceCriteria: '',
    }
    
    headers.forEach(h => {
      const lower = h.toLowerCase()
      if (!guess.key && (lower.includes('key') || lower === 'id')) guess.key = h
      if (!guess.title && (lower.includes('title') || lower.includes('summary') || lower.includes('name'))) guess.title = h
      if (!guess.description && lower === 'description') guess.description = h
      if (!guess.acceptanceCriteria && (lower.includes('acceptance') || lower.includes('criteria') || lower === 'ac')) guess.acceptanceCriteria = h
    })
    
    setMapping(guess)
  }, [headers])

  const handleImport = () => {
    // Map rows to stories based on user's column choices
    const mappedStories = rows.map(row => ({
      key: mapping.key ? row[mapping.key] : '',
      title: mapping.title ? row[mapping.title] : '',
      description: mapping.description ? row[mapping.description] : '',
      acceptanceCriteria: mapping.acceptanceCriteria ? row[mapping.acceptanceCriteria] : '',
    })).filter(story => story.key || story.title) // filter out completely empty rows

    onImport(mappedStories)
  }

  // Ensure title is mapped since it's the minimum requirement usually
  const isValid = mapping.title

  return (
    <div className="flex flex-col gap-md">
      <div className="text-center mb-sm">
        <h2 className="font-headline-sm text-on-surface">Map Your Columns</h2>
        <p className="font-body-sm text-on-surface-variant text-balance">
          We found {headers.length} columns in your file. Please select which columns match our fields.
        </p>
      </div>

      <div className="bg-surface-container-highest border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
        {/* Key Mapping */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-xs">
          <label className="font-label-md text-on-surface w-40">Issue Key <span className="text-secondary">*</span></label>
          <select 
            className="flex-1 bg-surface-container border-outline-variant rounded-lg font-body-sm p-xs"
            value={mapping.key}
            onChange={e => setMapping({ ...mapping, key: e.target.value })}
          >
            <option value="">-- Do not map --</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* Title Mapping */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-xs">
          <label className="font-label-md text-on-surface w-40">Title / Summary <span className="text-secondary">*</span></label>
          <select 
            className="flex-1 bg-surface-container border-outline-variant rounded-lg font-body-sm p-xs"
            value={mapping.title}
            onChange={e => setMapping({ ...mapping, title: e.target.value })}
          >
            <option value="">-- Do not map --</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* Description Mapping */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-xs">
          <label className="font-label-md text-on-surface w-40">Description</label>
          <select 
            className="flex-1 bg-surface-container border-outline-variant rounded-lg font-body-sm p-xs"
            value={mapping.description}
            onChange={e => setMapping({ ...mapping, description: e.target.value })}
          >
            <option value="">-- Do not map --</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* AC Mapping */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-xs">
          <label className="font-label-md text-on-surface w-40">Acceptance Criteria</label>
          <select 
            className="flex-1 bg-surface-container border-outline-variant rounded-lg font-body-sm p-xs"
            value={mapping.acceptanceCriteria}
            onChange={e => setMapping({ ...mapping, acceptanceCriteria: e.target.value })}
          >
            <option value="">-- Do not map --</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden mt-sm">
        <div className="p-sm bg-surface-container-highest border-b border-outline-variant">
          <h3 className="font-label-sm text-on-surface uppercase tracking-wider">Preview (First 3 rows)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/50">
                <th className="p-sm font-label-sm text-on-surface-variant">Issue Key</th>
                <th className="p-sm font-label-sm text-on-surface-variant">Title</th>
                <th className="p-sm font-label-sm text-on-surface-variant">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((row, idx) => (
                <tr key={idx} className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-highest transition-colors">
                  <td className="p-sm font-body-sm text-on-surface truncate max-w-[120px]">
                    {mapping.key ? row[mapping.key] : <span className="text-on-surface-variant/50 italic">None</span>}
                  </td>
                  <td className="p-sm font-body-sm text-on-surface truncate max-w-[200px]">
                    {mapping.title ? row[mapping.title] : <span className="text-on-surface-variant/50 italic">None</span>}
                  </td>
                  <td className="p-sm font-body-sm text-on-surface truncate max-w-[300px]">
                    {mapping.description ? row[mapping.description] : <span className="text-on-surface-variant/50 italic">None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-sm mt-md">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-surface-container border-2 border-outline-variant hover:bg-surface-container-high text-on-surface font-label-md py-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!isValid || loading}
          className="flex-[2] bg-primary hover:bg-surface-tint text-on-primary font-label-md py-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-xs"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
          ) : (
            <>
              Import {rows.length} Stories
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

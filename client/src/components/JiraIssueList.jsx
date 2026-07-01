import React, { useState } from 'react';

export default function JiraIssueList({ issues, onImport, loading }) {
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedKeys(new Set(issues.map(i => i.key)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleToggleIssue = (key) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  const handleImport = () => {
    const selected = issues.filter(i => selectedKeys.has(i.key));
    onImport(selected);
  };

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl flex flex-col animate-fade-in overflow-hidden">
      <div className="p-4 border-b border-outline-variant bg-surface-container-high flex items-center justify-between">
        <h3 className="font-label-lg text-on-surface">Fetched Issues ({issues.length})</h3>
        <span className="font-body-sm text-on-surface-variant">
          {selectedKeys.size} selected
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-highest sticky top-0 z-10">
            <tr>
              <th className="p-3 border-b border-outline-variant w-12 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary bg-surface"
                  checked={selectedKeys.size > 0 && selectedKeys.size === issues.length}
                  onChange={handleToggleSelectAll}
                />
              </th>
              <th className="p-3 border-b border-outline-variant font-label-sm text-on-surface-variant">Key</th>
              <th className="p-3 border-b border-outline-variant font-label-sm text-on-surface-variant">Summary</th>
              <th className="p-3 border-b border-outline-variant font-label-sm text-on-surface-variant">Type</th>
              <th className="p-3 border-b border-outline-variant font-label-sm text-on-surface-variant">Points</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(issue => (
              <tr key={issue.key} className="border-b border-outline-variant hover:bg-surface-container-highest transition-colors">
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary bg-surface"
                    checked={selectedKeys.has(issue.key)}
                    onChange={() => handleToggleIssue(issue.key)}
                  />
                </td>
                <td className="p-3 font-body-sm text-on-surface whitespace-nowrap">{issue.key}</td>
                <td className="p-3 font-body-sm text-on-surface">{issue.summary}</td>
                <td className="p-3">
                  <span className="inline-block px-2 py-1 bg-surface-container-high border border-outline-variant rounded text-[11px] uppercase tracking-wider text-on-surface-variant">
                    {issue.type}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-label-sm text-on-surface-variant">
                    {issue.storyPoints !== null ? issue.storyPoints : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-outline-variant bg-surface-container-high flex justify-end">
        <button
          onClick={handleImport}
          disabled={selectedKeys.size === 0 || loading}
          className="bg-primary hover:bg-surface-tint text-on-primary font-label-md py-2 px-6 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-xs shadow-md"
        >
          {loading ? 'Importing...' : `Import ${selectedKeys.size} Issues & Start`}
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
        </button>
      </div>
    </div>
  );
}

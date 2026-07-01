import React, { useState } from 'react'

export default function IssueSidebar({ issue, activeTab, onTabChange, isHost, stories = [], onSelectIssue }) {
  if (!issue && !isHost) return null // nothing to show if no issue and not a host

  const TABS = [
    { id: 'description', icon: 'description',  label: 'Description' },
    { id: 'criteria',    icon: 'fact_check',   label: 'Criteria' },
  ]

  if (isHost) {
    TABS.unshift({ id: 'queue', icon: 'list', label: 'Queue' })
  }

  // Ensure active tab is valid
  const currentTab = TABS.find(t => t.id === activeTab) ? activeTab : TABS[0].id

  const renderDescription = () => (
    <>
      <p className="font-body-sm text-body-sm text-on-surface leading-relaxed mb-sm">
        {issue?.description || 'No description provided.'}
      </p>
      {issue?.acceptanceCriteria && (
        <>
          <h3 className="font-body-sm text-body-sm font-bold text-secondary mb-xs mt-md uppercase tracking-wider">
            Acceptance Criteria
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            {issue.acceptanceCriteria.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </p>
        </>
      )}
    </>
  )

  const renderCriteria = () => (
    <div className="space-y-sm">
      <div className="flex items-start gap-sm">
        <span className="material-symbols-outlined text-secondary text-[18px] mt-[2px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <span className="font-body-sm text-body-sm text-on-surface">Criteria feature coming soon</span>
      </div>
    </div>
  )

  const renderQueue = () => {
    if (!stories || stories.length === 0) {
      return <p className="text-on-surface-variant font-body-sm">No stories imported.</p>
    }
    return (
      <div className="flex flex-col gap-xs">
        {stories.map(story => {
          const isActive = issue?._id === story._id
          return (
            <button
              key={story._id}
              onClick={() => onSelectIssue(story._id)}
              className={`text-left p-sm rounded-lg border transition-all ${
                isActive 
                  ? 'bg-primary-container border-primary text-on-primary-container' 
                  : 'bg-surface-container border-outline-variant hover:border-primary/50 text-on-surface'
              }`}
            >
              <div className="font-label-sm font-bold opacity-80">{story.externalId || story.key}</div>
              <div className="font-body-sm truncate">{story.summary || story.title}</div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'queue': return renderQueue()
      case 'description': return renderDescription()
      case 'criteria': return renderCriteria()
      default: return renderDescription()
    }
  }

  return (
    <aside
      id="sidebar"
      className="bg-surface-container-highest flex-col h-full w-80 border-l border-outline-variant py-md relative hidden md:flex animate-slide-in-right overflow-y-auto"
    >
      {/* Header */}
      <div className="px-md mb-md flex flex-col gap-xs">
        <div className="flex items-center gap-sm">
          <div className="w-9 h-9 rounded-lg border border-outline-variant bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined text-[18px]">integration_instructions</span>
          </div>
          <div>
            <h2 id="sidebar-title" className="font-headline-md text-[20px] text-primary m-0 font-bold truncate w-56">
              {issue?.externalId || issue?.key || 'Issue Details'}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant m-0 truncate w-56">
              {issue?.summary || issue?.title || 'Select an issue'}
            </p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <nav className="flex flex-col mb-auto px-base gap-xs">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={`sidebar-tab text-left px-sm py-xs rounded-lg flex items-center gap-sm transition-all font-medium ${
                isActive
                  ? 'active text-secondary font-semibold bg-surface-container-high'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              <span className="font-body-sm text-body-sm">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Tab content */}
      <div
        id="sidebar-content"
        className="flex-1 p-md overflow-y-auto mt-sm border-t border-outline-variant transition-all"
      >
        {renderTabContent()}
      </div>

      {/* Host Navigation Controls */}
      {isHost && stories?.length > 1 && (
        <div className="p-md border-t border-outline-variant flex items-center justify-between gap-sm bg-surface-container-highest">
          <button
            onClick={() => {
              const idx = stories.findIndex(s => s._id === issue?._id)
              if (idx > 0) onSelectIssue(stories[idx - 1]._id)
            }}
            disabled={!issue || stories.findIndex(s => s._id === issue._id) <= 0}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-sm py-xs rounded-lg disabled:opacity-50 flex justify-center items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            Prev
          </button>
          <button
            onClick={() => {
              const idx = stories.findIndex(s => s._id === issue?._id)
              if (idx !== -1 && idx < stories.length - 1) onSelectIssue(stories[idx + 1]._id)
            }}
            disabled={!issue || stories.findIndex(s => s._id === issue._id) >= stories.length - 1}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-sm py-xs rounded-lg disabled:opacity-50 flex justify-center items-center gap-1"
          >
            Next
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* View in Jira */}
      {issue?.externalId && (
        <div className="p-md border-t border-outline-variant">
          <a
            id="btn-jira"
            className="block text-center bg-surface border border-outline-variant text-on-surface font-label-md text-label-md py-sm rounded-lg hover:bg-surface-bright hover:border-secondary transition-all uppercase font-semibold group"
            href="#"
          >
            View in Jira{' '}
            <span className="material-symbols-outlined text-[14px] align-middle group-hover:translate-x-0.5 transition-transform">
              open_in_new
            </span>
          </a>
        </div>
      )}
    </aside>
  )
}

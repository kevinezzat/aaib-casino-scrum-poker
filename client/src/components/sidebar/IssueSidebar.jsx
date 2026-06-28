import React, { useState } from 'react'

/**
 * IssueSidebar — right sidebar, desktop only.
 * HTML ref: lines 855–904 + tab content from initTabs() lines 998–1061.
 */

const TAB_CONTENT = {
  context: (
    <div className="space-y-sm">
      {[
        ['Type',     <span className="font-body-sm text-body-sm text-on-surface font-medium bg-surface-container px-xs py-[2px] rounded">Story</span>],
        ['Priority', <span className="font-body-sm text-body-sm text-primary-container font-semibold">High</span>],
        ['Sprint',   <span className="font-body-sm text-body-sm text-on-surface font-medium">Sprint 14</span>],
        ['Reporter', <span className="font-body-sm text-body-sm text-on-surface font-medium">Ahmed K.</span>],
        ['Assignee', <span className="font-body-sm text-body-sm text-on-surface font-medium">Unassigned</span>],
        ['Labels',   (
          <div className="flex gap-xs">
            <span className="font-label-sm text-[10px] bg-secondary-container text-on-secondary-container px-xs py-[1px] rounded font-bold">auth</span>
            <span className="font-label-sm text-[10px] bg-tertiary-fixed text-on-tertiary-fixed px-xs py-[1px] rounded font-bold">oauth</span>
          </div>
        )],
      ].map(([label, value]) => (
        <div key={label} className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">{label}</span>
          {value}
        </div>
      ))}
    </div>
  ),
  description: (
    <>
      <p className="font-body-sm text-body-sm text-on-surface leading-relaxed mb-sm">
        As a user, I want to be able to log in using my Google or Microsoft account so that I don't have to remember another password.
      </p>
      <h3 className="font-body-sm text-body-sm font-bold text-secondary mb-xs mt-md uppercase tracking-wider">
        Acceptance Criteria
      </h3>
      <ul className="font-body-sm text-body-sm text-on-surface-variant list-disc pl-sm space-y-xs">
        <li>OAuth buttons are visible on login screen</li>
        <li>Successful redirect to dashboard</li>
        <li>Handling of denied permissions gracefully</li>
      </ul>
    </>
  ),
  criteria: (
    <div className="space-y-sm">
      {[
        ['check_circle', 'text-secondary', true,  'OAuth buttons are visible on login screen'],
        ['radio_button_unchecked', 'text-on-surface-variant', false, 'Successful redirect to dashboard'],
        ['radio_button_unchecked', 'text-on-surface-variant', false, 'Handling of denied permissions gracefully'],
        ['radio_button_unchecked', 'text-on-surface-variant', false, 'Token refresh logic on session timeout'],
      ].map(([icon, iconColor, filled, text]) => (
        <div key={text} className="flex items-start gap-sm">
          <span
            className={`material-symbols-outlined ${iconColor} text-[18px] mt-[2px]`}
            style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            {icon}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface">{text}</span>
        </div>
      ))}
    </div>
  ),
}

const TABS = [
  { id: 'context',     icon: 'info',         label: 'Context' },
  { id: 'description', icon: 'description',  label: 'Description' },
  { id: 'criteria',    icon: 'fact_check',   label: 'Criteria' },
]

export default function IssueSidebar({ issueKey, issueTitle, activeTab, onTabChange }) {
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
            <h2 id="sidebar-title" className="font-headline-md text-[20px] text-primary m-0 font-bold">
              Issue Details
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant m-0">Jira Context</p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <nav className="flex flex-col mb-auto px-base gap-xs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
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
        {TAB_CONTENT[activeTab] ?? TAB_CONTENT.description}
      </div>

      {/* View in Jira */}
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
    </aside>
  )
}

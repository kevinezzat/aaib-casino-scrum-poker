import React from 'react'

const NAV_ITEMS = [
  { panel: 'mobile-table-panel',  icon: 'casino',    label: 'Table' },
  { panel: 'mobile-status-panel', icon: 'analytics', label: 'Status' },
  { panel: 'mobile-chips-panel',  icon: 'token',     label: 'Chips',  defaultFilled: true },
  { panel: 'mobile-team-panel',   icon: 'group',     label: 'Team' },
]

/**
 * MobileNavBar — fixed bottom navigation, mobile only.
 * HTML ref: lines 910–927.
 */
export default function MobileNavBar({ activePanel, onPanelChange }) {
  return (
    <nav
      id="mobile-nav"
      className="bg-surface-container fixed bottom-0 left-0 w-full flex justify-around items-center px-sm z-50 rounded-t-2xl border-t border-surface-container-highest md:hidden h-[72px] pb-[env(safe-area-inset-bottom)]"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activePanel === item.panel
        return (
          <button
            key={item.panel}
            data-panel={item.panel}
            className={`mobile-nav-btn flex flex-col items-center justify-center p-xs transition-colors w-[64px] font-medium ${
              isActive
                ? 'bg-primary-container text-on-primary-container rounded-2xl'
                : 'text-on-surface-variant hover:text-primary'
            }`}
            onClick={() => onPanelChange(item.panel)}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className={`font-label-sm text-[10px] mt-0.5 uppercase ${isActive ? 'font-bold' : ''}`}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

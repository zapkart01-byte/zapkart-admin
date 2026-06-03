import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { SIDEBAR_NAV_ITEMS } from '../../constants/routes'

/**
 * Sidebar Component
 * Renders vertical navigation links, collapsible in desktop, slide-out drawer in mobile.
 * Uses the merged MD3 color palette and active navigation styles from Stitch.
 */
export default function Sidebar({ isOpen, onClose }) {
  const { adminProfile, logout } = useAuth()
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(false)

  // Get admin initials for the avatar fallback
  const getInitials = (name) => {
    if (!name) return 'SA'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <>
      {/* Mobile Overlay Background (Tap to close sidebar) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm transition-opacity md:hidden"
        />
      )}

      {/* Sidebar Panel container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out md:top-16 shadow-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header: Logo + Close Button */}
        <div className="flex items-center justify-between h-16 px-md border-b border-slate-800 md:hidden bg-slate-950">
          <div className="font-headline-md text-headline-md text-brand tracking-tight font-bold">
            ZapKart
          </div>
          <button
            onClick={onClose}
            className="p-sm text-slate-400 hover:bg-slate-800 rounded-full flex items-center justify-center h-10 w-10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
 
        {/* Navigation Links Scrollable list */}
        <div className="flex-1 overflow-y-auto px-md py-lg flex flex-col gap-xs">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-md px-md py-sm h-[44px] rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-md scale-95'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800 font-body-md'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
 
        {/* Footer Profile & Action section */}
        <div className="mt-auto border-t border-slate-800 bg-slate-950 flex flex-col transition-all duration-300">
          {/* Collapsible toggle bar header */}
          <div 
            onClick={() => setIsFooterCollapsed(prev => !prev)}
            className="flex items-center justify-between px-md py-xs border-b border-slate-800/40 bg-slate-900/10 cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Admin Profile Controls
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
              isFooterCollapsed ? 'rotate-180' : ''
            }`} />
          </div>

          {/* Collapsible Body wrapper */}
          <div className={`overflow-hidden transition-all duration-300 ${
            isFooterCollapsed ? 'max-h-0 opacity-0' : 'max-h-[300px] p-md opacity-100'
          }`}>
            {/* Admin Profile Mini Card */}
            <div className="flex items-center gap-sm mb-md p-sm rounded-lg hover:bg-slate-800 transition-colors border border-slate-800 bg-slate-900/50">
              <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-label-lg font-bold shrink-0 shadow-sm">
                {getInitials(adminProfile?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-label-md text-white truncate font-semibold">
                  {adminProfile?.name || 'Super Admin'}
                </p>
                <p className="text-body-sm text-slate-400 truncate font-medium">
                  {adminProfile?.role || 'Administrator'}
                </p>
              </div>
            </div>
   
            {/* Help & Logout Actions */}
            <div className="flex flex-col gap-xs">
              <a
                href="#"
                className="flex items-center gap-md px-md py-sm h-[40px] text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-200 rounded-lg text-body-sm"
              >
                <HelpCircle className="w-[18px] h-[18px] shrink-0 text-slate-400" />
                <span>Help Center</span>
              </a>
              <button
                onClick={logout}
                className="w-full flex items-center gap-md px-md py-sm h-[40px] text-red-400 hover:bg-red-500/10 transition-all duration-200 rounded-lg text-body-sm font-semibold text-left"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

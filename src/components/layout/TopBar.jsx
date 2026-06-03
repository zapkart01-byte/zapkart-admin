import { useLocation, Link } from 'react-router-dom'
import { Menu, Search, Bell, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../constants/routes'

/**
 * TopBar Component
 * Header component fixed at the top. Displays page titles, global search, and action triggers.
 * Responsive layout scales cleanly between desktop and mobile widths.
 */
export default function TopBar({ onToggleSidebar }) {
  const location = useLocation()
  const { adminProfile } = useAuth()

  // Dynamic Page Title mapping depending on current router path
  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/stores/')) return 'Store Details'
    if (path.startsWith('/riders/')) return 'Rider Details'
    if (path.startsWith('/orders/')) return 'Order Details'

    switch (path) {
      case ROUTES.DASHBOARD:
        return 'Overview'
      case ROUTES.STORES:
        return 'Stores Management'
      case ROUTES.RIDERS:
        return 'Riders Management'
      case ROUTES.ORDERS:
        return 'Orders Management'
      case ROUTES.PRODUCTS:
        return 'Products Monitoring'
      case ROUTES.CATEGORIES:
        return 'Categories Management'
      case ROUTES.OFFERS:
        return 'Offers & Promotions'
      case ROUTES.BANNERS:
        return 'Banners Management'
      case ROUTES.ANALYTICS:
        return 'Analytics Dashboard'
      case ROUTES.FINANCE:
        return 'Finance & Payouts'
      case ROUTES.NOTIFICATIONS:
        return 'Broadcast Notifications'
      case ROUTES.SETTINGS:
        return 'Platform Settings'
      default:
        return 'Overview'
    }
  }

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
    <nav className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center h-16 px-margin-mobile md:px-lg bg-surface border-b border-outline-variant shadow-sm">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center gap-md shrink-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-sm text-secondary hover:bg-surface-container-low transition-colors rounded-full flex items-center justify-center h-11 w-11"
          aria-label="Toggle sidebar drawer"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link
          to={ROUTES.DASHBOARD}
          className="font-headline-md text-headline-md text-primary tracking-tight font-bold cursor-pointer"
        >
          ZapKart
        </Link>
      </div>

      {/* Global search bar — hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-md mx-lg items-center bg-surface-container-low rounded-full px-md h-11 border border-outline-variant focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
        <Search className="w-5 h-5 text-secondary mr-sm shrink-0" />
        <input
          type="text"
          className="bg-transparent border-none focus:ring-0 w-full text-body-md text-on-surface outline-none placeholder:text-secondary"
          placeholder="Search orders, stores, riders..."
        />
      </div>

      {/* TopBar Action items & Profile Avatar */}
      <div className="flex items-center gap-sm">
        {/* Notifications Icon with active indicator */}
        <button
          className="p-sm text-secondary hover:bg-surface-container-low transition-colors rounded-full flex items-center justify-center h-11 w-11 relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full" />
        </button>

        {/* Global Settings button */}
        <Link
          to={ROUTES.SETTINGS}
          className="hidden sm:flex p-sm text-secondary hover:bg-surface-container-low transition-colors rounded-full items-center justify-center h-11 w-11"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>

        {/* Admin profile initials circle avatar */}
        <div className="ml-sm w-10 h-10 rounded-full bg-brand flex items-center justify-center text-on-primary text-label-lg font-bold border border-outline-variant shadow-sm shrink-0 cursor-pointer">
          {getInitials(adminProfile?.name)}
        </div>
      </div>
    </nav>
  )
}

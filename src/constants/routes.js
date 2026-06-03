import {
  LayoutDashboard,
  Store,
  Bike,
  ShoppingCart,
  Package,
  Grid3x3,
  Tag,
  Image,
  BarChart3,
  Wallet,
  Bell,
  Settings,
} from 'lucide-react'

/**
 * ZapKart Admin Route Definitions
 * All 16 routes from PRD Section 13 with metadata.
 */

// All application route paths as constants
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  STORES: '/stores',
  STORE_DETAIL: '/stores/:id',
  RIDERS: '/riders',
  RIDER_DETAIL: '/riders/:id',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:id',
  PRODUCTS: '/products',
  CATEGORIES: '/categories',
  OFFERS: '/offers',
  BANNERS: '/banners',
  ANALYTICS: '/analytics',
  FINANCE: '/finance',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
}

// Sidebar navigation items with icons and labels
export const SIDEBAR_NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { path: ROUTES.STORES, label: 'Stores', icon: Store },
  { path: ROUTES.RIDERS, label: 'Riders', icon: Bike },
  { path: ROUTES.ORDERS, label: 'Orders', icon: ShoppingCart },
  { path: ROUTES.PRODUCTS, label: 'Products', icon: Package },
  { path: ROUTES.CATEGORIES, label: 'Categories', icon: Grid3x3 },
  { path: ROUTES.OFFERS, label: 'Offers', icon: Tag },
  { path: ROUTES.BANNERS, label: 'Banners', icon: Image },
  { path: ROUTES.ANALYTICS, label: 'Analytics', icon: BarChart3 },
  { path: ROUTES.FINANCE, label: 'Finance', icon: Wallet },
  { path: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: Bell },
  { path: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
]

// Routes that do not require authentication
export const PUBLIC_ROUTES = [ROUTES.LOGIN]

// Default redirect path after login
export const DEFAULT_AUTHENTICATED_ROUTE = ROUTES.DASHBOARD

// Default redirect path when not authenticated
export const DEFAULT_UNAUTHENTICATED_ROUTE = ROUTES.LOGIN

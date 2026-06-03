import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, ProtectedRoute, PublicRoute } from './context/AuthContext'
import { ROUTES } from './constants/routes'
import PageLayout from './components/layout/PageLayout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StoresPage from './pages/StoresPage'
import StoreDetailPage from './pages/StoreDetailPage'
import RidersPage from './pages/RidersPage'
import RiderDetailPage from './pages/RiderDetailPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import OffersPage from './pages/OffersPage'
import BannersPage from './pages/BannersPage'
import AnalyticsPage from './pages/AnalyticsPage'
import FinancePage from './pages/FinancePage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'

/**
 * ZapKart Admin App
 * Root component with BrowserRouter, AuthProvider, and all route definitions.
 */

// Main application component that sets up routing and authentication
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route — only accessible when NOT logged in */}
          <Route
            path={ROUTES.LOGIN}
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected routes — require admin authentication and layout shell */}
          <Route
            element={
              <ProtectedRoute>
                <PageLayout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.STORES} element={<StoresPage />} />
            <Route path={ROUTES.STORE_DETAIL} element={<StoreDetailPage />} />
            <Route path={ROUTES.RIDERS} element={<RidersPage />} />
            <Route path={ROUTES.RIDER_DETAIL} element={<RiderDetailPage />} />
            <Route path={ROUTES.ORDERS} element={<OrdersPage />} />
            <Route path={ROUTES.ORDER_DETAIL} element={<OrderDetailPage />} />
            <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
            <Route path={ROUTES.CATEGORIES} element={<CategoriesPage />} />
            <Route path={ROUTES.OFFERS} element={<OffersPage />} />
            <Route path={ROUTES.BANNERS} element={<BannersPage />} />
            <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
            <Route path={ROUTES.FINANCE} element={<FinancePage />} />
            <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          </Route>

          {/* Default and catch-all redirects */}
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>

        {/* Global toast notification container */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '14px',
              borderRadius: '8px',
              padding: '12px 16px',
            },
            success: {
              style: {
                background: '#DCFCE7',
                color: '#16A34A',
                border: '1px solid #16A34A',
              },
            },
            error: {
              style: {
                background: '#FEE2E2',
                color: '#EF4444',
                border: '1px solid #EF4444',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

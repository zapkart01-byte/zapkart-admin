import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'

/**
 * PageLayout Component
 * Serves as the primary structural shell for all authenticated admin routes.
 * Integrates TopBar, Sidebar, and the dynamic router page content container.
 */
export default function PageLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased flex flex-col">
      {/* Dynamic Header navbar */}
      <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

      {/* Main wrapper containing fixed sidebar and scrollable pages */}
      <div className="flex flex-1 pt-16">
        {/* Left Drawer / Panel Navigation */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Dynamic page contents - responsive padding and transition shifts */}
        <main className="flex-1 w-full md:pl-[280px] p-margin-mobile md:p-lg flex flex-col gap-lg transition-all duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

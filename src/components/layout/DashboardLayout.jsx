import React, { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { ThemeToggle } from '../../lib/ThemeContext'
import NotificationBell from '../NotificationBell'

export default function DashboardLayout({ children, currentView, setCurrentView, menuItems, userProfile }) {
    const [sidebarOpen, setSidebarOpen] = useState(true)

    return (
        <div className="min-h-[100dvh] gradient-bg-light flex flex-col lg:flex-row">
            {/* Mobile Header */}
            <div
                className="lg:hidden glass-white shadow-lg p-4 flex items-center justify-between sticky top-0 z-20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
            >
                {sidebarOpen ? (
                    <div className="w-10" />
                ) : (
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 text-gray-500"
                        aria-label="Open sidebar"
                        title="Open Sidebar"
                    >
                        <Menu className="icon-fixed" />
                    </button>
                )}
                <div className="h-16 flex items-center">
                    <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        Trakby
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {userProfile && <NotificationBell userId={userProfile.id} />}
                </div>
            </div>

            {/* Shared Sidebar */}
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                currentView={currentView}
                setCurrentView={setCurrentView}
                menuItems={menuItems}
                userProfile={userProfile}
            />

            {/* Main Content Wrapper */}
            <div className="flex-1 min-w-0 transition-all duration-300">
                <div className="p-4 lg:p-8 min-h-[100dvh]">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

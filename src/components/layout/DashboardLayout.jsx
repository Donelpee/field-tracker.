import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { ThemeToggle } from '../../lib/ThemeContext'
import NotificationBell from '../NotificationBell'

export default function DashboardLayout({ children, currentView, setCurrentView, menuItems, userProfile }) {
    const [sidebarOpen, setSidebarOpen] = useState(true)

    return (
        <div className="min-h-[100dvh] gradient-bg-light flex flex-col lg:flex-row">
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-4 left-4 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 text-gray-500 z-[10000] transition-transform hover:scale-110"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
                title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
                {sidebarOpen ? <X className="icon-fixed" /> : <Menu className="icon-fixed" />}
            </button>

            {/* Mobile Header */}
            <div
                className="lg:hidden glass-white shadow-lg p-4 flex items-center justify-between sticky top-0 z-20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
            >
                <div className="w-10" />
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

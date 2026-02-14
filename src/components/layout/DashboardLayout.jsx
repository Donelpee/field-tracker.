import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { ThemeToggle } from '../../lib/ThemeContext'
import NotificationBell from '../NotificationBell'

export default function DashboardLayout({ children, currentView, setCurrentView, menuItems, userProfile, onSignOut }) {
    const [sidebarOpen, setSidebarOpen] = useState(true)

    return (
        <div className="min-h-screen gradient-bg-light flex flex-col lg:flex-row">
            {/* Mobile Header */}
            <div className="lg:hidden glass-white shadow-lg p-4 flex items-center justify-between sticky top-0 z-20 safe-top">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon">
                    {sidebarOpen ? <X className="icon-fixed" /> : <Menu className="icon-fixed" />}
                </button>
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
                <div className="p-4 lg:p-8 min-h-screen">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

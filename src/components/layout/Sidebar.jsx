import React from 'react'

export default function Sidebar({
    sidebarOpen,
    setSidebarOpen,
    currentView,
    setCurrentView,
    menuItems,
    userProfile
}) {
    return (
        <>
            <aside className={`
                fixed lg:sticky top-0 h-screen z-30 flex-shrink-0
                glass-white shadow-premium transition-all duration-300 ease-in-out flex flex-col
                ${sidebarOpen ? 'translate-x-0 w-72 overflow-visible' : '-translate-x-full w-72 lg:w-0 lg:translate-x-0 lg:overflow-hidden'}
            `}>
                <div className="p-6 border-b border-gray-100 flex-shrink-0 relative">
                    <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 hidden lg:block text-center">
                        Trakby
                    </h1>

                </div>

                {/* User Profile */}
                <div className="flex-shrink-0 p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50">
                        <div className="avatar-fixed rounded-full gradient-primary flex items-center justify-center text-white font-bold shadow-lg">
                            {userProfile?.full_name?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800 truncate">{userProfile?.full_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
                        </div>
                    </div>
                </div>

                <nav className="px-4 py-6 space-y-2 flex-1 overflow-y-auto">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setCurrentView(item.id)
                                // Don't auto-close on desktop, only mobile
                                if (window.innerWidth < 1024) setSidebarOpen(false)
                            }}
                            className={`sidebar-item w-full ${currentView === item.id ? 'active' : ''}`}
                        >
                            <item.icon className="icon-fixed" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>
        </>
    )
}

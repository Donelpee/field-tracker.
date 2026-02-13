import { useState } from 'react'
import { Settings as SettingsIcon, Briefcase, Users, Shield, Hash } from 'lucide-react'
import JobTypesManager from './JobTypesManager'
import ClientsManager from './ClientsManager'
import RolesManager from './RolesManager'

export default function Settings() {
    const [activeTab, setActiveTab] = useState('job-types')

    const tabs = [
        { id: 'job-types', label: 'Job Types', icon: Hash },
        { id: 'clients', label: 'Clients', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    ]

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fadeIn max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                    System Settings
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage standard configurations, data lists, and user access.
                </p>
            </div>

            {/* Main Content */}
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Cards for Navigation */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-3">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3 border ${isActive
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                <span className="font-semibold">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-premium border border-gray-100 dark:border-gray-700 p-6 md:p-8 min-h-[500px]">
                        {activeTab === 'job-types' && (
                            <div className="animate-fadeIn">
                                <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Job Types</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure standard job titles for easier job creation.</p>
                                </div>
                                <JobTypesManager />
                            </div>
                        )}
                        {activeTab === 'clients' && (
                            <div className="animate-fadeIn">
                                <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Clients Directory</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage client information and contacts.</p>
                                </div>
                                <ClientsManager />
                            </div>
                        )}
                        {activeTab === 'roles' && (
                            <div className="animate-fadeIn">
                                <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Roles & Permissions</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage user roles and define their access levels.</p>
                                </div>
                                <RolesManager />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from '../lib/ThemeContext'
import {
    Home, Briefcase, Users, MapPin, Image, Clock,
    Bell, Shield, TrendingUp, Settings as SettingsIcon,
    LogOut
} from 'lucide-react'

// Layout
import DashboardLayout from './layout/DashboardLayout'

// Views
import DashboardHome from './views/DashboardHome'
import StaffView from './views/StaffView'
import PhotosView from './views/PhotosView'

// Other Components
import StaffDashboard from './StaffDashboard'
import JobsBoard from './JobsBoard'
import StaffLocationHistory from './StaffLocationHistory'
import AttendanceReport from './AttendanceReport'
import LoginActivity from './LoginActivity'
import NotificationsPage from './NotificationsPage'
import NotificationBell from './NotificationBell'
import PerformanceMetrics from './PerformanceMetrics'
import Settings from './Settings'
import JobInsights from './JobInsights'

// Modals
import CreateJobModal from './CreateJobModal'

export default function Dashboard({ session, onSignOut }) {
    // State
    const [currentView, setCurrentView] = useState('dashboard')
    const [userProfile, setUserProfile] = useState(null)
    const [permissions, setPermissions] = useState([])
    const [staff, setStaff] = useState([])
    const [jobs, setJobs] = useState([])
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateJobModal, setShowCreateJobModal] = useState(false)

    // Initial Data Fetch
    useEffect(() => {
        fetchUserProfile()
    }, [])

    useEffect(() => {
        if (userProfile && userProfile?.role_id) {
            fetchPermissions(userProfile.role_id)
        }

        const role = userProfile?.role?.toLowerCase()?.trim()
        if (userProfile && role !== 'staff') {
            fetchStaff()
            fetchJobs()
            fetchPhotos()
        }
    }, [userProfile])

    // Fetch Functions
    const fetchUserProfile = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

        if (error) {
            console.error('Error fetching profile:', error)
            setUserProfile(null)
        }
        if (data) setUserProfile(data)
        setLoading(false)
    }

    const fetchPermissions = async (roleId) => {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('permissions(code)')
            .eq('role_id', roleId)

        if (error) {
            console.error('Error fetching permissions:', error)
            return
        }
        const codes = data.map(item => item.permissions.code)
        setPermissions(codes)
    }

    const fetchStaff = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('role', 'admin')
            .order('created_at', { ascending: false })

        if (error) console.error("Error fetching staff:", error)
        if (data) setStaff(data)
    }

    const fetchJobs = async () => {
        const { data, error } = await supabase
            .from('jobs')
            .select(`*, assigned_to_profile:profiles!jobs_assigned_to_fkey(full_name)`)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching jobs:', error)
        if (data) setJobs(data)
    }

    const fetchPhotos = async () => {
        const { data, error } = await supabase
            .from('photos')
            .select(`*, jobs (title, clients (name, address)), profiles (full_name)`)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching photos:', error)
        if (data) setPhotos(data)
    }

    const hasPermission = (code) => permissions.includes(code)

    // Menu Logic
    const baseMenuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home, permission: 'dashboard.view' },
        { id: 'jobs', label: 'Jobs', icon: Briefcase, permission: 'jobs.view' },
        { id: 'staff', label: 'Staff', icon: Users, permission: 'staff.view' },
        { id: 'locations', label: 'Location History', icon: MapPin, permission: 'staff.location' },
        { id: 'photos', label: 'Photos', icon: Image, permission: 'photos.view' },
        { id: 'attendance', label: 'Attendance', icon: Clock, permission: 'staff.view' },
        { id: 'notifications', label: 'Notifications', icon: Bell, permission: null },
        { id: 'login-activity', label: 'Login Activity', icon: Shield, permission: 'staff.view' },
        { id: 'performance', label: 'Performance', icon: TrendingUp, permission: 'dashboard.stats' },
        { id: 'analytics', label: 'Job Analysis', icon: Briefcase, permission: 'settings.view' },
    ]

    const menuItems = baseMenuItems.filter(item => {
        if (!item.permission) return true
        const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'Super Admin'
        return hasPermission(item.permission) || (isAdmin && permissions.length === 0)
    })

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'Super Admin'
    if (hasPermission('settings.view') || (isAdmin && permissions.length === 0)) {
        menuItems.push({ id: 'settings', label: 'Settings', icon: SettingsIcon })
    }

    // Role-based Redirects / Loading State
    if (loading) {
        return (
            <div className="min-h-screen gradient-bg-light flex items-center justify-center">
                <div className="text-center">
                    <div className="loading-spinner w-16 h-16 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    const normalizedRole = userProfile?.role?.toLowerCase()?.trim()
    const isStaff = normalizedRole === 'staff'
    const isVerifiedAdmin = normalizedRole === 'admin' || normalizedRole === 'super admin'

    if (userProfile && (isStaff || (normalizedRole === 'procurement' && !userProfile.role_id))) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
                <StaffDashboard session={session} onSignOut={onSignOut} />
            </div>
        )
    }

    if (!loading && (!userProfile || !isVerifiedAdmin)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md mx-auto">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Error</h2>
                    <p className="text-gray-600 mb-6">Unable to verify your account permissions.</p>
                    <button onClick={onSignOut} className="btn-primary w-full">Sign Out</button>
                </div>
            </div>
        )
    }

    return (
        <DashboardLayout
            currentView={currentView}
            setCurrentView={setCurrentView}
            menuItems={menuItems}
            userProfile={userProfile}
            onSignOut={onSignOut}
        >
            {/* Header Content */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                        {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Welcome back, <span className="font-semibold text-gradient-primary">{userProfile?.full_name}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:block">
                        <NotificationBell userId={session.user.id} />
                    </div>
                    <ThemeToggle />
                    <button
                        onClick={onSignOut}
                        className="group relative overflow-hidden px-6 py-3 rounded-xl font-semibold text-white transition-smooth shadow-lg hover:shadow-xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-600 transition-smooth group-hover:scale-105"></div>
                        <div className="relative flex items-center justify-center gap-2">
                            <LogOut className="icon-fixed transform group-hover:-translate-x-1 transition-smooth" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* View Content */}
            {currentView === 'dashboard' && (
                <DashboardHome staff={staff} jobs={jobs} photos={photos} />
            )}

            {currentView === 'staff' && (
                <StaffView
                    staff={staff}
                    fetchStaff={fetchStaff}
                    hasPermission={hasPermission}
                />
            )}

            {currentView === 'jobs' && (
                <div className="animate-fadeIn">
                    <JobsBoard userProfile={userProfile} onSignOut={onSignOut} permissions={permissions} />
                </div>
            )}

            {currentView === 'photos' && <PhotosView photos={photos} />}

            {/* Other Views */}
            {currentView === 'locations' && <StaffLocationHistory />}
            {currentView === 'performance' && <PerformanceMetrics />}
            {currentView === 'attendance' && <AttendanceReport onSignOut={onSignOut} />}
            {currentView === 'login-activity' && <LoginActivity />}
            {currentView === 'notifications' && <NotificationsPage userId={session.user.id} />}
            {currentView === 'settings' && <Settings />}
            {currentView === 'analytics' && <JobInsights />}

            {/* Global Modals */}
            <CreateJobModal
                isOpen={showCreateJobModal}
                onClose={() => setShowCreateJobModal(false)}
                onJobCreated={() => {
                    fetchJobs()
                    setShowCreateJobModal(false)
                }}
                staff={staff}
            />
        </DashboardLayout>
    )
}

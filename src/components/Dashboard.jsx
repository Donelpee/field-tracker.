import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
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
const StaffView = lazy(() => import('./views/StaffView'))
const PhotosView = lazy(() => import('./views/PhotosView'))

// Other Components
const StaffDashboard = lazy(() => import('./StaffDashboard'))
const JobsBoard = lazy(() => import('./JobsBoard'))
const StaffLocationHistory = lazy(() => import('./StaffLocationHistory'))
const AttendanceReport = lazy(() => import('./AttendanceReport'))
const LoginActivity = lazy(() => import('./LoginActivity'))
const NotificationsPage = lazy(() => import('./NotificationsPage'))
import NotificationBell from './NotificationBell'
const PerformanceMetrics = lazy(() => import('./PerformanceMetrics'))
const Settings = lazy(() => import('./Settings'))
const JobInsights = lazy(() => import('./JobInsights'))

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

    const fetchUserProfile = useCallback(async () => {
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
    }, [session.user.id])

    async function fetchPermissions(roleId) {
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

    async function fetchStaff() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('role', 'admin')
            .order('created_at', { ascending: false })

        if (error) console.error("Error fetching staff:", error)
        if (data) setStaff(data)
    }

    async function fetchJobs() {
        const { data, error } = await supabase
            .from('jobs')
            .select(`*, assigned_to_profile:profiles!jobs_assigned_to_fkey(full_name)`)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching jobs:', error)
        if (data) setJobs(data)
    }

    async function fetchPhotos() {
        const { data, error } = await supabase
            .from('photos')
            .select(`*, jobs (title, clients (name, address)), profiles (full_name)`)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching photos:', error)
        if (data) setPhotos(data)
    }

    // Initial Data Fetch
    useEffect(() => {
        fetchUserProfile()
    }, [fetchUserProfile])

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
    const viewFallback = (
        <div className="p-8 text-center text-gray-500">
            <div className="loading-spinner w-8 h-8 mx-auto mb-3"></div>
            <p>Loading view...</p>
        </div>
    )

    if (userProfile && (isStaff || (normalizedRole === 'procurement' && !userProfile.role_id))) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
                <Suspense fallback={viewFallback}>
                    <StaffDashboard session={session} onSignOut={onSignOut} />
                </Suspense>
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
                    <p className="text-gray-600 dark:text-gray-400 hidden lg:block">
                        Manage operations and team activity
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
                <Suspense fallback={viewFallback}>
                    <StaffView
                        staff={staff}
                        fetchStaff={fetchStaff}
                        hasPermission={hasPermission}
                    />
                </Suspense>
            )}

            {currentView === 'jobs' && (
                <Suspense fallback={viewFallback}>
                    <div className="animate-fadeIn">
                        <JobsBoard userProfile={userProfile} permissions={permissions} />
                    </div>
                </Suspense>
            )}

            {currentView === 'photos' && (
                <Suspense fallback={viewFallback}>
                    <PhotosView photos={photos} />
                </Suspense>
            )}

            {/* Other Views */}
            {currentView === 'locations' && <Suspense fallback={viewFallback}><StaffLocationHistory /></Suspense>}
            {currentView === 'performance' && <Suspense fallback={viewFallback}><PerformanceMetrics /></Suspense>}
            {currentView === 'attendance' && <Suspense fallback={viewFallback}><AttendanceReport /></Suspense>}
            {currentView === 'login-activity' && <Suspense fallback={viewFallback}><LoginActivity /></Suspense>}
            {currentView === 'notifications' && <Suspense fallback={viewFallback}><NotificationsPage userId={session.user.id} /></Suspense>}
            {currentView === 'settings' && <Suspense fallback={viewFallback}><Settings /></Suspense>}
            {currentView === 'analytics' && <Suspense fallback={viewFallback}><JobInsights /></Suspense>}

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

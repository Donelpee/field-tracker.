import { useState, useEffect } from 'react'
import { ThemeToggle } from '../lib/ThemeContext'
import { supabase } from '../lib/supabase'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Camera, MapPin, Users, Briefcase, CheckCircle, Clock, Menu, X, LogOut, Home, Image, Plus, Edit, Bell, Shield, TrendingUp, Activity, Settings as SettingsIcon } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import CreateJobModal from './CreateJobModal'
import AddStaffModal from './AddStaffModal'
import EditStaffModal from './EditStaffModal'
import StaffDashboard from './StaffDashboard'
import StaffLocationHistory from './StaffLocationHistory'
import JobsBoard from './JobsBoard'
import NotificationBell from './NotificationBell'
import NotificationsPage from './NotificationsPage'
import AttendanceReport from './AttendanceReport'
import LoginActivity from './LoginActivity'
import Pagination from './Pagination'
import PerformanceMetrics from './PerformanceMetrics'
import { SkeletonCard, SkeletonList, SkeletonGrid } from './Skeletons'
import Settings from './Settings'
import JobInsights from './JobInsights'

// Fix Leaflet default marker icon issue
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

export default function Dashboard({ session, onSignOut }) {
    const [showCreateJobModal, setShowCreateJobModal] = useState(false)
    const [showAddStaffModal, setShowAddStaffModal] = useState(false)
    const [showEditStaffModal, setShowEditStaffModal] = useState(false)
    const [selectedStaffMember, setSelectedStaffMember] = useState(null)
    const [currentView, setCurrentView] = useState('dashboard')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [userProfile, setUserProfile] = useState(null)
    const [permissions, setPermissions] = useState([])
    const [staff, setStaff] = useState([])
    const [jobs, setJobs] = useState([])
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)

    // Pagination state
    const [staffPage, setStaffPage] = useState(1)
    const [jobsPage, setJobsPage] = useState(1)
    const [photosPage, setPhotosPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        fetchUserProfile()
    }, [])

    useEffect(() => {
        if (userProfile && userProfile?.role_id) {
            fetchPermissions(userProfile.role_id)
        } else if (userProfile && userProfile.role === 'admin') {
            // Fallback for legacy admin without role_id (shouldn't happen with migration)
            // But let's be safe or just wait for role_id
        }

        const role = userProfile?.role?.toLowerCase()?.trim()
        if (userProfile && role !== 'staff') {
            fetchStaff()
            fetchJobs()
            fetchPhotos()
        }
    }, [userProfile])

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

        if (data) {
            console.log('User profile loaded:', data)
            setUserProfile(data)
        }
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

    const hasPermission = (code) => {
        return permissions.includes(code)
    }

    // Role-based redirect
    if (userProfile && (userProfile.role === 'staff' || userProfile.role === 'procurement') && !userProfile.role_id) {
        // Legacy check fallback
        return (
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
                <StaffDashboard session={session} onSignOut={onSignOut} />
            </div>
        )
    }

    if (userProfile && userProfile.role === 'staff') {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
                <StaffDashboard session={session} onSignOut={onSignOut} />
            </div>
        )
    }

    const baseMenuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home, permission: 'dashboard.view' },
        { id: 'jobs', label: 'Jobs', icon: Briefcase, permission: 'jobs.view' },
        { id: 'staff', label: 'Staff', icon: Users, permission: 'staff.view' },
        { id: 'locations', label: 'Location History', icon: MapPin, permission: 'staff.location' },
        { id: 'photos', label: 'Photos', icon: Image, permission: 'photos.view' },
        { id: 'attendance', label: 'Attendance', icon: Clock, permission: 'staff.view' }, // Using staff.view for now
        { id: 'notifications', label: 'Notifications', icon: Bell, permission: null }, // Always available
        { id: 'login-activity', label: 'Login Activity', icon: Shield, permission: 'staff.view' },
        { id: 'performance', label: 'Performance', icon: TrendingUp, permission: 'dashboard.stats' },
        { id: 'analytics', label: 'Job Analysis', icon: Briefcase, permission: 'settings.view' }, // Admin/Manager only
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
        console.log('Fetching jobs...')
        const { data, error } = await supabase
            .from('jobs')
            .select(`
        *,
        assigned_to_profile:profiles!jobs_assigned_to_fkey(full_name)
      `)
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching jobs:', error)
        if (data) {
            console.log('Jobs fetched:', data.length)
            setJobs(data)
        }
    }

    const fetchPhotos = async () => {
        const { data, error } = await supabase
            .from('photos')
            .select(`
                *,
                jobs (
                    title,
                    clients (
                        name,
                        address
                    )
                ),
                profiles (
                    full_name
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching photos:', error)
            return
        }

        if (data) setPhotos(data)
    }

    const DashboardView = () => {
        const [staffLocations, setStaffLocations] = useState([])

        useEffect(() => {
            fetchStaffLocations()

            const interval = setInterval(fetchStaffLocations, 30000)
            return () => clearInterval(interval)
        }, [])

        const fetchStaffLocations = async () => {
            const { data } = await supabase
                .from('location_history')
                .select(`
          *,
          profiles!location_history_user_id_fkey (
            full_name,
            phone,
            role,
            is_online
          )
        `)
                .order('recorded_at', { ascending: false })

            if (data) {
                const latestLocations = {}
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

                data.forEach(loc => {
                    const isRecent = new Date(loc.recorded_at) > oneHourAgo
                    // Show if explicitly online OR has recent location update
                    if ((loc.profiles?.is_online || isRecent) && !latestLocations[loc.user_id]) {
                        latestLocations[loc.user_id] = loc
                    }
                })

                setStaffLocations(Object.values(latestLocations))
            }
        }

        return (
            <div className="space-y-6 animate-fadeIn">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={Users} label="Total Staff" value={staff.length} gradient="gradient-primary" />
                    <StatCard icon={Briefcase} label="Total Jobs" value={jobs.length} gradient="gradient-success" />
                    <StatCard icon={CheckCircle} label="Completed" value={jobs.filter(j => j.status === 'completed').length} gradient="gradient-warning" />
                    <StatCard icon={Clock} label="Pending" value={jobs.filter(j => j.status === 'pending').length} gradient="gradient-secondary" />
                </div>

                {/* Live Map */}
                <div className="card-premium p-6 animate-fadeInUp">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 gradient-primary rounded-xl">
                                <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Live Staff Locations</h2>
                                <p className="text-sm text-gray-500">Real-time tracking • Updates every 30s</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-700">{staffLocations.length} Online</span>
                        </div>
                    </div>

                    <div className="h-96 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-lg">
                        <MapContainer center={[6.5244, 3.3792]} zoom={11} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {staffLocations.map((location) => (
                                <Marker
                                    key={location.user_id}
                                    position={[location.latitude, location.longitude]}
                                >
                                    <Popup>
                                        <div className="text-sm p-2">
                                            <p className="font-bold text-lg mb-1">{location.profiles?.full_name}</p>
                                            <p className="text-gray-600 mb-2">{location.profiles?.phone}</p>
                                            {location.address_short && (
                                                <p className="text-gray-700 flex items-center gap-1 mb-1">
                                                    <MapPin className="w-3 h-3" /> {location.address_short}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                                Last updated: {new Date(location.recorded_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    {/* Online Staff List */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staffLocations.map(location => (
                            <div key={location.user_id} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-lg transition-smooth group">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-smooth">{location.profiles?.full_name}</p>
                                        {location.address_short ? (
                                            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {location.address_short}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-600 mt-1">
                                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(location.recorded_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse-slow shadow-lg"></div>
                                </div>
                            </div>
                        ))}
                        {staffLocations.length === 0 && (
                            <div className="col-span-3 text-center py-12">
                                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No staff online. Waiting for check-ins...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Jobs */}
                    <div className="card-premium p-6 animate-fadeInUp">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 gradient-success rounded-xl">
                                <Briefcase className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Recent Jobs</h2>
                                <p className="text-sm text-gray-500">Latest assignments</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {jobs.slice(0, 5).map(job => (
                                <div key={job.id} className="p-4 rounded-xl bg-gray-50 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-smooth group border border-transparent hover:border-green-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800 group-hover:text-green-700 transition-smooth">{job.title}</p>
                                            <p className="text-sm text-gray-600 mt-1">{job.location}</p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Assigned to: {job.assigned_to_profile?.full_name || 'Unassigned'}
                                            </p>
                                        </div>
                                        <span className={`badge ${job.status === 'completed' ? 'badge-success' :
                                            job.status === 'in_progress' ? 'badge-info' :
                                                'bg-gray-200 text-gray-700'
                                            }`}>
                                            {job.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {jobs.length === 0 && (
                                <div className="text-center py-8">
                                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No jobs yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Photos */}
                    <div className="card-premium p-6 animate-fadeInUp">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 gradient-warning rounded-xl">
                                <Image className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Recent Photos</h2>
                                <p className="text-sm text-gray-500">Latest uploads</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {photos.slice(0, 4).map(photo => (
                                <div key={photo.id} className="relative group overflow-hidden rounded-xl aspect-square">
                                    <img
                                        src={photo.file_path}
                                        alt="Job photo"
                                        className="w-full h-full object-cover transition-smooth group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-end p-3">
                                        <div className="text-white text-xs">
                                            <p className="font-semibold truncate">{photo.jobs?.title}</p>
                                            <p className="text-gray-200 mt-1 truncate">{photo.profiles?.full_name}</p>
                                        </div>
                                    </div>
                                    {photo.is_urgent && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-md"></div>
                                    )}
                                </div>
                            ))}
                            {photos.length === 0 && (
                                <div className="col-span-2 text-center py-8">
                                    <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No photos yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const StaffView = () => {
        const [searchQuery, setSearchQuery] = useState('')

        const filteredStaff = staff.filter(member =>
            member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.phone?.includes(searchQuery) ||
            member.phone_number?.includes(searchQuery) ||
            member.role?.toLowerCase().includes(searchQuery.toLowerCase())
        )

        const startIndex = (staffPage - 1) * itemsPerPage
        const paginatedStaff = filteredStaff.slice(startIndex, startIndex + itemsPerPage)

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="card-premium p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="p-3 gradient-primary rounded-xl shrink-0">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Staff Members</h2>
                                <p className="text-sm text-gray-500">{filteredStaff.length} found</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            {/* Search Field */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search staff..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value)
                                        setStaffPage(1) // Reset to page 1 on search
                                    }}
                                    className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full sm:w-64 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {hasPermission('staff.create') && (
                                <button
                                    onClick={() => setShowAddStaffModal(true)}
                                    className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <Plus className="icon-fixed" />
                                    <span>Add Staff</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {paginatedStaff.map(member => (
                            <div
                                key={member.id}
                                onClick={() => {
                                    setSelectedStaffMember(member)
                                    setShowEditStaffModal(true)
                                }}
                                className="flex items-center justify-between p-5 rounded-xl bg-gray-50 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 cursor-pointer group transition-smooth border border-transparent hover:border-purple-200 hover:shadow-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="avatar-fixed rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {member.full_name?.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 group-hover:text-purple-700 transition-smooth">{member.full_name}</p>
                                        <p className="text-sm text-gray-600">{member.phone_number || member.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`badge ${member.status === 'active' || !member.status ? 'badge-success' :
                                        member.status === 'suspended' ? 'badge-warning' :
                                            'badge-error'
                                        }`}>
                                        {member.status || 'Active'}
                                    </span>
                                    <Edit className="icon-fixed text-gray-400 opacity-0 group-hover:opacity-100 transition-smooth" />
                                </div>
                            </div>
                        ))}
                        {filteredStaff.length === 0 && (
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No staff members found</p>
                                <p className="text-gray-400 text-sm mt-2">Try adjusting your search terms</p>
                            </div>
                        )}
                    </div>

                    {filteredStaff.length > itemsPerPage && (
                        <div className="mt-6">
                            <Pagination
                                currentPage={staffPage}
                                totalItems={filteredStaff.length} // Use filtered length
                                itemsPerPage={itemsPerPage}
                                onPageChange={setStaffPage}
                            />
                        </div>
                    )}
                </div>

                <AddStaffModal
                    isOpen={showAddStaffModal}
                    onClose={() => setShowAddStaffModal(false)}
                    onStaffAdded={() => {
                        fetchStaff()
                        setShowAddStaffModal(false)
                    }}
                />

                <EditStaffModal
                    isOpen={showEditStaffModal}
                    onClose={() => {
                        setShowEditStaffModal(false)
                        setSelectedStaffMember(null)
                    }}
                    staffMember={selectedStaffMember}
                    onStaffUpdated={() => {
                        fetchStaff()
                        setShowEditStaffModal(false)
                        setSelectedStaffMember(null)
                    }}
                />
            </div>
        )
    }

    const JobsView = () => (
        <div className="animate-fadeIn">
            <JobsBoard userProfile={userProfile} onSignOut={onSignOut} permissions={permissions} />
        </div>
    )

    const PhotosView = () => {
        const [viewMode, setViewMode] = useState('grid') // 'grid' or 'grouped'
        const [groupedPhotos, setGroupedPhotos] = useState({})

        useEffect(() => {
            if (viewMode !== 'grid') {
                const grouped = photos.reduce((acc, photo) => {
                    let key = 'Unassigned'
                    if (viewMode === 'job' || viewMode === 'grouped') key = photo.jobs?.title || 'No Job' // Handle legacy 'grouped' just in case
                    else if (viewMode === 'staff') key = photo.profiles?.full_name || 'Unknown Staff'
                    else if (viewMode === 'client') key = photo.jobs?.clients?.name || 'No Client'

                    if (!acc[key]) acc[key] = []
                    acc[key].push(photo)
                    return acc
                }, {})
                setGroupedPhotos(grouped)
            }
        }, [viewMode, photos])

        const startIndex = (photosPage - 1) * itemsPerPage
        const paginatedPhotos = photos.slice(startIndex, startIndex + itemsPerPage)

        return (
            <div className="space-y-6 animate-fadeIn">



                <div className="card-premium p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 gradient-warning rounded-xl">
                                <Image className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Photo Gallery</h2>
                                <p className="text-sm text-gray-500">{photos.length} photos collected</p>
                            </div>
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto overflow-x-auto max-w-full">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'grid'
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Grid View
                            </button>
                            <button
                                onClick={() => setViewMode('job')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'job'
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                By Job
                            </button>
                            <button
                                onClick={() => setViewMode('staff')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'staff'
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                By Staff
                            </button>
                            <button
                                onClick={() => setViewMode('client')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'client'
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                By Client
                            </button>
                        </div>
                    </div>

                    {viewMode === 'grid' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedPhotos.map(photo => (
                                    <PhotoCard key={photo.id} photo={photo} />
                                ))}
                            </div>

                            {photos.length > itemsPerPage && (
                                <div className="mt-8">
                                    <Pagination
                                        currentPage={photosPage}
                                        totalItems={photos.length}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setPhotosPage}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedPhotos).map(([groupTitle, groupPhotos]) => (
                                <div key={groupTitle} className="animate-fadeIn">
                                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                                        {viewMode === 'staff' ? <Users className="w-5 h-5 text-gray-400" /> :
                                            viewMode === 'client' ? <Briefcase className="w-5 h-5 text-gray-400" /> :
                                                <Briefcase className="w-5 h-5 text-gray-400" />}
                                        <h3 className="text-lg font-bold text-gray-700">{groupTitle}</h3>
                                        <span className="text-sm text-gray-400">({groupPhotos.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {groupPhotos.map(photo => (
                                            <PhotoCard key={photo.id} photo={photo} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {photos.length === 0 && (
                        <div className="text-center py-16">
                            <Camera className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No photos uploaded yet</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const PhotoCard = ({ photo }) => {
        const job = Array.isArray(photo.jobs) ? photo.jobs[0] : photo.jobs
        const uploader = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles

        return (
            <div className="relative group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-smooth bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col h-full">
                <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                        src={photo.file_path}
                        alt={photo.description || "Job photo"}
                        className="w-full h-full object-cover transition-smooth group-hover:scale-110"
                        loading="lazy"
                    />
                    {photo.is_urgent && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse shadow-md z-10">
                            URGENT
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">
                            Uploaded by {uploader?.full_name || 'Unknown'}
                        </p>
                    </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-3">
                        <p className="font-bold text-gray-800 dark:text-white line-clamp-1" title={job?.title}>
                            {job?.title || 'Untitled Job'}
                        </p>
                        {job?.clients?.name && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                Client: {job.clients.name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2 mb-3 flex-1">
                        <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2" title={job?.clients?.address}>
                                {job?.clients?.address || 'No location specified'}
                            </span>
                        </div>

                        {photo.description && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic">
                                    "{photo.description}"
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3 mt-auto">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(photo.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

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

    // Helper to check for staff role (case insensitive)
    const normalizedRole = userProfile?.role?.toLowerCase()?.trim()
    const isStaff = normalizedRole === 'staff'
    const isVerifiedAdmin = normalizedRole === 'admin' || normalizedRole === 'super admin'

    if (userProfile && isStaff) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
                <StaffDashboard session={session} onSignOut={onSignOut} />
            </div>
        )
    }

    // Fail Closed: If we didn't match Staff setup AND we aren't a verified Admin, show nothing.
    // This catches cases where userProfile is null (fetch failed) or role is undefined.
    if (!loading && (!userProfile || !isVerifiedAdmin)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md mx-auto">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Error</h2>
                    <p className="text-gray-600 mb-6">
                        Unable to verify your account permissions.
                    </p>
                    <div className="bg-gray-100 p-3 rounded mb-4 text-left text-xs font-mono break-all">
                        <p><strong>Debug Info:</strong></p>
                        <p>Status: {loading ? 'Loading' : 'Loaded'}</p>
                        <p>User ID: {session?.user?.id}</p>
                        <p>Profile Found: {userProfile ? 'Yes' : 'NO (Fetch Failed)'}</p>
                        <p>Role: {userProfile?.role || 'N/A'}</p>
                    </div>
                    <button onClick={onSignOut} className="btn-primary w-full">
                        Sign Out
                    </button>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => window.location.reload()}
                            className="text-blue-600 text-sm font-medium mt-2 hover:underline"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen gradient-bg-light">
            {/* Admin Identity Banner - Always visible for Admin View */}
            <div className="bg-gray-900 text-gray-400 text-[10px] p-1 text-center font-mono border-b border-gray-800">
                ADMIN VIEW | User: {userProfile?.full_name} ({userProfile?.role}) | ID: {session.user.id.slice(0, 6)}...
            </div>

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
                    <NotificationBell userId={session.user.id} />
                </div>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-72 glass-white shadow-premium transition-smooth flex flex-col`}>

                    {/* DEBUG BANNER (Temporary) */}
                    <div className="lg:hidden p-2 bg-yellow-100 text-xs break-all">
                        Role: {userProfile?.role || 'null'} | Jobs: {jobs.length} | Staff: {staff.length}
                    </div>
                    <div className="p-6 border-b border-gray-100 flex-shrink-0 flex justify-center">
                        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 hidden lg:block">
                            Trakby
                        </h1>
                    </div>

                    {/* User Profile - Moved to Top */}
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
                                    setSidebarOpen(false)
                                }}
                                className={`sidebar-item w-full ${currentView === item.id ? 'active' : ''}`}
                            >
                                <item.icon className="icon-fixed" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-4 lg:p-8 min-h-screen">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                                    {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">Welcome back, <span className="font-semibold text-gradient-primary">{userProfile?.full_name}</span></p>
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

                        {/* Content */}
                        {currentView === 'dashboard' && <DashboardView />}
                        {currentView === 'performance' && <PerformanceMetrics />}
                        {currentView === 'staff' && <StaffView />}
                        {currentView === 'jobs' && <JobsView />}
                        {currentView === 'photos' && <PhotosView />}
                        {currentView === 'locations' && <StaffLocationHistory />}
                        {currentView === 'attendance' && <AttendanceReport onSignOut={onSignOut} />}
                        {currentView === 'login-activity' && <LoginActivity />}
                        {currentView === 'notifications' && <NotificationsPage userId={session.user.id} />}
                        {currentView === 'settings' && <Settings />}
                        {currentView === 'analytics' && <JobInsights />}
                    </div>
                </div>
            </div>

            <CreateJobModal
                isOpen={showCreateJobModal}
                onClose={() => setShowCreateJobModal(false)}
                onJobCreated={() => {
                    fetchJobs()
                    setShowCreateJobModal(false)
                }}
                staff={staff}
            />
        </div>
    )
}

const StatCard = ({ icon: Icon, label, value, gradient }) => (
    <div className="card-premium card-glow group overflow-hidden relative animate-scaleIn">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-smooth">
            <div className={`absolute inset-0 ${gradient} opacity-5`}></div>
        </div>
        <div className="relative p-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">{label}</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">{value}</p>
                </div>
                <div className={`${gradient} p-4 rounded-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-smooth`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
            <div className={`mt-4 h-1 rounded-full ${gradient} opacity-20`}></div>
        </div>
    </div>
)

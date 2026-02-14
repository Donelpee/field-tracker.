import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin, Briefcase, Camera, LogOut, Clock, CheckCircle, Navigation, Menu, X, Bell, User, TrendingUp, Zap, Target, Image, RefreshCw, AlertCircle } from 'lucide-react'
import UploadPhotoModal from './UploadPhotoModal'
import NotificationBell from './NotificationBell'
import NotificationsPage from './NotificationsPage'
import AttendanceWidget from './AttendanceWidget'
import { getAddressFromCoordinates } from '../lib/location'
import { ThemeToggle } from '../lib/ThemeContext'
import { useToast } from '../lib/ToastContext'
import JobDetailsModal from './JobDetailsModal'
import Pagination from './Pagination'

export default function StaffDashboard({ session, onSignOut }) {
  const [currentView, setCurrentView] = useState('my-jobs')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [myJobs, setMyJobs] = useState([])
  const [myPhotos, setMyPhotos] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [currentAddress, setCurrentAddress] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [photosPage, setPhotosPage] = useState(1)

  // New State for Photos
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState(null)

  const itemsPerPage = 9

  useEffect(() => {
    fetchUserProfile()
    startLocationTracking()
  }, [])

  useEffect(() => {
    if (userProfile) {
      fetchMyJobs()
      fetchStaffPhotos()
    }
  }, [userProfile])

  const fetchUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (data) setUserProfile(data)
  }

  const fetchMyJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        clients (name, address)
      `)
      .eq('assigned_to', session.user.id)
      .order('created_at', { ascending: false })

    if (data) setMyJobs(data)
  }

  const fetchStaffPhotos = async () => {
    try {
      setLoadingPhotos(true)
      setPhotoError(null)
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
            )
        `)
        .eq('uploaded_by', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setMyPhotos(data)
    } catch (err) {
      console.error('Error fetching photos:', err)
      setPhotoError(`Error loading photos: ${err.message || err.error_description || 'Unknown error'}`)
      showToast('Failed to load photos', 'error')
    } finally {
      setLoadingPhotos(false)
    }
  }

  // Attendance & Efficiency
  const [myAttendance, setMyAttendance] = useState([])
  const [efficiencyScore, setEfficiencyScore] = useState(0)

  useEffect(() => {
    fetchMyAttendance()
  }, [])

  useEffect(() => {
    if (myJobs.length > 0 || myAttendance.length > 0 || myPhotos.length > 0) {
      calculateEfficiency()
    }
  }, [myJobs, myAttendance, myPhotos])

  const fetchMyAttendance = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })

    if (data) setMyAttendance(data)
  }

  const calculateEfficiency = () => {
    // 1. Job Completion (60%)
    const completedJobs = myJobs.filter(j => j.status === 'completed')
    const jobCompletionRate = myJobs.length > 0
      ? (completedJobs.length / myJobs.length)
      : 0
    const scoreJobs = Math.round(jobCompletionRate * 60)

    // 2. Punctuality (20%) - Check in before 9:00 AM
    const onTimeCheckIns = myAttendance.filter(a => {
      if (!a.check_in_time) return false
      const checkIn = new Date(a.check_in_time)
      const hour = checkIn.getHours()
      return hour < 9 || (hour === 9 && checkIn.getMinutes() === 0)
    }).length

    const punctualityRate = myAttendance.length > 0
      ? (onTimeCheckIns / myAttendance.length)
      : 0
    const scorePunctuality = Math.round(punctualityRate * 20)

    // 3. Photo Compliance (10%) - Target: 1 photo per completed job
    const photoRate = completedJobs.length > 0
      ? Math.min((myPhotos.length / completedJobs.length), 1) // Cap at 1.0
      : 0
    const scorePhotos = Math.round(photoRate * 10)

    // 4. Process Adherence (10%) - Started Jobs properly
    const startedJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'completed')
    const processRate = myJobs.length > 0
      ? (startedJobs.length / myJobs.length)
      : 0
    const scoreProcess = Math.round(processRate * 10)

    // Total Score
    const total = scoreJobs + scorePunctuality + scorePhotos + scoreProcess
    setEfficiencyScore(total)
  }

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsTracking(true)
    setLocationError(null)

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setCurrentLocation({ latitude, longitude, accuracy })

        // Update DB
        try {
          await supabase.from('location_history').insert({
            user_id: session.user.id,
            latitude,
            longitude,
            accuracy
          })

          // Get address
          const address = await getAddressFromCoordinates(latitude, longitude)
          setCurrentAddress(address)
        } catch (error) {
          console.error('Error updating location:', error)
        }
      },
      (error) => {
        console.error('Location error:', error)
        setLocationError(error.message)
        setIsTracking(false)
        if (error.code === 1) {
          showToast('Location permission denied. Please enable it.', 'error')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }

  const updateJobStatus = async (jobId, newStatus) => {
    const updateData = { status: newStatus }
    const timestamp = new Date().toISOString()

    // Get location string if available
    const locationStr = currentLocation
      ? `${currentLocation.latitude},${currentLocation.longitude}`
      : null

    if (newStatus === 'in_progress') {
      updateData.started_at = timestamp
      if (locationStr) updateData.started_location = locationStr
    } else if (newStatus === 'completed') {
      updateData.completed_at = timestamp
      if (locationStr) updateData.completed_location = locationStr
    }

    const { error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)

    if (!error) {
      fetchMyJobs()
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => ({ ...prev, status: newStatus }))
      }
      showToast(`Job marked as ${newStatus.replace('_', ' ')}`, 'success')
    } else {
      console.error("Error updating job:", error)
      showToast('Failed to update job status', 'error')
    }
  }

  const MyJobsView = () => {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StaffStatCard
            icon={Briefcase}
            label="Active Jobs"
            value={myJobs.filter(j => j.status === 'in_progress' || j.status === 'pending').length}
            gradient="gradient-staff-primary"
          />
          <StaffStatCard
            icon={CheckCircle}
            label="Completed"
            value={myJobs.filter(j => j.status === 'completed').length}
            gradient="gradient-staff-success"
          />
          <StaffStatCard
            icon={Camera}
            label="Photos"
            value={myPhotos.length}
            gradient="gradient-staff-accent"
          />
          <StaffStatCard
            icon={Zap}
            label="Efficiency"
            value={`${efficiencyScore}%`}
            gradient="gradient-staff-warning"
          />
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 gradient-staff-secondary rounded-xl">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Assigned Jobs</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your current tasks and priorities</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myJobs.map(job => (
              <div
                key={job.id}
                onClick={() => {
                  setSelectedJob(job)
                  setShowJobDetailsModal(true)
                }}
                className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer transition-smooth group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-smooth">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className={`badge ${job.status === 'completed' ? 'badge-success' :
                    job.status === 'in_progress' ? 'badge-info' :
                      'badge-ghost'
                    }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-smooth">
                  {job.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {myJobs.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No jobs assigned yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const StaffPhotosView = () => {
    const startIndex = (photosPage - 1) * itemsPerPage
    const paginatedPhotos = myPhotos.slice(startIndex, startIndex + itemsPerPage)

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="card-premium p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 gradient-staff-accent rounded-xl">
                <Image className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Photo Gallery</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Evidence and field captures</p>
              </div>
            </div>
            <button
              onClick={fetchStaffPhotos}
              disabled={loadingPhotos}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPhotos ? 'animate-spin' : ''}`} />
              {loadingPhotos ? 'Syncing...' : 'Refresh Gallery'}
            </button>
          </div>

          {photoError && (
            <div className="p-4 mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{photoError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPhotos.map(photo => {
              // Robust handling for potential array returns
              const job = Array.isArray(photo.jobs) ? photo.jobs[0] : photo.jobs

              return (
                <div key={photo.id} className="relative group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-smooth bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col h-full">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1 line-clamp-2" title={job?.clients?.address}>
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {job?.clients?.address || 'No location'}
                      </p>
                      {photo.description && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 italic">
                            "{photo.description}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-3 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-2 mt-auto">
                      <span>{new Date(photo.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {myPhotos.length === 0 && !loadingPhotos && (
              <div className="col-span-3 text-center py-16">
                <Camera className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">No photos uploaded yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Photos from your jobs will appear here</p>
                <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-800 rounded text-[10px] text-gray-300 dark:text-gray-600 font-mono inline-block">
                  Debug ID: {session.user.id.slice(0, 8)}...
                </div>
              </div>
            )}
            {myPhotos.length === 0 && loadingPhotos && (
              <div className="col-span-3 text-center py-16">
                <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Syncing your gallery...</p>
              </div>
            )}
          </div>

          {myPhotos.length > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={photosPage}
                totalItems={myPhotos.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setPhotosPage}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  const LocationView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 gradient-staff-primary rounded-xl">
            <Navigation className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Location Tracking</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Real-time position monitoring</p>
          </div>
        </div>

        {locationError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-6">
            <p className="text-red-700 dark:text-red-300 font-medium">⚠️ {locationError}</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">Please enable location services in your browser</p>
          </div>
        )}

        {currentLocation && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl gradient-staff-secondary border border-orange-100 dark:border-orange-900/30 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg">Current Location</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-300">Tracking Active</span>
                </div>
              </div>

              {currentAddress && (
                <div className="space-y-2">
                  <p className="text-white font-medium text-lg leading-snug">{currentAddress.short}</p>
                  {currentAddress.building && (
                    <p className="text-gray-300 text-sm">Building: {currentAddress.building}</p>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Latitude</p>
                    <p className="font-mono font-medium text-white">{currentLocation.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Longitude</p>
                    <p className="font-mono font-medium text-white">{currentLocation.longitude.toFixed(6)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Accuracy</p>
                    <p className="font-medium text-white">±{Math.round(currentLocation.accuracy)}m</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>ℹ️ Info:</strong> Your location is being tracked to mark attendance and verify job locations.
              </p>
            </div>
          </div>
        )}

        {!currentLocation && !locationError && (
          <div className="text-center py-12">
            <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Acquiring satellite lock...</p>
            <p className="text-xs text-gray-400 mt-2">Please ensure Location is enabled in your browser.</p>
            <button
              onClick={() => startLocationTracking()}
              className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-200 transition-colors"
            >
              Retry Location
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const menuItems = [
    { id: 'my-jobs', label: 'My Jobs', icon: Briefcase },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="min-h-screen gradient-bg-light transition-colors duration-300 text-gray-900 dark:text-gray-100">
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
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-72 glass-white shadow-staff transition-smooth`}>
          <div className="p-6 border-b border-gray-100 flex justify-center">
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Trakby
            </h1>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3 p-3 rounded-xl gradient-staff-secondary">
              <div className="avatar-fixed rounded-full gradient-staff-primary flex items-center justify-center text-white font-bold shadow-lg">
                {userProfile?.full_name?.split(' ').map(n => n[0]).join('') || <User className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{userProfile?.full_name || 'Staff Member'}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Staff Portal</p>
              </div>
            </div>
          </div>

          <nav className="px-4 py-6 space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id)
                  setSidebarOpen(false)
                }}
                className={`sidebar-item w-full ${currentView === item.id
                  ? 'gradient-staff-primary text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-orange-50 hover:to-yellow-50 dark:hover:from-gray-800 dark:hover:to-gray-800'
                  }`}
              >
                <item.icon className="icon-fixed" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-8 min-h-screen">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-2">
                  {menuItems.find(item => item.id === currentView)?.label || 'My Jobs'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Welcome, <span className="font-semibold text-gradient-staff">{userProfile?.full_name || 'Staff'}</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden lg:block">
                  <NotificationBell userId={session.user.id} />
                </div>
                <div className="hidden lg:block">
                  <ThemeToggle />
                </div>
                <button
                  onClick={onSignOut}
                  className="group relative overflow-hidden px-6 py-3 rounded-xl font-semibold text-white transition-smooth shadow-lg hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 transition-smooth group-hover:scale-105"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    <LogOut className="icon-fixed transform group-hover:-translate-x-1 transition-smooth" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Content */}
            {currentView === 'my-jobs' && <MyJobsView />}
            {currentView === 'photos' && <StaffPhotosView />}
            {currentView === 'location' && <LocationView />}
            {currentView === 'attendance' && (
              <AttendanceWidget
                userId={session.user.id}
                currentLocation={currentLocation}
                currentAddress={currentAddress}
                locationError={locationError}
                onRetryLocation={startLocationTracking}
              />
            )}
            {currentView === 'notifications' && <NotificationsPage userId={session.user.id} />}
          </div>
        </div>
      </div>

      <UploadPhotoModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
        }}
        jobId={selectedJob?.id}
        job={selectedJob}
        userId={session.user.id}
        onPhotoUploaded={() => {
          setShowUploadModal(false)
          fetchMyJobs()
          fetchStaffPhotos()
        }}
      />

      <JobDetailsModal
        isOpen={showJobDetailsModal}
        currentUserId={session.user.id}
        onClose={() => {
          setShowJobDetailsModal(false)
          setSelectedJob(null)
        }}
        job={selectedJob}
        onStatusUpdate={updateJobStatus}
        onUploadPhoto={(job) => {
          setShowJobDetailsModal(false)
          setSelectedJob(job)
          setShowUploadModal(true)
        }}
      />
    </div>
  )
}

const StaffStatCard = ({ icon: Icon, label, value, gradient }) => (
  <div className="card-premium group overflow-hidden relative animate-scaleIn">
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-smooth">
      <div className={`absolute inset-0 ${gradient} opacity-5`}></div>
    </div>
    <div className="relative p-5">
      <div className={`${gradient} p-3 rounded-xl shadow-lg w-fit mb-3 transform group-hover:scale-110 group-hover:rotate-6 transition-smooth`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs font-bold mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
)
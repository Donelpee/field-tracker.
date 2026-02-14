import React, { useState, useEffect } from 'react'
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
import DashboardLayout from './layout/DashboardLayout'

export default function StaffDashboard({ session, onSignOut }) {
  const [currentView, setCurrentView] = useState('my-jobs')
  // Sidebar state removed as it is handled by DashboardLayout
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
  const [todayAttendance, setTodayAttendance] = useState(null)

  useEffect(() => {
    fetchTodayAttendance()
  }, [])

  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', today)
      .single()

    if (data) setTodayAttendance(data)
  }

  const startLocationTracking = () => {
    setIsTracking(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsTracking(false)
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setCurrentLocation({ latitude, longitude })

        // Get address
        const address = await getAddressFromCoordinates(latitude, longitude)
        setCurrentAddress(address.short)

        // Upload to Supabase
        await supabase.from('location_history').insert({
          user_id: session.user.id,
          latitude,
          longitude,
          address_short: address.short
        })
      },
      (error) => {
        console.error('Location error:', error)
        setLocationError(error.message)
        setIsTracking(false)
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
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', jobId)

    if (!error) {
      fetchMyJobs()
      showToast('Job status updated', 'success')
    } else {
      showToast('Error updating job status', 'error')
    }
  }

  const { showToast } = useToast()

  const menuItems = [
    { id: 'my-jobs', label: 'My Jobs', icon: Briefcase },
    { id: 'photos', label: 'My Photos', icon: Image },
    { id: 'attendance', label: 'My Attendance', icon: Clock },
    { id: 'location', label: 'Location Status', icon: Navigation },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  // Pagination for Photos
  const indexOfLastPhoto = photosPage * itemsPerPage
  const indexOfFirstPhoto = indexOfLastPhoto - itemsPerPage
  const currentPhotos = myPhotos.slice(indexOfFirstPhoto, indexOfLastPhoto)

  const MyJobsView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StaffStatCard icon={Briefcase} label="Assigned Jobs" value={myJobs.length} gradient="gradient-primary" />
        <StaffStatCard icon={CheckCircle} label="Completed" value={myJobs.filter(j => j.status === 'completed').length} gradient="gradient-success" />
        <StaffStatCard icon={Clock} label="Pending" value={myJobs.filter(j => j.status === 'pending').length} gradient="gradient-warning" />
        <StaffStatCard icon={Target} label="Efficiency" value="94%" gradient="gradient-secondary" />
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-premium border border-white/20 dark:border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
          <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Today's Schedule
          </h3>
          <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-200">
            {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {myJobs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No jobs assigned for today</p>
            </div>
          ) : (
            myJobs.map(job => (
              <div
                key={job.id}
                onClick={() => {
                  setSelectedJob(job)
                  setShowJobDetailsModal(true)
                }}
                className="p-6 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{job.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {job.clients?.name}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${job.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
                    job.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-md">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {job.clients?.address}
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-md">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const StaffPhotosView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Camera className="w-6 h-6 text-purple-600" />
          My Uploaded Photos
        </h3>
        <div className="text-sm text-gray-500">
          Total: {myPhotos.length}
        </div>
      </div>

      {loadingPhotos && (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-500">Loading photos...</span>
        </div>
      )}

      {photoError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {photoError}
        </div>
      )}

      {!loadingPhotos && !photoError && myPhotos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <Image className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No photos uploaded yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Photos you upload for jobs will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPhotos.map(photo => (
            <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800">
              <img
                src={photo.url}
                alt="Job photo"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="font-bold text-lg mb-1">{photo.jobs?.title || 'Untitled Job'}</p>
                  <p className="text-sm text-gray-300 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" /> {photo.jobs?.clients?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(photo.created_at).toLocaleDateString()} • {new Date(photo.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loadingPhotos && !photoError && myPhotos.length > 0 && (
        <Pagination
          itemsPerPage={itemsPerPage}
          totalItems={myPhotos.length}
          paginate={setPhotosPage}
          currentPage={photosPage}
        />
      )}
    </div>
  )

  const LocationView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-premium p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-4 rounded-full ${isTracking ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            <Navigation className={`w-8 h-8 ${isTracking ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Location Tracking</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {isTracking ? 'Active • Updating location in real-time' : 'Inactive • Location not updating'}
            </p>
          </div>
        </div>

        {locationError && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{locationError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Coordinates</p>
            <p className="font-mono font-bold text-lg text-gray-800 dark:text-gray-200">
              {currentLocation ?
                `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                : 'Waiting for signal...'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Address</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {currentAddress || 'Locating...'}
            </p>
          </div>
        </div>

        {!isTracking && (
          <button
            onClick={startLocationTracking}
            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
          >
            Retry Tracking
          </button>
        )}
      </div>
    </div>
  )

  return (
    <DashboardLayout
      currentView={currentView}
      setCurrentView={setCurrentView}
      menuItems={menuItems}
      userProfile={userProfile}
      onSignOut={onSignOut}
    >
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
    </DashboardLayout>
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
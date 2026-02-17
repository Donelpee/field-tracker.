import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, MapPin, CheckCircle, LogIn, LogOut as LogOutIcon } from 'lucide-react'
import { useToast } from '../lib/ToastContext'

export default function AttendanceWidget({ userId, userProfile, currentLocation, currentAddress, locationError, onRetryLocation }) {
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  const fetchTodayAttendance = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    setTodayAttendance(data)
  }, [userId])

  useEffect(() => {
    fetchTodayAttendance()

    // Subscribe to attendance changes
    const channel = supabase
      .channel('attendance_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchTodayAttendance()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTodayAttendance, userId])

  const getLocationType = (address) => {
    if (!address) return 'remote'

    // You can customize this logic based on your office address
    const addressLower = address.toLowerCase()
    if (addressLower.includes('office') || addressLower.includes('head office')) {
      return 'office'
    }
    return 'field'
  }

  const sendCheckInNotification = async () => {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const locationInfo = currentAddress?.short || 'Unknown location'

        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'Staff Checked In',
          message: `${userProfile?.full_name} checked in at ${new Date().toLocaleTimeString()} from ${locationInfo}`,
          type: 'check_in',
          is_read: false
        }))

        await supabase
          .from('notifications')
          .insert(notifications)
      }
    } catch (error) {
      console.error('Error sending check-in notification:', error)
    }
  }

  const sendCheckOutNotification = async () => {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const locationInfo = currentAddress?.short || 'Unknown location'
        const hours = todayAttendance?.check_in_time
          ? ((new Date() - new Date(todayAttendance.check_in_time)) / (1000 * 60 * 60)).toFixed(2)
          : '0'

        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'Staff Checked Out',
          message: `${userProfile?.full_name} checked out at ${new Date().toLocaleTimeString()} from ${locationInfo}. Total hours: ${hours}h`,
          type: 'check_out',
          is_read: false
        }))

        await supabase
          .from('notifications')
          .insert(notifications)
      }
    } catch (error) {
      console.error('Error sending check-out notification:', error)
    }
  }

  const { showToast } = useToast()

  const handleCheckIn = async () => {
    if (!currentLocation) {
      showToast('Getting your location... Please try again.', 'warning')
      return
    }

    setCheckingIn(true)

    try {
      const locationType = getLocationType(currentAddress?.short)

      const { error } = await supabase
        .from('attendance')
        .insert([{
          user_id: userId,
          check_in_time: new Date().toISOString(),
          check_in_latitude: currentLocation.latitude,
          check_in_longitude: currentLocation.longitude,
          check_in_address: currentAddress?.short || `${currentLocation.latitude}, ${currentLocation.longitude}`,
          check_in_location_type: locationType,
          date: new Date().toISOString().split('T')[0]
        }])

      if (error) throw error

      await sendCheckInNotification()
      showToast('Checked in successfully!', 'success')
      fetchTodayAttendance()
    } catch (error) {
      showToast('Error checking in: ' + error.message, 'error')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    if (!currentLocation) {
      showToast('Getting your location... Please try again.', 'warning')
      return
    }

    if (!todayAttendance) {
      showToast('You need to check in first!', 'error')
      return
    }

    setCheckingOut(true)

    try {
      const checkInTime = new Date(todayAttendance.check_in_time)
      const checkOutTime = new Date()
      const totalHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2)

      const locationType = getLocationType(currentAddress?.short)

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out_time: checkOutTime.toISOString(),
          check_out_latitude: currentLocation.latitude,
          check_out_longitude: currentLocation.longitude,
          check_out_address: currentAddress?.short || `${currentLocation.latitude}, ${currentLocation.longitude}`,
          check_out_location_type: locationType,
          total_hours: totalHours
        })
        .eq('id', todayAttendance.id)

      if (error) throw error

      await sendCheckOutNotification()
      showToast(`Checked out! Total hours: ${totalHours}h`, 'success')
      fetchTodayAttendance()
    } catch (error) {
      showToast('Error checking out: ' + error.message, 'error')
    } finally {
      setCheckingOut(false)
    }
  }

  const getWorkingHours = () => {
    if (!todayAttendance?.check_in_time) return '0h 0m'

    const checkIn = new Date(todayAttendance.check_in_time)
    const checkOut = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : new Date()

    const diff = checkOut - checkIn
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  return (
    <div className="card-premium p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Daily Attendance</h3>
        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>

      {todayAttendance ? (
        <div className="space-y-4">
          {/* Check-in Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 p-2 rounded-full">
                <LogIn className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800">Checked In</p>
                <p className="text-sm text-green-700 mt-1">
                  {new Date(todayAttendance.check_in_time).toLocaleTimeString()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  📍 {todayAttendance.check_in_address}
                </p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                  {todayAttendance.check_in_location_type || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Check-out Info or Button */}
          {todayAttendance.check_out_time ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500 p-2 rounded-full">
                  <LogOutIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-800">Checked Out</p>
                  <p className="text-sm text-red-700 mt-1">
                    {new Date(todayAttendance.check_out_time).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    📍 {todayAttendance.check_out_address}
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                    {todayAttendance.check_out_location_type || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCheckOut}
              disabled={checkingOut || !currentLocation}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              <LogOutIcon className="w-5 h-5" />
              {checkingOut ? 'Checking Out...' : 'Check Out'}
            </button>
          )}

          {/* Working Hours */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Working Hours Today</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{getWorkingHours()}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">

            {!currentLocation && !locationError ? (
              <div className="mb-3">
                <div className="loading-spinner w-8 h-8 mx-auto border-gray-300 border-t-blue-600"></div>
              </div>
            ) : (
              <CheckCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            )}

            <p className="text-gray-600 dark:text-gray-300 mb-2">You haven't checked in today</p>

            {locationError ? (
              <div className="mb-4 px-4">
                <p className="text-red-500 text-sm mb-2">⚠️ {locationError}</p>
                <button
                  onClick={onRetryLocation}
                  className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
                >
                  Retry Location
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                {currentAddress?.short || 'Acquiring satellite lock...'}
              </p>
            )}
          </div>

          <button
            onClick={handleCheckIn}
            disabled={checkingIn || !currentLocation}
            className={`w-full py-4 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-lg ${!currentLocation
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-green-500/30 hover:scale-[1.02]'
              }`}
          >
            {checkingIn ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-6 h-6" />
            )}
            {checkingIn ? 'Checking In...' : 'Clock In Now'}
          </button>

          {!currentLocation && !locationError && (
            <p className="text-xs text-center text-gray-400 animate-pulse">
              Waiting for GPS signal...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { Calendar, User, MapPin, Clock, Search } from 'lucide-react'

export default function StaffLocationHistory() {
  const [staff, setStaff] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    fetchStaff()

    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }, [])

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .order('full_name')

    if (data) setStaff(data)
  }

  const handleSearch = async () => {
    if (!selectedStaff || !startDate || !endDate) {
      alert('Please select staff and date range')
      return
    }

    setLoading(true)

    try {
      const { data: locationData } = await supabase
        .from('location_history')
        .select('*')
        .eq('user_id', selectedStaff)
        .gte('recorded_at', `${startDate}T00:00:00`)
        .lte('recorded_at', `${endDate}T23:59:59`)
        .order('recorded_at', { ascending: true })

      const { data: jobData } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (name, address)
        `)
        .eq('assigned_to', selectedStaff)
        .gte('started_at', `${startDate}T00:00:00`)
        .lte('started_at', `${endDate}T23:59:59`)
        .order('started_at', { ascending: true })

      console.log('Location data:', locationData)
      setLocations(locationData || [])
      setJobs(jobData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMapCenter = () => {
    if (locations.length > 0) {
      return [locations[0].latitude, locations[0].longitude]
    }
    return [6.5244, 3.3792]
  }

  const getPathCoordinates = () => {
    return locations.map(loc => [loc.latitude, loc.longitude])
  }

  const selectedStaffName = staff.find(s => s.id === selectedStaff)?.full_name || 'Staff'

  return (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 gradient-primary rounded-xl">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Staff Location History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">View historical movement and routes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <label className="block text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-1 ml-1">
              Select Staff
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="input-premium pl-12 w-full appearance-none"
              >
                <option value="">Choose staff member...</option>
                {staff.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-1 ml-1">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-premium pl-12 w-full"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-1 ml-1">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-premium pl-12 w-full"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 h-[50px] mt-6 md:mt-0"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="icon-fixed" />
              )}
              {loading ? 'Searching...' : 'Search History'}
            </button>
          </div>
        </div>
      </div>

      {locations.length > 0 && (
        <>
          <div className="card-premium p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
              {selectedStaffName}'s Route - {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </h3>
            <div className="h-96 rounded-xl overflow-hidden border-2 border-gray-100 dark:border-gray-700 z-0">
              <MapContainer center={getMapCenter()} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {locations.length > 1 && (
                  <Polyline
                    positions={getPathCoordinates()}
                    color="blue"
                    weight={3}
                    opacity={0.7}
                  />
                )}

                {locations.map((loc, index) => (
                  <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                    <Popup>
                      <LocationPopup loc={loc} index={index} />
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
              <p>📍 Total points: <span className="font-semibold text-gray-800 dark:text-white">{locations.length}</span></p>
              <p>🕐 First: <span className="font-semibold text-gray-800 dark:text-white">{new Date(locations[0]?.recorded_at).toLocaleString()}</span></p>
              <p>🕐 Last: <span className="font-semibold text-gray-800 dark:text-white">{new Date(locations[locations.length - 1]?.recorded_at).toLocaleString()}</span></p>
            </div>
          </div>

          {jobs.length > 0 && (
            <div className="card-premium p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Jobs Worked On</h3>
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{job.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{job.clients?.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {job.clients?.address}
                        </p>
                        <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            <Clock className="w-3 h-3 inline mr-1" />
                            Started: {job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'}
                          </span>
                          {job.completed_at && (
                            <span>
                              Completed: {new Date(job.completed_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`badge ${job.status === 'completed' ? 'badge-success' :
                        job.status === 'in-progress' ? 'badge-info' :
                          'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-premium p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Location Timeline</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {locations.map((loc, index) => (
                <LocationTimelineItem key={loc.id} loc={loc} index={index} />
              ))}
            </div>
          </div>
        </>
      )}

      {locations.length === 0 && selectedStaff && !loading && (
        <div className="card-premium p-12 text-center">
          <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">No location data found</p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting the date range or selecting a different staff member.
          </p>
        </div>
      )}
    </div>
  )
}

function LocationTimelineItem({ loc, index }) {
  const [address, setAddress] = useState(loc.address_short || null)
  const [loadingAddress, setLoadingAddress] = useState(false)

  useEffect(() => {
    if (!address && loc.latitude && loc.longitude) {
      fetchAddress()
    }
  }, [loc])

  const fetchAddress = async () => {
    setLoadingAddress(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      if (data && data.display_name) {
        setAddress(data.display_name)
      }
    } catch (error) {
      console.error('Error fetching address:', error)
    } finally {
      setLoadingAddress(false)
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {new Date(loc.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
            {new Date(loc.recorded_at).toLocaleDateString()}
          </span>
        </div>

        <div className="mt-2">
          {loadingAddress ? (
            <p className="text-sm text-gray-400 animate-pulse">Fetching address...</p>
          ) : address ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              📍 {address}
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              📍 {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LocationPopup({ loc, index }) {
  const [address, setAddress] = useState(loc.address_short || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address && loc.latitude && loc.longitude) {
      const fetchAddress = async () => {
        setLoading(true)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`
          )
          const data = await response.json()
          if (data && data.display_name) {
            setAddress(data.display_name)
          }
        } catch (error) {
          console.error('Error fetching address:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchAddress()
    }
  }, [loc, address])

  return (
    <div className="text-sm p-1 min-w-[200px]">
      <p className="font-bold text-gray-800">Point {index + 1}</p>

      {loading ? (
        <p className="text-gray-500 text-xs mt-1 animate-pulse">Fetching address...</p>
      ) : address ? (
        <p className="text-gray-700 font-medium mt-1 leading-snug">
          📍 {address}
        </p>
      ) : (
        <p className="text-gray-500 text-xs mt-1">
          {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
        </p>
      )}

      <p className="text-gray-500 text-xs mt-2 border-t pt-1">
        {new Date(loc.recorded_at).toLocaleString()}
      </p>
    </div>
  )
}
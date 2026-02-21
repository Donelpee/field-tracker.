import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import {
    MapPin, Users, Briefcase, CheckCircle, Clock,
    Image, Camera, Activity
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { supabase } from '../../lib/supabase'

// Fix Leaflet default marker icon issue
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

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

export default function DashboardHome({ staff = [], jobs = [], photos = [] }) {
    const [staffLocations, setStaffLocations] = useState([])

    async function fetchStaffLocations() {
        const today = new Date().toISOString().split('T')[0]
        const { data: activeAttendance } = await supabase
            .from('attendance')
            .select('user_id')
            .eq('date', today)
            .is('check_out_time', null)

        const activeUserIds = new Set((activeAttendance || []).map((row) => row.user_id))
        if (activeUserIds.size === 0) {
            setStaffLocations([])
            return
        }

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

            data.forEach(loc => {
                const isStaff = String(loc.profiles?.role || '').trim().toLowerCase() === 'staff'
                const isCheckedIn = activeUserIds.has(loc.user_id)
                if (isStaff && isCheckedIn && !latestLocations[loc.user_id]) {
                    latestLocations[loc.user_id] = loc
                }
            })

            setStaffLocations(Object.values(latestLocations))
        }
    }

    useEffect(() => {
        fetchStaffLocations()
        const attendanceChannel = supabase
            .channel('dashboard-home-attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchStaffLocations)
            .subscribe()

        const locationChannel = supabase
            .channel('dashboard-home-locations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'location_history' }, fetchStaffLocations)
            .subscribe()

        const interval = setInterval(fetchStaffLocations, 30000)
        return () => {
            clearInterval(interval)
            supabase.removeChannel(attendanceChannel)
            supabase.removeChannel(locationChannel)
        }
    }, [])

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
                            <p className="text-sm text-gray-500">Checked-in staff only • Updates every 30s</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-700">{staffLocations.length} Checked In</span>
                    </div>
                </div>

                <div className="h-96 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-lg top-0 z-0 relative">
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
                            <p className="text-gray-500">No staff checked in. Waiting for check-ins...</p>
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

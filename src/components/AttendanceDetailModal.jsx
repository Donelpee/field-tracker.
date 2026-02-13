import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, MapPin, Clock, Calendar, User } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet marker icon
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

export default function AttendanceDetailModal({ isOpen, onClose, record }) {
    if (!record) return null

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all">
                                <div className="gradient-primary p-6 flex justify-between items-center text-white">
                                    <Dialog.Title className="text-xl font-bold flex items-center gap-2">
                                        <Clock className="w-6 h-6" />
                                        Attendance Details
                                    </Dialog.Title>
                                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-smooth">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Staff Info */}
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
                                        <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                            {record.profiles?.full_name?.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{record.profiles?.full_name}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">{record.profiles?.phone}</p>
                                        </div>
                                        <div className="ml-auto">
                                            <span className="badge badge-info text-sm px-3 py-1">
                                                {new Date(record.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Time Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Check In */}
                                        <div className="p-4 rounded-xl border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20">
                                            <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                                                <Clock className="w-4 h-4" /> Check In
                                            </h4>
                                            <p className="text-xl font-bold text-green-900 dark:text-green-300">
                                                {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : 'N/A'}
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-400/80 mt-1 flex items-start gap-1">
                                                <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                                                {record.check_in_address || 'Location not recorded'}
                                            </p>
                                        </div>

                                        {/* Check Out */}
                                        <div className="p-4 rounded-xl border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                                            <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2 flex items-center gap-2">
                                                <Clock className="w-4 h-4" /> Check Out
                                            </h4>
                                            <p className="text-xl font-bold text-purple-900 dark:text-purple-300">
                                                {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : 'Not checked out'}
                                            </p>
                                            <p className="text-sm text-purple-700 dark:text-purple-400/80 mt-1 flex items-start gap-1">
                                                <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                                                {record.check_out_address || 'Location not recorded'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Map (if coordinates exist) */}
                                    {(record.check_in_latitude || record.check_out_latitude) && (
                                        <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
                                            <MapContainer
                                                center={[
                                                    record.check_in_latitude || record.check_out_latitude || 0,
                                                    record.check_in_longitude || record.check_out_longitude || 0
                                                ]}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                            >
                                                <TileLayer
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                    attribution='&copy; OpenStreetMap contributors'
                                                />
                                                {record.check_in_latitude && (
                                                    <Marker position={[record.check_in_latitude, record.check_in_longitude]}>
                                                        <Popup>Check In Location</Popup>
                                                    </Marker>
                                                )}
                                                {record.check_out_latitude && (
                                                    <Marker position={[record.check_out_latitude, record.check_out_longitude]}>
                                                        <Popup>Check Out Location</Popup>
                                                    </Marker>
                                                )}
                                            </MapContainer>
                                        </div>
                                    )}

                                    {/* Total Hours */}
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Total Hours Worked</span>
                                        <span className="text-xl font-bold text-gray-800 dark:text-white">{record.total_hours || 0} hrs</span>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

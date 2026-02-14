import React, { useState, useEffect } from 'react'
import { Image, Camera, MapPin, Clock, Briefcase, Users } from 'lucide-react'
import Pagination from '../Pagination'

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

export default function PhotosView({ photos = [] }) {
    const [viewMode, setViewMode] = useState('grid') // 'grid' or 'grouped'
    const [groupedPhotos, setGroupedPhotos] = useState({})
    const [photosPage, setPhotosPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        if (viewMode !== 'grid') {
            const grouped = photos.reduce((acc, photo) => {
                let key = 'Unassigned'
                if (viewMode === 'job' || viewMode === 'grouped') key = photo.jobs?.title || 'No Job'
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

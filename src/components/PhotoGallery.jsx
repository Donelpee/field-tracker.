import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Image as ImageIcon, Maximize2, X } from 'lucide-react'

export default function PhotoGallery({ jobId }) {
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('all')
    const [selectedPhoto, setSelectedPhoto] = useState(null)

    const fetchPhotos = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('job_id', jobId)
                .order('created_at', { ascending: false })

            if (error) throw error
            console.log('Fetched Photos:', data) // Debugging
            setPhotos(data || [])
        } catch (error) {
            console.error('Error fetching photos:', error)
        } finally {
            setLoading(false)
        }
    }, [jobId])

    useEffect(() => {
        fetchPhotos()
    }, [fetchPhotos])

    const filteredPhotos = photos.filter(photo => {
        const desc = photo.description?.toUpperCase() || ''
        if (activeTab === 'all') return true
        if (activeTab === 'before') return desc.includes('[BEFORE]')
        if (activeTab === 'after') return desc.includes('[AFTER]')
        return true
    })

    if (loading) return <div className="p-4 text-center text-gray-500">Loading gallery...</div>

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl w-fit">
                {['all', 'before', 'after'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {filteredPhotos.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No photos found in this category</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredPhotos.map(photo => (
                        <div
                            key={photo.id}
                            className="group relative aspect-square bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-700"
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            <img
                                src={photo.file_path}
                                alt={photo.description}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-6 h-6 text-white" />
                            </div>
                            {/* Type Badge */}
                            <div className="absolute top-2 left-2">
                                {photo.description?.includes('[BEFORE]') && (
                                    <span className="bg-yellow-500/90 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md shadow-sm">Before</span>
                                )}
                                {photo.description?.includes('[AFTER]') && (
                                    <span className="bg-green-500/90 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md shadow-sm">After</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <img
                            src={selectedPhoto.file_path}
                            alt={selectedPhoto.description}
                            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                        />
                        <div className="mt-4 text-white">
                            <p className="text-lg font-medium">
                                {selectedPhoto.description?.replace(/\[BEFORE\]|\[AFTER\]/g, '').trim()}
                            </p>
                            <p className="text-sm text-gray-400">
                                Uploaded {new Date(selectedPhoto.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

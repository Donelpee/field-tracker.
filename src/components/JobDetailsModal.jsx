import { useState } from 'react'
import { X, MapPin, Calendar, Clock, User, Phone, FileText, Camera, CheckCircle, Zap, Image as ImageIcon, MessageSquare } from 'lucide-react'
import PhotoGallery from './PhotoGallery'
import CommentsList from './CommentsList'

export default function JobDetailsModal({ isOpen, onClose, job, onStatusUpdate, onUploadPhoto, currentUserId }) {
    const [activeTab, setActiveTab] = useState('details')

    if (!isOpen || !job) return null

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return 'badge-success'
            case 'in_progress':
                return 'badge-info'
            default:
                return 'bg-gray-200 text-gray-700'
        }
    }

    const handleAction = (action) => {
        if (action === 'upload') {
            onUploadPhoto(job)
        } else {
            onStatusUpdate(job.id, action)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`badge ${getStatusBadge(job.status)}`}>
                                {job.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-400">#{job.id.slice(0, 8)}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{job.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex gap-6">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'photos' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <ImageIcon className="w-4 h-4" />
                        Photos
                    </button>
                    <button
                        onClick={() => setActiveTab('comments')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'comments' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Comments
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-[300px]">

                    {activeTab === 'details' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Description */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                                <div className="flex gap-3">
                                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Description</h3>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {job.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Client & Location Details */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Client Details</h3>

                                    {job.clients ? (
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-3">
                                            <div className="flex items-start gap-3">
                                                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{job.clients.name}</p>
                                                    <p className="text-sm text-gray-500">Client Name</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{job.clients.address}</p>
                                                    <p className="text-sm text-gray-500">Address</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{job.clients.phone || 'N/A'}</p>
                                                    <p className="text-sm text-gray-500">Phone</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No client information linked.</p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Job Info</h3>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-3">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-5 h-5 text-purple-500" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{job.location}</p>
                                                <p className="text-sm text-gray-500">Service Location</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-orange-500" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {new Date(job.created_at).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm text-gray-500">Created Date</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'photos' && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Evidence Gallery</h3>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Before & After Photos</span>
                            </div>

                            <PhotoGallery jobId={job.id} />

                            {(job.status === 'in_progress' || job.status === 'pending') && (
                                <div className="mt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Tip: Take "Before" photos when you arrive and "After" photos when done.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleAction('upload')}
                                        className="w-full py-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl flex flex-col items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-medium group"
                                    >
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                                            <Camera className="w-6 h-6" />
                                        </div>
                                        <span>Click to Take Photo</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="animate-fadeIn">
                            <CommentsList jobId={job.id} userId={currentUserId} />
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl sticky bottom-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {job.status === 'pending' && (
                            <button
                                onClick={() => handleAction('in_progress')}
                                className="btn-primary flex-1 flex items-center justify-center gap-2 w-full"
                            >
                                <Zap className="w-5 h-5" />
                                <span>Start Job</span>
                            </button>
                        )}

                        {job.status === 'in_progress' && (
                            <>
                                <button
                                    onClick={() => handleAction('upload')}
                                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-5 h-5" />
                                    <span>Upload Photo</span>
                                </button>
                                <button
                                    onClick={() => handleAction('completed')}
                                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Complete Job</span>
                                </button>
                            </>
                        )}

                        {job.status === 'completed' && (
                            <div className="w-full text-center py-2 text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Job Completed
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

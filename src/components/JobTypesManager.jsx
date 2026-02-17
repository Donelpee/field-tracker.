import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2, Save, X, Search, Briefcase } from 'lucide-react'
import { useToast } from '../lib/ToastContext'
import Pagination from './Pagination'

export default function JobTypesManager() {
    const [jobTypes, setJobTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Edit/Add state
    const [isEditing, setIsEditing] = useState(null) // ID of item being edited
    const [showAddForm, setShowAddForm] = useState(false)
    const [formData, setFormData] = useState({ title: '', description: '' })

    const { showToast } = useToast()

    const fetchJobTypes = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('job_types')
                .select('*')
                .order('title', { ascending: true })

            if (error) throw error
            setJobTypes(data || [])
        } catch (error) {
            console.error('Error fetching job types:', error)
            showToast('Failed to load job types', 'error')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        fetchJobTypes()
    }, [fetchJobTypes])

    const handleSave = async (e) => {
        e.preventDefault()
        if (!formData.title.trim()) return

        try {
            if (isEditing) {
                // Update existing
                const { error } = await supabase
                    .from('job_types')
                    .update({
                        title: formData.title,
                        description: formData.description
                    })
                    .eq('id', isEditing)

                if (error) throw error
                showToast('Job type updated successfully', 'success')
            } else {
                // Create new
                const { error } = await supabase
                    .from('job_types')
                    .insert([{
                        title: formData.title,
                        description: formData.description
                    }])

                if (error) throw error
                showToast('Job type added successfully', 'success')
            }

            // Reset and refresh
            setFormData({ title: '', description: '' })
            setIsEditing(null)
            setShowAddForm(false)
            fetchJobTypes()
        } catch (error) {
            console.error('Error saving job type:', error)
            showToast(error.message, 'error')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this job type?')) return

        try {
            const { error } = await supabase
                .from('job_types')
                .delete()
                .eq('id', id)

            if (error) throw error
            showToast('Job type deleted', 'success')
            fetchJobTypes()
        } catch (error) {
            console.error('Error deleting job type:', error)
            showToast('Failed to delete job type', 'error')
        }
    }

    const startEdit = (type) => {
        setFormData({ title: type.title, description: type.description || '' })
        setIsEditing(type.id)
        setShowAddForm(true)
    }

    const filteredTypes = jobTypes.filter(type =>
        type.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredTypes.length / itemsPerPage))
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [filteredTypes.length, currentPage])

    const totalItems = filteredTypes.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedTypes = filteredTypes.slice(startIndex, startIndex + itemsPerPage)

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search job types..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-premium pl-10 w-full"
                    />
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => {
                            setFormData({ title: '', description: '' })
                            setIsEditing(null)
                            setShowAddForm(true)
                        }}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Job Type
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-slideDown shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {isEditing ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
                            {isEditing ? 'Edit Job Type' : 'New Job Type'}
                        </h3>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Job Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="input-premium w-full"
                                placeholder="e.g., HVAC Repair"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="input-premium w-full resize-none"
                                placeholder="Optional description..."
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid gap-3">
                {loading ? (
                    <div className="text-center py-10 text-gray-500 animate-pulse">Loading job types...</div>
                ) : filteredTypes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                            <Briefcase className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium">No job types found</p>
                        <p className="text-sm mt-1 opacity-70">Add one to get started</p>
                    </div>
                ) : (
                    paginatedTypes.map((type) => (
                        <div
                            key={type.id}
                            className="group bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex justify-between items-center"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-white text-lg">{type.title}</h4>
                                    {type.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{type.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => startEdit(type)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(type.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!loading && filteredTypes.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}
        </div>
    )
}

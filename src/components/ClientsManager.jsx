import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2, Save, X, Search, User, MapPin, Phone, Building } from 'lucide-react'
import { useToast } from '../lib/ToastContext'
import Pagination from './Pagination'

export default function ClientsManager() {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    // Edit/Add state
    const [isEditing, setIsEditing] = useState(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contact_person: '',
        phone: ''
    })

    const { showToast } = useToast()

    const fetchClients = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            setClients(data || [])
        } catch (error) {
            console.error('Error fetching clients:', error)
            showToast('Failed to load clients', 'error')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        fetchClients()
    }, [fetchClients])

    const handleSave = async (e) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.address.trim()) {
            showToast('Name and Address are required', 'warning')
            return
        }

        try {
            if (isEditing) {
                // Update
                const { error } = await supabase
                    .from('clients')
                    .update({
                        name: formData.name,
                        address: formData.address,
                        contact_person: formData.contact_person,
                        phone: formData.phone
                    })
                    .eq('id', isEditing)

                if (error) throw error
                showToast('Client updated successfully', 'success')
            } else {
                // Create
                const { error } = await supabase
                    .from('clients')
                    .insert([{
                        name: formData.name,
                        address: formData.address,
                        contact_person: formData.contact_person,
                        phone: formData.phone
                    }])

                if (error) throw error
                showToast('Client added successfully', 'success')
            }

            setFormData({ name: '', address: '', contact_person: '', phone: '' })
            setIsEditing(null)
            setShowAddForm(false)
            fetchClients()
        } catch (error) {
            console.error('Error saving client:', error)
            showToast(error.message, 'error')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this client? Jobs linked to this client might be affected.')) return

        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id)

            if (error) throw error
            showToast('Client deleted', 'success')
            fetchClients()
        } catch (error) {
            console.error('Error deleting client:', error)
            showToast('Failed to delete client (might be linked to jobs)', 'error')
        }
    }

    const startEdit = (client) => {
        setFormData({
            name: client.name,
            address: client.address,
            contact_person: client.contact_person || '',
            phone: client.phone || ''
        })
        setIsEditing(client.id)
        setShowAddForm(true)
    }

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.address.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage))
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [filteredClients.length, currentPage])

    const totalItems = filteredClients.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage)

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-premium pl-10 w-full"
                    />
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => {
                            setFormData({ name: '', address: '', contact_person: '', phone: '' })
                            setIsEditing(null)
                            setShowAddForm(true)
                        }}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Client
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-slideDown shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {isEditing ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
                            {isEditing ? 'Edit Client' : 'New Client'}
                        </h3>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Client Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="input-premium w-full"
                                placeholder="Business Name"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                required
                                className="input-premium w-full"
                                placeholder="Full Address"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Contact Person
                            </label>
                            <input
                                type="text"
                                name="contact_person"
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                className="input-premium w-full"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input-premium w-full"
                                placeholder="Optional"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-4">
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
                                {isEditing ? 'Update Client' : 'Save Client'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid gap-3">
                {loading ? (
                    <div className="text-center py-10 text-gray-500 animate-pulse">Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                            <Building className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium">No clients found</p>
                    </div>
                ) : (
                    paginatedClients.map((client) => (
                        <div
                            key={client.id}
                            className="group bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                                    <Building className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-white text-lg">{client.name}</h4>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" /> {client.address}
                                        </p>
                                        {(client.contact_person || client.phone) && (
                                            <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2">
                                                {client.contact_person && (
                                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {client.contact_person}</span>
                                                )}
                                                {client.phone && (
                                                    <span className="flex items-center gap-1 border-l pl-2 border-gray-200 dark:border-gray-700"><Phone className="w-3 h-3" /> {client.phone}</span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto justify-end">
                                <button
                                    onClick={() => startEdit(client)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(client.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!loading && filteredClients.length > 0 && (
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

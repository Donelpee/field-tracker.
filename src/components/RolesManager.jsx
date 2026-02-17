import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Trash2, Edit2, Shield, Check, X, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { useToast } from '../lib/ToastContext'
import Pagination from './Pagination'

export default function RolesManager() {
    const [roles, setRoles] = useState([])
    const [permissions, setPermissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRole, setEditingRole] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        selectedPermissions: [] // Array of permission IDs
    })

    const { showToast } = useToast()

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch Roles with their permissions
            const { data: rolesData, error: rolesError } = await supabase
                .from('roles')
                .select(`
          *,
          role_permissions (
            permission_id
          )
        `)
                .order('name')

            if (rolesError) throw rolesError

            // Fetch All Available Permissions
            const { data: permissionsData, error: permissionsError } = await supabase
                .from('permissions')
                .select('*')
                .order('module, name')

            if (permissionsError) throw permissionsError

            // Transform roles data to include array of permission IDs
            const formattedRoles = rolesData.map(role => ({
                ...role,
                permissionIds: role.role_permissions.map(rp => rp.permission_id)
            }))

            setRoles(formattedRoles)
            setPermissions(permissionsData)
        } catch (error) {
            console.error('Error fetching data:', error)
            showToast('Failed to load roles data', 'error')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleOpenModal = (role = null) => {
        if (role) {
            setEditingRole(role)
            setFormData({
                name: role.name,
                description: role.description || '',
                selectedPermissions: role.permissionIds || []
            })
        } else {
            setEditingRole(null)
            setFormData({
                name: '',
                description: '',
                selectedPermissions: []
            })
        }
        setIsModalOpen(true)
    }

    const handleTogglePermission = (permissionId) => {
        setFormData(prev => {
            const isSelected = prev.selectedPermissions.includes(permissionId)
            if (isSelected) {
                return {
                    ...prev,
                    selectedPermissions: prev.selectedPermissions.filter(id => id !== permissionId)
                }
            } else {
                return {
                    ...prev,
                    selectedPermissions: [...prev.selectedPermissions, permissionId]
                }
            }
        })
    }

    const handleSelectAllModule = (moduleName, modulePermissions) => {
        const allIds = modulePermissions.map(p => p.id)
        const allSelected = allIds.every(id => formData.selectedPermissions.includes(id))

        setFormData(prev => {
            if (allSelected) {
                // Deselect all
                return {
                    ...prev,
                    selectedPermissions: prev.selectedPermissions.filter(id => !allIds.includes(id))
                }
            } else {
                // Select all
                const newIds = allIds.filter(id => !prev.selectedPermissions.includes(id))
                return {
                    ...prev,
                    selectedPermissions: [...prev.selectedPermissions, ...newIds]
                }
            }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            let roleId

            if (editingRole) {
                // Update Role Details
                const { error: updateError } = await supabase
                    .from('roles')
                    .update({
                        name: formData.name,
                        description: formData.description
                    })
                    .eq('id', editingRole.id)

                if (updateError) throw updateError
                roleId = editingRole.id

                // Delete existing permissions
                const { error: deleteError } = await supabase
                    .from('role_permissions')
                    .delete()
                    .eq('role_id', roleId)

                if (deleteError) throw deleteError

            } else {
                // Create Role
                const { data: newRole, error: createError } = await supabase
                    .from('roles')
                    .insert([{
                        name: formData.name,
                        description: formData.description
                    }])
                    .select()
                    .single()

                if (createError) throw createError
                roleId = newRole.id
            }

            // Insert new permissions
            if (formData.selectedPermissions.length > 0) {
                const permissionInserts = formData.selectedPermissions.map(permId => ({
                    role_id: roleId,
                    permission_id: permId
                }))

                const { error: permError } = await supabase
                    .from('role_permissions')
                    .insert(permissionInserts)

                if (permError) throw permError
            }

            showToast(`Role ${editingRole ? 'updated' : 'created'} successfully`, 'success')
            setIsModalOpen(false)
            fetchData()
        } catch (error) {
            console.error('Error saving role:', error)
            showToast('Failed to save role: ' + error.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will remove this role from all users assigned to it.')) return

        try {
            const { error } = await supabase.from('roles').delete().eq('id', id)
            if (error) throw error
            showToast('Role deleted', 'success')
            setRoles(roles.filter(r => r.id !== id))
        } catch (error) {
            showToast('Error deleting role: ' + error.message, 'error')
        }
    }

    // Group permissions by module
    const permissionsByModule = permissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = []
        acc[perm.module].push(perm)
        return acc
    }, {})

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredRoles.length / itemsPerPage))
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [filteredRoles.length, currentPage])

    const totalItems = filteredRoles.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedRoles = filteredRoles.slice(startIndex, startIndex + itemsPerPage)

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-500" />
                        Roles & Permissions
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage user roles and their access levels</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Role
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search roles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium pl-9 py-2 text-sm"
                    />
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading roles...</div>
                ) : filteredRoles.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No roles found.</div>
                ) : (
                    paginatedRoles.map((role) => (
                        <div key={role.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{role.name}</h3>
                                    {role.is_system && (
                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium border border-purple-200 dark:border-purple-800/50 flex items-center gap-1">
                                            <Lock className="w-3 h-3" /> System
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{role.description}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="text-xs text-gray-400">{role.permissionIds?.length || 0} permissions</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenModal(role)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                    title="Edit Role"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                {!role.is_system && (
                                    <button
                                        onClick={() => handleDelete(role.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Delete Role"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!loading && filteredRoles.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-premium w-full max-w-4xl max-h-[90vh] flex flex-col animate-scaleIn border border-gray-100 dark:border-gray-700">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="input-premium w-full"
                                            placeholder="e.g. Regional Manager"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="input-premium w-full"
                                            placeholder="What is this role for?"
                                        />
                                    </div>
                                </div>

                                {/* Permissions Matrix */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Permissions</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.entries(permissionsByModule).map(([module, modulePerms]) => (
                                            <div key={module} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                                                    <h5 className="font-semibold text-gray-800 dark:text-gray-200">{module}</h5>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAllModule(module, modulePerms)}
                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        Toggle All
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {modulePerms.map(perm => {
                                                        const isSelected = formData.selectedPermissions.includes(perm.id)
                                                        return (
                                                            <label key={perm.id} className="flex items-start gap-3 cursor-pointer group">
                                                                <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-blue-400'}`}>
                                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={isSelected}
                                                                    onChange={() => handleTogglePermission(perm.id)}
                                                                />
                                                                <div>
                                                                    <div className={`text-sm ${isSelected ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                        {perm.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                                                                        {perm.description}
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary min-w-[100px]"
                                >
                                    {loading ? 'Saving...' : 'Save Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

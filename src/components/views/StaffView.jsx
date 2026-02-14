import React, { useState } from 'react'
import { Users, Plus, Edit, Search } from 'lucide-react'
import Pagination from '../Pagination'
import AddStaffModal from '../AddStaffModal'
import EditStaffModal from '../EditStaffModal'

export default function StaffView({ staff = [], fetchStaff, hasPermission }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [staffPage, setStaffPage] = useState(1)
    const [showAddStaffModal, setShowAddStaffModal] = useState(false)
    const [showEditStaffModal, setShowEditStaffModal] = useState(false)
    const [selectedStaffMember, setSelectedStaffMember] = useState(null)
    const itemsPerPage = 10

    const filteredStaff = staff.filter(member =>
        member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone?.includes(searchQuery) ||
        member.phone_number?.includes(searchQuery) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const startIndex = (staffPage - 1) * itemsPerPage
    const paginatedStaff = filteredStaff.slice(startIndex, startIndex + itemsPerPage)

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="card-premium p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-3 gradient-primary rounded-xl shrink-0">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Staff Members</h2>
                            <p className="text-sm text-gray-500">{filteredStaff.length} found</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {/* Search Field */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search staff..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setStaffPage(1) // Reset to page 1 on search
                                }}
                                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full sm:w-64 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                        </div>

                        {hasPermission('staff.create') && (
                            <button
                                onClick={() => setShowAddStaffModal(true)}
                                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <Plus className="icon-fixed" />
                                <span>Add Staff</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {paginatedStaff.map(member => (
                        <div
                            key={member.id}
                            onClick={() => {
                                setSelectedStaffMember(member)
                                setShowEditStaffModal(true)
                            }}
                            className="flex items-center justify-between p-5 rounded-xl bg-gray-50 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 cursor-pointer group transition-smooth border border-transparent hover:border-purple-200 hover:shadow-lg"
                        >
                            <div className="flex items-center gap-4">
                                <div className="avatar-fixed rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {member.full_name?.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 group-hover:text-purple-700 transition-smooth">{member.full_name}</p>
                                    <p className="text-sm text-gray-600">{member.phone_number || member.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`badge ${member.status === 'active' || !member.status ? 'badge-success' :
                                    member.status === 'suspended' ? 'badge-warning' :
                                        'badge-error'
                                    }`}>
                                    {member.status || 'Active'}
                                </span>
                                <Edit className="icon-fixed text-gray-400 opacity-0 group-hover:opacity-100 transition-smooth" />
                            </div>
                        </div>
                    ))}
                    {filteredStaff.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No staff members found</p>
                            <p className="text-gray-400 text-sm mt-2">Try adjusting your search terms</p>
                        </div>
                    )}
                </div>

                {filteredStaff.length > itemsPerPage && (
                    <div className="mt-6">
                        <Pagination
                            currentPage={staffPage}
                            totalItems={filteredStaff.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setStaffPage}
                        />
                    </div>
                )}
            </div>

            <AddStaffModal
                isOpen={showAddStaffModal}
                onClose={() => setShowAddStaffModal(false)}
                onStaffAdded={() => {
                    fetchStaff()
                    setShowAddStaffModal(false)
                }}
            />

            <EditStaffModal
                isOpen={showEditStaffModal}
                onClose={() => {
                    setShowEditStaffModal(false)
                    setSelectedStaffMember(null)
                }}
                staffMember={selectedStaffMember}
                onStaffUpdated={() => {
                    fetchStaff()
                    setShowEditStaffModal(false)
                    setSelectedStaffMember(null)
                }}
            />
        </div>
    )
}

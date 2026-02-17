import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/ToastContext'
import { Calendar, User, Clock, Download, Search, Eye, Filter } from 'lucide-react'
import AttendanceDetailModal from './AttendanceDetailModal'
import Pagination from './Pagination'

export default function AttendanceReport() {
  const { showToast } = useToast()
  const [attendance, setAttendance] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 10

  const fetchStaff = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'staff')
        .order('full_name')

      if (fetchError) throw fetchError
      if (data) setStaff(data)
    } catch (err) {
      console.error('Failed to fetch staff list', err)
      setError('Could not load staff list. Please refresh and try again.')
      showToast('Could not load staff list. Please refresh and try again.', 'error')
    }
  }, [showToast])

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          profiles!attendance_user_id_fkey (full_name, phone)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (selectedStaff) {
        query = query.eq('user_id', selectedStaff)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      setAttendance(data || [])
      setCurrentPage(1)
    } catch (err) {
      console.error('Failed to fetch attendance records', err)
      setAttendance([])
      setError('Could not load attendance records. Please retry.')
      showToast('Could not load attendance records. Please retry.', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedStaff, startDate, endDate, showToast])

  useEffect(() => {
    fetchStaff()

    // Set default dates (last 7 days)
    const today = new Date()
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    setStartDate(lastWeek.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }, [fetchStaff])

  useEffect(() => {
    if (startDate && endDate) {
      fetchAttendance()
    }
  }, [fetchAttendance, startDate, endDate])

  const exportToCSV = () => {
    const escapeCsvValue = (value) => {
      const stringValue = value == null ? '' : String(value)
      const escapedValue = stringValue.replace(/"/g, '""')
      return /[",\n]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue
    }

    const headers = ['Date', 'Staff Name', 'Check In Time', 'Check In Location', 'Check Out Time', 'Check Out Location', 'Total Hours']
    const rows = attendance.map(record => [
      record.date,
      record.profiles?.full_name || 'Unknown',
      record.check_in_time ? new Date(record.check_in_time).toLocaleString() : 'N/A',
      record.check_in_address || 'N/A',
      record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'Not checked out',
      record.check_out_address || 'N/A',
      record.total_hours || 'N/A'
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsvValue).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_report_${startDate}_to_${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    showToast('Attendance report exported successfully.', 'success')
  }

  const handleViewDetails = (record) => {
    setSelectedRecord(record)
    setShowModal(true)
  }

  const paginatedAttendance = attendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="card-premium p-6">
        {/* Header - Export button brought inwards next to text */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
          <div className="p-3 gradient-primary rounded-xl shrink-0">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Attendance Report</h2>
            <p className="text-sm text-gray-500">View and export staff attendance</p>
          </div>

          <button
            onClick={exportToCSV}
            disabled={attendance.length === 0}
            className="btn-primary py-2 px-4 flex items-center gap-2 text-sm ml-0 md:ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Staff Member
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="input-premium"
              >
                <option value="">All Staff</option>
                {staff.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-premium"
              />
            </div>
          </div>

          {/* Search Button - Moved to bottom full width */}
          <div className="mt-4">
            <button
              onClick={fetchAttendance}
              disabled={loading}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search Records'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card-premium p-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="loading-spinner w-12 h-12 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading attendance records...</p>
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No attendance records found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedAttendance.map(record => (
                <div key={record.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{record.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleViewDetails(record)}
                      className="btn-icon text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-gray-500 mb-1">Check In</p>
                      <p className="font-medium text-gray-800">
                        {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-gray-500 mb-1">Check Out</p>
                      <p className="font-medium text-gray-800">
                        {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total</span>
                    <span className="font-semibold text-gray-800">
                      {record.total_hours ? (
                        record.total_hours < 1
                          ? `${Math.round(record.total_hours * 60)}m`
                          : `${Math.floor(record.total_hours)}h ${Math.round((record.total_hours % 1) * 60)}m`
                      ) : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedAttendance.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-secondary flex items-center justify-center text-white text-xs font-bold">
                            {record.profiles?.full_name?.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{record.profiles?.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`badge ${record.check_in_location_type === 'office' ? 'badge-info' : 'badge-success'} w-fit`}>
                            {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <span className="text-xs text-gray-400 mt-1 capitalize">
                            {record.check_in_location_type || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.check_out_time ? (
                          <div className="flex flex-col">
                            <span className={`badge ${record.check_out_location_type === 'office' ? 'badge-info' : 'badge-warning'} w-fit`}>
                              {new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-xs text-gray-400 mt-1 capitalize">
                              {record.check_out_location_type || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded border border-orange-100">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {record.total_hours ? (
                          record.total_hours < 1
                            ? `${Math.round(record.total_hours * 60)}m`
                            : `${Math.floor(record.total_hours)}h ${Math.round((record.total_hours % 1) * 60)}m`
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="btn-icon text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={attendance.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <AttendanceDetailModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        record={selectedRecord}
      />
    </div>
  )
}
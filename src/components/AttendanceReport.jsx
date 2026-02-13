import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, User, Clock, Download, Search, Eye, Filter, MapPin } from 'lucide-react'
import AttendanceDetailModal from './AttendanceDetailModal'

export default function AttendanceReport({ onSignOut }) {
  const [attendance, setAttendance] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchStaff()

    // Set default dates (last 7 days)
    const today = new Date()
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    setStartDate(lastWeek.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }, [])

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .order('full_name')

    if (data) setStaff(data)
  }

  const fetchAttendance = async () => {
    setLoading(true)

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

    const { data } = await query

    if (data) setAttendance(data)
    setLoading(false)
  }

  useEffect(() => {
    if (startDate && endDate) {
      fetchAttendance()
    }
  }, [selectedStaff, startDate, endDate])

  const exportToCSV = () => {
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

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_report_${startDate}_to_${endDate}.csv`
    a.click()
  }

  const handleViewDetails = (record) => {
    setSelectedRecord(record)
    setShowModal(true)
  }

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
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search Records
            </button>
          </div>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="loading-spinner w-12 h-12 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading attendance...</p>
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No attendance records found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {attendance.map(record => (
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
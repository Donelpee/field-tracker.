import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Filter, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import Pagination from './Pagination'
import { SkeletonTable } from './Skeletons'

export default function LoginActivity() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterUser, setFilterUser] = useState('all')
    const [staff, setStaff] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        fetchStaff()
        fetchLogs()
    }, [])

    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .order('full_name')

            if (error) {
                console.error('Error fetching staff:', error)
                return
            }

            console.log('Fetched staff for filter:', data?.length || 0, 'users', data)
            setStaff(data || [])
        } catch (err) {
            console.error('Exception in fetchStaff:', err)
        }
    }

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('login_attempts')
                .select(`
                    *,
                    profiles (full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) {
                console.warn('Login attempts table missing or inaccessible:', error.message)
                setLogs([]) // Fail gracefuly
            } else if (data) {
                setLogs(data)
            }
        } catch (err) {
            console.error('Error fetching login logs:', err)
            setLogs([])
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log => {
        // Defensive: status and user_id may be undefined or mismatched types
        if (filterStatus !== 'all' && String(log.status) !== String(filterStatus)) return false
        if (filterUser !== 'all' && String(log.user_id) !== String(filterUser)) return false
        return true
    })

    // Pagination
    const totalItems = filteredLogs.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [filterStatus, filterUser])

    const getStatusBadge = (status) => {
        switch (status) {
            case 'success':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3 h-3" />
                        Success
                    </span>
                )
            case 'blocked_device':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        <XCircle className="w-3 h-3" />
                        Blocked (Device)
                    </span>
                )
            case 'failed':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                    </span>
                )
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>
        }
    }

    const truncateDeviceId = (deviceId) => {
        if (!deviceId) return 'N/A'
        return deviceId.substring(0, 12) + '...'
    }

    const getBrowserInfo = (userAgent) => {
        if (!userAgent) return 'Unknown'

        // Simple browser detection
        if (userAgent.includes('Chrome')) return 'Chrome'
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Safari')) return 'Safari'
        if (userAgent.includes('Edge')) return 'Edge'
        return 'Other'
    }

    return (
        <div className="space-y-6">
            <div className="card-premium p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Login Activity</h2>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="success">Success</option>
                        <option value="blocked_device">Blocked (Device)</option>
                        <option value="failed">Failed</option>
                    </select>

                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Users</option>
                        {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                    </select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">Successful Logins</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                            {logs.filter(l => l.status === 'success').length}
                        </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium">Blocked Attempts</p>
                        <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                            {logs.filter(l => l.status === 'blocked_device').length}
                        </p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">Failed Attempts</p>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                            {logs.filter(l => l.status === 'failed').length}
                        </p>
                    </div>
                </div>

                {/* Logs Table */}
                {loading ? (
                    <SkeletonTable rows={10} cols={6} />
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No login activity found</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">User</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Device ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Browser</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Location Info</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {paginatedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{log.profiles?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{log.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(log.status)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                                    {truncateDeviceId(log.device_id)}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {getBrowserInfo(log.user_agent)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                                                {log.ip_info || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>
        </div>
    )
}

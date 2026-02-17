import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend, ComposedChart, Line
} from 'recharts'
import { Briefcase, CheckCircle, Clock, AlertCircle, Users, TrendingUp, Building2, User } from 'lucide-react'

export default function JobInsights() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalJobs: 0,
        completedJobs: 0,
        completionRate: 0,
        activeType: 'N/A',
        jobsByType: [],
        jobsByStatus: [],
        clientsByVolume: [],
        clientsDetailed: [],
        staffPerformance: []
    })
    const [dateRange, setDateRange] = useState('30') // days

    const fetchInsights = useCallback(async () => {
        setLoading(true)
        try {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - parseInt(dateRange))

            // Fetch Jobs with Relations
            const { data: jobs, error } = await supabase
                .from('jobs')
                .select(`
                    id, 
                    status, 
                    created_at, 
                    completed_at,
                    started_at,
                    job_types ( title ),
                    clients ( name ),
                    profiles ( id, full_name, role )
                `)
                .gte('created_at', startDate.toISOString())

            if (error) throw error

            // 1. Basic KPIs
            const total = jobs.length
            const completed = jobs.filter(j => j.status === 'completed').length
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0

            // 2. Group by Type (Job Distribution)
            const typeMap = {}
            jobs.forEach(j => {
                const type = j.job_types?.title || 'Uncategorized'
                typeMap[type] = (typeMap[type] || 0) + 1
            })
            let jobsByType = Object.entries(typeMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)

            // Limit to Top 5 (User Request: "That is all")
            if (jobsByType.length > 5) {
                jobsByType = jobsByType.slice(0, 5)
            }
            const activeType = jobsByType.length > 0 ? jobsByType[0].name : 'N/A'

            // 3. Group by Status
            const statusMap = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
            jobs.forEach(j => { if (statusMap[j.status] !== undefined) statusMap[j.status]++ })
            const jobsByStatus = [
                { name: 'Pending', value: statusMap.pending, color: '#F59E0B' },
                { name: 'In Progress', value: statusMap.in_progress, color: '#3B82F6' },
                { name: 'Completed', value: statusMap.completed, color: '#10B981' },
                { name: 'Cancelled', value: statusMap.cancelled, color: '#EF4444' }
            ].filter(i => i.value > 0)

            // 4. Client Demand Analysis (Detailed)
            const clientMap = {}
            jobs.forEach(j => {
                const clientName = j.clients?.name || 'Unknown Client'
                if (!clientMap[clientName]) {
                    clientMap[clientName] = {
                        name: clientName,
                        total: 0,
                        completed: 0,
                        totalDurationMinutes: 0,
                        jobTypes: {}
                    }
                }
                const c = clientMap[clientName]
                c.total++

                // Track Durations
                if (j.status === 'completed' && j.started_at && j.completed_at) {
                    c.completed++
                    const start = new Date(j.started_at)
                    const end = new Date(j.completed_at)
                    const durationMins = (end - start) / (1000 * 60)
                    if (durationMins > 0) c.totalDurationMinutes += durationMins
                }

                // Track Job Types
                const type = j.job_types?.title || 'General'
                c.jobTypes[type] = (c.jobTypes[type] || 0) + 1
            })

            const clientsDetailed = Object.values(clientMap).map(c => {
                const avgDuration = c.completed > 0 ? Math.round(c.totalDurationMinutes / c.completed) : 0

                // Find Top Service
                let topService = 'N/A'
                let maxCount = 0
                Object.entries(c.jobTypes).forEach(([type, count]) => {
                    if (count > maxCount) {
                        maxCount = count
                        topService = type
                    }
                })

                return {
                    name: c.name,
                    value: c.total, // For the Bar Chart
                    avgDurationHours: (avgDuration / 60).toFixed(1),
                    topService,
                    topServiceCount: maxCount
                }
            }).sort((a, b) => b.value - a.value)

            const clientsByVolume = clientsDetailed.slice(0, 10) // Keep top 10 for charts

            // 5. Staff Efficiency Analysis
            const staffMap = {}

            jobs.forEach(j => {
                const staff = j.profiles
                if (!staff) return // Unassigned

                if (!staffMap[staff.id]) {
                    staffMap[staff.id] = {
                        id: staff.id,
                        name: staff.full_name || 'Unknown Staff',
                        completed: 0,
                        totalDurationMinutes: 0,
                        jobTypes: {}
                    }
                }

                if (j.status === 'completed' && j.started_at && j.completed_at) {
                    staffMap[staff.id].completed++
                    const start = new Date(j.started_at)
                    const end = new Date(j.completed_at)
                    const durationMins = (end - start) / (1000 * 60)
                    if (durationMins > 0) staffMap[staff.id].totalDurationMinutes += durationMins
                }

                // Track skills even for incomplete jobs? No, let's track assigned types to see what they do most.
                const type = j.job_types?.title || 'General'
                staffMap[staff.id].jobTypes[type] = (staffMap[staff.id].jobTypes[type] || 0) + 1
            })

            const staffPerformance = Object.values(staffMap).map(s => {
                const avgDuration = s.completed > 0 ? Math.round(s.totalDurationMinutes / s.completed) : 0
                // Find top skill
                let topSkill = 'N/A'
                let maxCount = 0
                Object.entries(s.jobTypes).forEach(([type, count]) => {
                    if (count > maxCount) {
                        maxCount = count
                        topSkill = type
                    }
                })

                return {
                    ...s,
                    avgDurationHours: (avgDuration / 60).toFixed(1),
                    topSkill,
                    jobCount: Object.values(s.jobTypes).reduce((a, b) => a + b, 0)
                }
            }).sort((a, b) => b.completed - a.completed) // Sort by most completed

            setStats({
                totalJobs: total,
                completedJobs: completed,
                completionRate: rate,
                activeType,
                jobsByType,
                jobsByStatus,
                clientsByVolume,
                clientsDetailed,
                staffPerformance
            })

        } catch (error) {
            console.error('Error loading insights:', error)
        } finally {
            setLoading(false)
        }
    }, [dateRange])

    useEffect(() => {
        fetchInsights()
    }, [fetchInsights])

    const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e']

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading analytics...</div>

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Advanced Job Analytics
                </h2>
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                    {['7', '30', '90', '365'].map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === range
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            {range === '365' ? 'Year' : `${range} Days`}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Volume" value={stats.totalJobs} icon={Briefcase} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
                <StatCard label="Success Rate" value={`${stats.completionRate}%`} icon={CheckCircle} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
                <StatCard label="Top Category" value={stats.activeType} icon={Briefcase} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" subtext="By volume" />
                <StatCard label="Active Clients" value={stats.clientsByVolume.length} icon={Building2} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/20" />
            </div>

            {/* Row 1: Distribution & Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Visual 1: Job Distribution */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-premium border border-gray-100 dark:border-gray-700 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Top 5 Requested Services</h3>
                    <p className="text-sm text-gray-500 mb-6">Highest volume job categories</p>
                    <div className="h-[300px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.jobsByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                                >
                                    {stats.jobsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Visual 2: Client Demand */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-premium border border-gray-100 dark:border-gray-700 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Top Client Demand</h3>
                    <p className="text-sm text-gray-500 mb-6">Companies with highest job volume</p>
                    <div className="h-[300px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.clientsByVolume} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Client Service Matrix */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-premium border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Client Service Analysis</h3>
                <p className="text-sm text-gray-500 mb-6">Breakdown of most requested services and duration by client</p>

                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500 font-medium">
                                <th className="py-3 px-4">Client Name</th>
                                <th className="py-3 px-4">Total Jobs</th>
                                <th className="py-3 px-4">Most Requested Service</th>
                                <th className="py-3 px-4">Avg Duration</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-700 dark:text-gray-300">
                            {stats.clientsDetailed?.map((client, i) => (
                                <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-3 px-4 font-medium">{client.name}</td>
                                    <td className="py-3 px-4">{client.value}</td>
                                    <td className="py-3 px-4">
                                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-md text-xs font-medium">
                                            {client.topService}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-gray-500">
                                        {client.avgDurationHours > 0 ? `${client.avgDurationHours} hrs` : '--'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Row 3: Staff Efficiency Matrix */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-premium border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Staff Efficiency Matrix</h3>
                <p className="text-sm text-gray-500 mb-6">Performance analysis based on completion speed and volume</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500 font-medium">
                                <th className="py-3 px-4">Staff Member</th>
                                <th className="py-3 px-4">Jobs Completed</th>
                                <th className="py-3 px-4">Top Skill (Most Frequent)</th>
                                <th className="py-3 px-4">Avg Completion Time</th>
                                <th className="py-3 px-4">Efficiency Score</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-700 dark:text-gray-300">
                            {stats.staffPerformance.length === 0 ? (
                                <tr><td colSpan="5" className="py-4 text-center text-gray-400">No performance data available</td></tr>
                            ) : (
                                stats.staffPerformance.map((staff) => (
                                    <tr key={staff.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                                {staff.name.charAt(0)}
                                            </div>
                                            {staff.name}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                {staff.completed} / {staff.jobCount}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">{staff.topSkill}</td>
                                        <td className="py-3 px-4 font-mono text-gray-500">
                                            {staff.avgDurationHours > 0 ? `${staff.avgDurationHours} hrs` : '--'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <EfficiencyBar value={staff.completed} max={Math.max(...stats.staffPerformance.map(s => s.completed), 1)} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const StatCard = ({ label, value, icon: Icon, color, bg, subtext }) => (
    <div className="card-premium p-6 flex items-start justify-between">
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
    </div>
)

const EfficiencyBar = ({ value, max }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    return (
        <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
            />
        </div>
    )
}

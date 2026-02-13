import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, Users, CheckCircle, Briefcase, Camera, Award, Clock } from 'lucide-react'
import StaffPerformanceDetails from './StaffPerformanceDetails'

export default function PerformanceMetrics() {
    const [staffMetrics, setStaffMetrics] = useState([])
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('all') // 'week', 'month', 'year', 'all'
    const [systemStats, setSystemStats] = useState({
        totalJobs: 0,
        completionRate: 0,
        activeStaff: 0,
        totalPhotos: 0
    })

    const [error, setError] = useState(null)
    const [selectedStaffId, setSelectedStaffId] = useState(null)
    const [selectedStaffName, setSelectedStaffName] = useState('')
    const [showDetailsModal, setShowDetailsModal] = useState(false)

    useEffect(() => {
        fetchMetrics()
    }, [timeRange])

    const fetchMetrics = async () => {
        try {
            setLoading(true)
            setError(null)

            // 1. Fetch all Profiles (Staff)
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .neq('role', 'admin')

            if (profileError) throw { context: 'Fetching Profiles', ...profileError }

            // 2. Fetch Jobs (Filtered by Time)
            let jobsQuery = supabase
                .from('jobs')
                .select('id, status, assigned_to, created_at')

            // Apply Time Filter
            const now = new Date()
            let startDate = null

            if (timeRange === 'week') {
                const lastWeek = new Date(now.setDate(now.getDate() - 7))
                startDate = lastWeek.toISOString()
            } else if (timeRange === 'month') {
                const lastMonth = new Date(now.setMonth(now.getMonth() - 1))
                startDate = lastMonth.toISOString()
            } else if (timeRange === 'year') {
                const lastYear = new Date(now.setFullYear(now.getFullYear() - 1))
                startDate = lastYear.toISOString()
            }

            if (startDate) {
                jobsQuery = jobsQuery.gte('created_at', startDate)
            }

            const { data: jobs, error: jobError } = await jobsQuery

            if (jobError) throw { context: 'Fetching Jobs', ...jobError }

            // 3. Fetch Photos (Filtered by Time)
            let photosQuery = supabase
                .from('photos')
                .select('id, uploaded_by, created_at')

            if (startDate) {
                photosQuery = photosQuery.gte('created_at', startDate)
            }

            const { data: photos, error: photoError } = await photosQuery

            if (photoError) throw { context: 'Fetching Photos', ...photoError }

            // 4. Fetch Attendance (Filtered by Time)
            let attendanceQuery = supabase
                .from('attendance')
                .select('user_id, check_in_time, date')

            if (startDate) {
                attendanceQuery = attendanceQuery.gte('date', startDate)
            }

            const { data: attendance, error: attendanceError } = await attendanceQuery

            if (attendanceError) throw { context: 'Fetching Attendance', ...attendanceError }

            // 5. Calculate Metrics (Weighted Grading)
            const metrics = profiles.map(staff => {
                const staffJobs = jobs.filter(j => j.assigned_to === staff.id)
                const completedJobs = staffJobs.filter(j => j.status === 'completed')
                const staffPhotos = photos.filter(p => p.uploaded_by === staff.id)
                const staffAttendance = attendance.filter(a => a.user_id === staff.id)

                // A. Job Completion (60%)
                const jobCompletionRate = staffJobs.length > 0
                    ? (completedJobs.length / staffJobs.length)
                    : 0
                const scoreJobs = Math.round(jobCompletionRate * 60)

                // B. Punctuality (20%) - Check in before 9:00 AM
                const onTimeCheckIns = staffAttendance.filter(a => {
                    if (!a.check_in_time) return false
                    const checkIn = new Date(a.check_in_time)
                    return checkIn.getHours() < 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() === 0)
                }).length

                const punctualityRate = staffAttendance.length > 0
                    ? (onTimeCheckIns / staffAttendance.length)
                    : 0
                const scorePunctuality = Math.round(punctualityRate * 20)

                // C. Photo Compliance (10%) - Target: 1 photo per completed job
                const photoRate = completedJobs.length > 0
                    ? Math.min((staffPhotos.length / completedJobs.length), 1) // Cap at 1.0
                    : 0
                const scorePhotos = Math.round(photoRate * 10)

                // D. Process Adherence (10%) - Starting Jobs properly
                const startedJobs = staffJobs.filter(j => j.status === 'in_progress' || j.status === 'completed') // Assuming started jobs have status
                // Better proxy: check if 'started_at' is present if you fetched it, otherwise rely on status
                // detailed check would need 'started_at' column fetch. For now using status.
                const processRate = staffJobs.length > 0
                    ? (startedJobs.length / staffJobs.length)
                    : 0
                const scoreProcess = Math.round(processRate * 10)

                // Total Efficiency Score (0 - 100)
                const efficiencyScore = scoreJobs + scorePunctuality + scorePhotos + scoreProcess

                return {
                    id: staff.id,
                    name: staff.full_name || 'Unknown Staff',
                    totalJobs: staffJobs.length,
                    completedJobs: completedJobs.length,
                    pendingJobs: staffJobs.length - completedJobs.length,
                    completionRate: Math.round(jobCompletionRate * 100),
                    photosUploaded: staffPhotos.length,
                    efficiencyScore
                }
            })

            // Sort by Efficiency Score desc
            metrics.sort((a, b) => b.efficiencyScore - a.efficiencyScore)
            setStaffMetrics(metrics)

            // System Stats
            const totalJobs = jobs.length
            const totalCompleted = jobs.filter(j => j.status === 'completed').length
            const avgCompletion = totalJobs > 0 ? Math.round((totalCompleted / totalJobs) * 100) : 0

            setSystemStats({
                totalJobs,
                completionRate: avgCompletion,
                activeStaff: profiles.length,
                totalPhotos: photos.length,
                isRLSOngoing: profiles.length <= 1 // Heuristic for RLS blocking check
            })

        } catch (err) {
            console.error('Error fetching metrics:', err)
            setError(err)
        } finally {
            setLoading(false)
        }
    }

    const handleStaffClick = (staff) => {
        setSelectedStaffId(staff.id)
        setSelectedStaffName(staff.name)
        setShowDetailsModal(true)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="loading-spinner w-12 h-12"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fadeIn">

            {systemStats.isRLSOngoing && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-blue-700">
                            <strong>Note:</strong> Only {systemStats.activeStaff} user(s) found.
                            If this is unexpected, check your Supabase <strong>Row Level Security (RLS)</strong> policies.
                            Admins need "Select" permissions on the `profiles` table to view all staff.
                        </p>
                    </div>
                </div>
            )}

            {/* Time Stats Filters */}
            <div className="flex justify-end gap-2 mb-4">
                {['week', 'month', 'year', 'all'].map((range) => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === range
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {range === 'all' ? 'All Time' : `This ${range.charAt(0).toUpperCase() + range.slice(1)}`}
                    </button>
                ))}
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={TrendingUp}
                    label="Avg. Completion Rate"
                    value={`${systemStats.completionRate}%`}
                    subtext="System-wide efficiency"
                    gradient="gradient-success"
                />
                <MetricCard
                    icon={Briefcase}
                    label="Total Jobs Listed"
                    value={systemStats.totalJobs}
                    subtext="Across all staff"
                    gradient="gradient-primary"
                />
                <MetricCard
                    icon={Camera}
                    label="Total Photos"
                    value={systemStats.totalPhotos}
                    subtext="Evidence collected"
                    gradient="gradient-accent"
                />
                <MetricCard
                    icon={Users}
                    label="Active Staff"
                    value={systemStats.activeStaff}
                    subtext="Field agents tracking"
                    gradient="gradient-warning"
                />
            </div>

            {/* Top Performers Section */}
            <div className="card-premium p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 gradient-warning rounded-xl">
                        <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Staff Performance Leaderboard</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Click on a staff member to view detailed report</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {staffMetrics.map((staff, index) => (
                        <div
                            key={staff.id}
                            onClick={() => handleStaffClick(staff)}
                            className="group p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-smooth cursor-pointer"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${index === 0 ? 'bg-yellow-500' :
                                        index === 1 ? 'bg-gray-400' :
                                            index === 2 ? 'bg-orange-600' :
                                                'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-white text-lg group-hover:text-blue-600 transition-colors">{staff.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" /> {staff.totalJobs} Jobs
                                            </span>
                                            <span className="mx-1">•</span>
                                            <span className="flex items-center gap-1">
                                                <Camera className="w-3 h-3" /> {staff.photosUploaded} Photos
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Completion</p>
                                        <p className="text-xl font-black text-gray-800 dark:text-white">{staff.completionRate}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Efficiency</p>
                                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                                            <Zap className="w-4 h-4 fill-current" />
                                            <span>{staff.efficiencyScore}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bars */}
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500 dark:text-gray-400">Job Completion Progress</span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{staff.completedJobs} / {staff.totalJobs}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${staff.completionRate}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {staffMetrics.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">No staff profiles found.</p>
                                <p className="text-sm text-gray-400 mt-1">Check RLS policies or role filters.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <StaffPerformanceDetails
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                staffId={selectedStaffId}
                staffName={selectedStaffName}
                timeRange={timeRange}
            />
        </div>
    )
}

const MetricCard = ({ icon: Icon, label, value, subtext, gradient }) => (
    <div className="card-premium group relative overflow-hidden">
        <div className={`absolute inset-0 ${gradient} opacity-5 group-hover:opacity-10 transition-smooth`}></div>
        <div className="relative p-5">
            <div className="flex justify-between items-start mb-4">
                <div className={`${gradient} p-3 rounded-xl shadow-lg text-white transform group-hover:scale-110 group-hover:rotate-6 transition-smooth`}>
                    <Icon className="w-6 h-6" />
                </div>
                {/* Optional decorative element */}
            </div>
            <div>
                <p className="text-3xl font-black text-gray-800 dark:text-white mb-1">{value}</p>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{subtext}</p>
            </div>
        </div>
    </div>
)

const Zap = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
)

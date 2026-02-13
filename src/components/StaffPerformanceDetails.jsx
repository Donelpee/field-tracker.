import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Calendar, MapPin, Image, MessageSquare, CheckCircle, Clock, AlertCircle, TrendingUp, Briefcase } from 'lucide-react'

export default function StaffPerformanceDetails({ isOpen, onClose, staffId, staffName, timeRange }) {
    const [activeTab, setActiveTab] = useState('jobs') // 'jobs' or 'attendance'
    const [jobs, setJobs] = useState([])
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalJobs: 0,
        completedJobs: 0,
        totalPhotos: 0,
        completionRate: 0,
        efficiencyScore: 0,
        avgJobDuration: 'N/A',
        onTimeMyself: '0%',
        scores: {
            jobs: 0,
            punctuality: 0,
            photos: 0,
            process: 0
        }
    })

    useEffect(() => {
        if (isOpen && staffId) {
            fetchDetails()
        }
    }, [isOpen, staffId, timeRange])

    const fetchDetails = async () => {
        setLoading(true)
        try {
            // Calculate Date Range
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

            // 1. Fetch Jobs
            let jobsQuery = supabase
                .from('jobs')
                .select(`
                    *,
                    clients (name, address),
                    photos (count)
                `)
                .eq('assigned_to', staffId)
                .order('created_at', { ascending: false })

            if (startDate) jobsQuery = jobsQuery.gte('created_at', startDate)

            const { data: jobsData, error: jobsError } = await jobsQuery
            if (jobsError) throw jobsError

            // 2. Fetch Attendance
            let attendanceQuery = supabase
                .from('attendance')
                .select('*')
                .eq('user_id', staffId)
                .order('date', { ascending: false })

            if (startDate) attendanceQuery = attendanceQuery.gte('date', startDate)

            const { data: attendanceData, error: attendanceError } = await attendanceQuery
            if (attendanceError) {
                console.error("Attendance fetch error:", attendanceError)
                // Continue without attendance data rather than crashing
            }

            // 3. Fetch Photos (for total count validity)
            let photosQuery = supabase
                .from('photos')
                .select('id', { count: 'exact' })
                .eq('uploaded_by', staffId)

            if (startDate) photosQuery = photosQuery.gte('created_at', startDate)

            const { count: photoCount, error: photoError } = await photosQuery
            if (photoError) console.error("Photo fetch error:", photoError)

            const finalJobs = jobsData || []
            const finalAttendance = attendanceData || []

            setJobs(finalJobs)
            setAttendance(finalAttendance)

            // --- CALCULATE GRADING METRICS ---

            const total = finalJobs.length
            const completed = finalJobs.filter(j => j.status === 'completed').length

            // 1. Job Completion Score (60%)
            const jobRate = total > 0 ? (completed / total) : 0
            const scoreJobs = Math.round(jobRate * 60)

            // 2. Punctuality Score (20%)
            const daysPresent = finalAttendance.filter(a => a.check_in_time).length
            const onTimeCheckIns = finalAttendance.filter(a => {
                if (!a.check_in_time) return false
                const checkIn = new Date(a.check_in_time)
                // Check if BEFORE 9:00:59 AM
                return checkIn.getHours() < 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() === 0)
            }).length

            const punctualityRate = daysPresent > 0 ? (onTimeCheckIns / daysPresent) : 0
            const scorePunctuality = Math.round(punctualityRate * 20)
            const onTimePercentage = Math.round(punctualityRate * 100) + '%'

            // 3. Photo Compliance Score (10%)
            // Target: 1 photo per completed job as a baseline
            const totalUploadedPhotos = photoCount || 0
            const photoRate = completed > 0 ? Math.min((totalUploadedPhotos / completed), 1) : 0
            const scorePhotos = Math.round(photoRate * 10)

            // 4. Start Protocol (10%)
            // Check if jobs have 'started_at' timestamp
            const startedJobs = finalJobs.filter(j => j.started_at).length
            const processRate = total > 0 ? (startedJobs / total) : 0
            const scoreProcess = Math.round(processRate * 10)

            // Total Score
            const efficiencyScore = scoreJobs + scorePunctuality + scorePhotos + scoreProcess

            // --- HR INSIGHTS ---

            // Avg Turnaround Time
            let totalDurationMinutes = 0
            let durationCount = 0
            finalJobs.forEach(j => {
                if (j.completed_at && j.started_at) {
                    const start = new Date(j.started_at)
                    const end = new Date(j.completed_at)
                    const diffMins = (end - start) / (1000 * 60)
                    if (diffMins > 0) {
                        totalDurationMinutes += diffMins
                        durationCount++
                    }
                }
            })

            let avgJobDuration = 'N/A'
            if (durationCount > 0) {
                const avgMins = Math.round(totalDurationMinutes / durationCount)
                const h = Math.floor(avgMins / 60)
                const m = avgMins % 60
                avgJobDuration = h > 0 ? `${h}h ${m}m` : `${m}m`
            }

            setStats({
                totalJobs: total,
                completedJobs: completed,
                totalPhotos: totalUploadedPhotos,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                efficiencyScore,
                avgJobDuration,
                onTimeMyself: onTimePercentage,
                scores: {
                    jobs: scoreJobs,
                    punctuality: scorePunctuality,
                    photos: scorePhotos,
                    process: scoreProcess
                }
            })

        } catch (error) {
            console.error("Error fetching details:", error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{staffName}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Performance Report • {timeRange === 'all' ? 'All Time' : `This ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* GRADING & HR METRICS SECTION */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50">

                    {/* 1. Overall Efficiency Grade */}
                    <div className="mb-6 flex flex-col md:flex-row gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex items-center justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">Total Efficiency Score</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-5xl font-black ${stats.efficiencyScore >= 80 ? 'text-green-600' : stats.efficiencyScore >= 60 ? 'text-blue-600' : 'text-orange-500'}`}>
                                        {stats.efficiencyScore}<span className="text-2xl">%</span>
                                    </span>
                                    <span className="text-xl font-bold text-gray-400">
                                        Grade: <span className={stats.efficiencyScore >= 90 ? 'text-green-600' : 'text-gray-600'}>
                                            {stats.efficiencyScore >= 90 ? 'A+' : stats.efficiencyScore >= 80 ? 'A' : stats.efficiencyScore >= 70 ? 'B' : stats.efficiencyScore >= 60 ? 'C' : 'D'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full">
                                <TrendingUp className="w-8 h-8 text-gray-400" />
                            </div>
                        </div>

                        {/* HR Insights */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 space-y-4">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-gray-500" />
                                HR Insights
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-blue-300 font-semibold uppercase">Avg. Turnaround</p>
                                    <p className="text-xl font-black text-gray-800 dark:text-white">{stats.avgJobDuration}</p>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                    <p className="text-xs text-gray-500 dark:text-purple-300 font-semibold uppercase">On-Time Arrival</p>
                                    <p className="text-xl font-black text-gray-800 dark:text-white">{stats.onTimeMyself}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Detailed Breakdown Charts */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ScoreCard
                            label="Job Completion"
                            score={stats.scores.jobs}
                            max={60}
                            color="text-blue-600"
                            icon={CheckCircle}
                        />
                        <ScoreCard
                            label="Punctuality (9am)"
                            score={stats.scores.punctuality}
                            max={20}
                            color="text-purple-600"
                            icon={Clock}
                        />
                        <ScoreCard
                            label="Documentation"
                            score={stats.scores.photos}
                            max={10}
                            color="text-green-600"
                            icon={Image}
                        />
                        <ScoreCard
                            label="Protocol"
                            score={stats.scores.process}
                            max={10}
                            color="text-orange-600"
                            icon={AlertCircle}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-2 border-b border-gray-100 dark:border-gray-700 flex gap-6">
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'jobs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Jobs Breakdown
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        Attendance History
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 min-h-[300px]">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="loading-spinner w-10 h-10"></div>
                        </div>
                    ) : activeTab === 'jobs' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Job Details</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 rounded-r-lg">Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {jobs.map(job => (
                                        <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-gray-800 dark:text-white">{job.title}</p>
                                                <p className="text-xs text-gray-500">{job.clients?.name}</p>
                                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> Assigned: {new Date(job.created_at).toLocaleDateString()}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`badge ${job.status === 'completed' ? 'badge-success' : job.status === 'in_progress' ? 'badge-info' : 'bg-gray-200 text-gray-700'}`}>
                                                    {job.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400" title="Photos Uploaded">
                                                        <Image className="w-4 h-4" />
                                                        <span className="font-medium">{job.photos[0]?.count || 0}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400" title="Photos Uploaded">
                                                        <Image className="w-4 h-4" />
                                                        <span className="font-medium">{job.photos[0]?.count || 0}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {jobs.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-8 text-gray-500">No jobs found for this period.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Date</th>
                                        <th className="px-4 py-3">Check In</th>
                                        <th className="px-4 py-3">Check Out</th>
                                        <th className="px-4 py-3 rounded-r-lg">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {attendance.map(record => (
                                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                                {new Date(record.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4">
                                                {record.check_in_time ? (
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200">
                                                            {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{record.check_in_location_type}</p>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-4">
                                                {record.check_out_time ? (
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200">
                                                            {new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{record.check_out_location_type}</p>
                                                    </div>
                                                ) : <span className="text-orange-500 text-xs font-bold bg-orange-50 px-2 py-0.5 rounded">Active</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                {record.total_hours ? (
                                                    record.total_hours < 1
                                                        ? `${Math.round(record.total_hours * 60)}m`
                                                        : `${Math.floor(record.total_hours)}h ${Math.round((record.total_hours % 1) * 60)}m`
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {attendance.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-8 text-gray-500">No attendance records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const ScoreCard = ({ label, score, max, color, icon: Icon }) => {
    const percentage = Math.round((score / max) * 100)

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-2">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="32" cy="32" r="28"
                        stroke="currentColor" strokeWidth="6"
                        fill="transparent"
                        className="text-gray-100 dark:text-gray-700"
                    />
                    <circle
                        cx="32" cy="32" r="28"
                        stroke="currentColor" strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 28}
                        strokeDashoffset={2 * Math.PI * 28 * (1 - percentage / 100)}
                        className={color}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold ${color}`}>{score}/{max}</span>
                </div>
            </div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">{label}</p>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, Edit, Clock, Users as UsersIcon, Briefcase, CheckCircle, XCircle, AlertCircle, MapPin, Calendar } from 'lucide-react'
import CreateJobModal from './CreateJobModal'
import EditJobModal from './EditJobModal'

export default function JobsBoard({ userProfile, onSignOut, permissions = [] }) {
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    filterJobs()
  }, [jobs, searchQuery, selectedCategory])

  const fetchJobs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        clients (name, address),
        profiles (full_name)
      `)
      .order('created_at', { ascending: false })

    if (data) setJobs(data)
    setLoading(false)
  }

  const filterJobs = () => {
    let filtered = [...jobs]

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'unassigned') {
        filtered = filtered.filter(job => !job.assigned_to)
      } else if (selectedCategory === 'assigned') {
        filtered = filtered.filter(job => job.assigned_to && job.status === 'pending')
      } else {
        filtered = filtered.filter(job => job.status === selectedCategory)
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredJobs(filtered)
  }

  const getCategoryCounts = () => {
    return {
      all: jobs.length,
      unassigned: jobs.filter(j => !j.assigned_to).length,
      assigned: jobs.filter(j => j.assigned_to && j.status === 'pending').length,
      'in-progress': jobs.filter(j => j.status === 'in-progress').length,
      pending: jobs.filter(j => j.status === 'pending').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
    }
  }

  const handleJobClick = (job) => {
    setSelectedJob(job)
    setShowEditModal(true)
  }

  const counts = getCategoryCounts()

  const categories = [
    { id: 'all', label: 'All Jobs', icon: Briefcase, color: 'bg-gray-100 text-gray-800', count: counts.all },
    { id: 'unassigned', label: 'Unassigned', icon: AlertCircle, color: 'bg-red-100 text-red-800', count: counts.unassigned },
    { id: 'assigned', label: 'Assigned', icon: UsersIcon, color: 'bg-purple-100 text-purple-800', count: counts.assigned },
    { id: 'pending', label: 'Pending', icon: Clock, color: 'bg-orange-100 text-orange-800', count: counts.pending },
    { id: 'in-progress', label: 'In Progress', icon: Briefcase, color: 'bg-blue-100 text-blue-800', count: counts['in-progress'] },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-800', count: counts.completed },
    { id: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 text-gray-800', count: counts.cancelled },
  ]

  const canCreateJob = permissions?.includes('jobs.create') || userProfile?.role === 'admin';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Card */}
      <div className="card-premium p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 gradient-success rounded-xl shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Jobs Board</h2>
              <p className="text-sm text-gray-500">Manage and track assignments</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs, clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-premium pl-16"
              />
            </div>

            {canCreateJob && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                New Job
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-smooth border border-transparent ${selectedCategory === category.id
                ? 'bg-gray-800 text-white shadow-lg transform -translate-y-0.5'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                }`}
            >
              <category.icon className="w-4 h-4" />
              <span className="truncate">{category.label}</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${selectedCategory === category.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center card-premium">
            <div className="loading-spinner w-12 h-12 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center card-premium">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No jobs found</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchQuery ? 'Try a different search term' : 'Create your first job to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredJobs.map((job, index) => (
              <div
                key={job.id}
                onClick={() => handleJobClick(job)}
                className="card-premium card-hover p-5 cursor-pointer group border-l-4"
                style={{
                  animationDelay: `${index * 50}ms`,
                  borderLeftColor: job.status === 'completed' ? '#10B981' :
                    job.status === 'in-progress' ? '#3B82F6' :
                      job.status === 'cancelled' ? '#EF4444' : '#F59E0B'
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-smooth line-clamp-1">
                    {job.title}
                  </h3>
                  <span className={`badge ${job.status === 'in-progress' ? 'badge-info' :
                    job.status === 'completed' ? 'badge-success' :
                      job.status === 'cancelled' ? 'badge-error' :
                        'badge-warning'
                    }`}>
                    {job.status === 'pending' && job.assigned_to ? 'Assigned' : job.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <UsersIcon className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900">{job.clients?.name}</span>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                    <span className="line-clamp-1">{job.clients?.address}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    {job.assigned_to ? (
                      <span className="text-gray-600 flex items-center gap-1">
                        Assigned: <span className="font-semibold text-blue-600">{job.profiles?.full_name}</span>
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Unassigned
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                  {job.scheduled_time && (
                    <div className="flex items-center gap-1 text-orange-500 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(job.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onJobCreated={() => {
          fetchJobs()
          setShowCreateModal(false)
        }}
      />

      <EditJobModal
        isOpen={showEditModal}
        currentUserId={userProfile?.id}
        onClose={() => {
          setShowEditModal(false)
          setSelectedJob(null)
        }}
        job={selectedJob}
        onJobUpdated={() => {
          fetchJobs()
          setShowEditModal(false)
          setSelectedJob(null)
        }}
      />
    </div>
  )
}
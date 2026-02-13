import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { X, Save, CheckCircle, Type, AlignLeft, User, Calendar, Clock, Briefcase, Activity, Image as ImageIcon, MessageSquare, Check, ChevronsUpDown } from 'lucide-react'
import { Combobox, Transition } from '@headlessui/react'
import PhotoGallery from './PhotoGallery'
import CommentsList from './CommentsList'
import { useToast } from '../lib/ToastContext'

export default function EditJobModal({ isOpen, onClose, job, onJobUpdated, currentUserId }) {
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState([])
  const [staff, setStaff] = useState([])
  const [jobTypes, setJobTypes] = useState([])

  // Combobox queries
  const [queryClient, setQueryClient] = useState('')
  const [queryJob, setQueryJob] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    assigned_to: '',
    scheduled_time: '',
    status: 'pending'
  })

  // Derived state for Combobox
  const selectedClient = clients.find(c => c.id === formData.client_id) || null

  useEffect(() => {
    if (isOpen && job) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        client_id: job.client_id || '',
        assigned_to: job.assigned_to || '',
        scheduled_time: job.scheduled_time ? job.scheduled_time.substring(0, 16) : '',
        status: job.status || 'pending'
      })
      fetchClients()
      fetchStaff()
      fetchJobTypes()
    }
  }, [isOpen, job])

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    if (data) setClients(data)
  }

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'staff').order('full_name')
    if (data) setStaff(data)
  }

  const fetchJobTypes = async () => {
    const { data } = await supabase.from('job_types').select('*').order('title')
    if (data) setJobTypes(data)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const { showToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updateData = {
        title: formData.title,
        description: formData.description || null,
        client_id: formData.client_id,
        status: formData.status,
        scheduled_time: formData.scheduled_time || null
      }

      // Check if assignment changed
      const oldAssignee = job.assigned_to
      const newAssignee = formData.assigned_to || null

      if (formData.assigned_to && formData.assigned_to !== '') {
        updateData.assigned_to = formData.assigned_to
      } else {
        updateData.assigned_to = null
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', job.id)

      if (error) throw error

      // Send notification if job was newly assigned or reassigned
      if (newAssignee && newAssignee !== oldAssignee) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', formData.client_id)
          .single()

        await supabase
          .from('notifications')
          .insert([{
            user_id: newAssignee,
            title: oldAssignee ? 'Job Reassigned to You' : 'New Job Assigned',
            message: `You have been assigned to "${formData.title}" at ${client?.name || 'a client location'}`,
            type: 'job_assigned',
            related_job_id: job.id,
            is_read: false
          }])
      }

      showToast('Job updated successfully!', 'success')
      onJobUpdated()
      onClose()
    } catch (error) {
      showToast('Error updating job: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id)

      if (error) throw error

      showToast('Job deleted successfully!', 'success')
      onJobUpdated()
      onClose()
    } catch (error) {
      showToast('Error deleting job: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filters
  const filteredClients = queryClient === ''
    ? clients
    : clients.filter((client) =>
      client.name.toLowerCase().replace(/\s+/g, '').includes(queryClient.toLowerCase().replace(/\s+/g, ''))
    )

  const filteredJobTypes = queryJob === ''
    ? jobTypes
    : jobTypes.filter((type) =>
      type.title.toLowerCase().replace(/\s+/g, '').includes(queryJob.toLowerCase().replace(/\s+/g, ''))
    )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn flex flex-col border border-white/20 dark:border-gray-700">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between z-10 transition-colors">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Edit Job</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Update job details and assignment</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Edit Details
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'photos' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <ImageIcon className="w-4 h-4" />
            Photos
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'comments' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Comments
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="relative z-20">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Title *</label>
                <div className="relative">
                  <Combobox value={formData.title} onChange={(val) => setFormData({ ...formData, title: val })}>
                    <div className="relative mt-1">
                      <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white dark:bg-gray-900 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                        <Combobox.Input
                          className="input-premium w-full pr-10 pl-12"
                          onChange={(event) => setQueryJob(event.target.value)}
                          placeholder="e.g., HVAC Maintenance"
                          required
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          <Type className="text-gray-400 icon-fixed" />
                        </div>
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </Combobox.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQueryJob('')}
                      >
                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border border-gray-100 dark:border-gray-700">
                          {filteredJobTypes.length === 0 && queryJob !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                              Create "{queryJob}"
                            </div>
                          ) : (
                            filteredJobTypes.map((type) => (
                              <Combobox.Option
                                key={type.id}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                                  }`
                                }
                                value={type.title}
                              >
                                {({ selected, active }) => (
                                  <>
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {type.title}
                                    </span>
                                    {selected ? (
                                      <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'}`}>
                                        <Check className="h-5 w-5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Combobox.Option>
                            ))
                          )}
                        </Combobox.Options>
                      </Transition>
                    </div>
                  </Combobox>
                </div>
              </div>

              {/* Description */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-4 text-gray-400 icon-fixed" />
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Detailed job description..."
                    className="input-premium pl-12 py-3"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Client */}
                <div className="relative z-10">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client *</label>
                  <Combobox value={selectedClient} onChange={(client) => setFormData({ ...formData, client_id: client.id })}>
                    <div className="relative mt-1">
                      <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white dark:bg-gray-900 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                        <Combobox.Input
                          className="input-premium w-full pr-10 pl-12"
                          displayValue={(client) => client?.name}
                          onChange={(event) => setQueryClient(event.target.value)}
                          placeholder="Search Client..."
                          required
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          <User className="text-gray-400 icon-fixed" />
                        </div>
                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </Combobox.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQueryClient('')}
                      >
                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border border-gray-100 dark:border-gray-700">
                          {filteredClients.length === 0 && queryClient !== '' ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                              Nothing found.
                            </div>
                          ) : (
                            filteredClients.map((client) => (
                              <Combobox.Option
                                key={client.id}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                                  }`
                                }
                                value={client}
                              >
                                {({ selected, active }) => (
                                  <>
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {client.name}
                                    </span>
                                    {selected ? (
                                      <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'}`}>
                                        <Check className="h-5 w-5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Combobox.Option>
                            ))
                          )}
                        </Combobox.Options>
                      </Transition>
                    </div>
                  </Combobox>
                </div>

                {/* Assign To */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign Staff</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
                    <select
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleChange}
                      className="input-premium pl-12 appearance-none"
                    >
                      <option value="">Unassigned</option>
                      {staff.map(member => (
                        <option key={member.id} value={member.id}>{member.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Status */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                  <div className="relative">
                    <Activity className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      required
                      className="input-premium pl-12 appearance-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Scheduled Time */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scheduled Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
                    <input
                      type="datetime-local"
                      name="scheduled_time"
                      value={formData.scheduled_time}
                      onChange={handleChange}
                      className="input-premium pl-12"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-3 rounded-xl border-2 border-red-100 text-red-600 font-semibold hover:bg-red-50 hover:border-red-200 transition-all"
                >
                  Delete Job
                </button>
                <div className="flex-1 flex gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* PHOTOS TAB */}
          {activeTab === 'photos' && (
            <div className="animate-fadeIn">
              <PhotoGallery jobId={job.id} />
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="animate-fadeIn">
              <CommentsList jobId={job.id} userId={currentUserId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
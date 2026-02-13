import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { X, Plus, Check, ChevronsUpDown } from 'lucide-react'
import { Combobox, Transition } from '@headlessui/react'
import { useToast } from '../lib/ToastContext'

export default function CreateJobModal({ isOpen, onClose, onJobCreated }) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState([])
  const [staff, setStaff] = useState([])
  const [jobTypes, setJobTypes] = useState([])

  // Combobox queries
  const [queryClient, setQueryClient] = useState('')
  const [queryJob, setQueryJob] = useState('')

  const [showNewClient, setShowNewClient] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    assigned_to: '',
    scheduled_time: '',
    status: 'pending'
  })
  const [newClient, setNewClient] = useState({
    name: '',
    address: '',
    contact_person: '',
    phone: '',
    latitude: '',
    longitude: ''
  })

  // Derived state for Combobox selection
  const selectedClient = clients.find(c => c.id === formData.client_id) || null

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      fetchStaff()
      fetchJobTypes()
    }
  }, [isOpen])

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

  const handleClientChange = (e) => {
    setNewClient({ ...newClient, [e.target.name]: e.target.value })
  }

  const { showToast } = useToast()

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.address) {
      showToast('Please fill in client name and address', 'warning')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: newClient.name,
          address: newClient.address,
          contact_person: newClient.contact_person || null,
          phone: newClient.phone || null,
          latitude: newClient.latitude ? parseFloat(newClient.latitude) : null,
          longitude: newClient.longitude ? parseFloat(newClient.longitude) : null
        }])
        .select()
        .single()

      if (error) throw error

      showToast('Client created successfully!', 'success')
      setClients([...clients, data])
      setFormData({ ...formData, client_id: data.id })
      setShowNewClient(false)
      setNewClient({ name: '', address: '', contact_person: '', phone: '', latitude: '', longitude: '' })
      setQueryClient('') // Reset query
    } catch (error) {
      showToast('Error creating client: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const jobData = {
        title: formData.title,
        description: formData.description || null,
        client_id: formData.client_id,
        status: formData.status,
        scheduled_time: formData.scheduled_time || null,
        job_type_id: formData.job_type_id || null
      }

      if (formData.assigned_to && formData.assigned_to !== '') {
        jobData.assigned_to = formData.assigned_to
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single()

      if (error) throw error

      if (jobData.assigned_to) {
        await sendJobAssignmentNotification({ ...jobData, id: data.id }, jobData.assigned_to)
      }

      showToast('Job created successfully!', 'success')
      onJobCreated()
      onClose()
      setFormData({ title: '', description: '', client_id: '', assigned_to: '', scheduled_time: '', status: 'pending' })
      setQueryClient('')
      setQueryJob('')
    } catch (error) {
      showToast('Error creating job: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const sendJobAssignmentNotification = async (jobData, assignedUserId) => {
    if (!assignedUserId) return
    try {
      const { data: client } = await supabase.from('clients').select('name').eq('id', jobData.client_id).single()
      await supabase.from('notifications').insert([{
        user_id: assignedUserId,
        title: 'New Job Assigned',
        message: `You have been assigned to "${jobData.title}" at ${client?.name || 'a client location'}`,
        type: 'job_assigned',
        related_job_id: jobData.id,
        is_read: false
      }])
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  // Filtered lists
  const filteredClients =
    queryClient === ''
      ? clients
      : clients.filter((client) =>
        client.name
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(queryClient.toLowerCase().replace(/\s+/g, ''))
      )

  const filteredJobTypes =
    queryJob === ''
      ? jobTypes
      : jobTypes.filter((type) =>
        type.title
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(queryJob.toLowerCase().replace(/\s+/g, ''))
      )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-white/20 dark:border-gray-700">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 transition-colors">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Create New Job</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Job Title Combobox */}
          <div className="relative z-20">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <Combobox
              value={formData.title}
              onChange={(val) => {
                // Check if val corresponds to a known job type
                const knownType = jobTypes.find(t => t.title === val)
                setFormData({
                  ...formData,
                  title: val,
                  job_type_id: knownType ? knownType.id : null
                })
              }}
            >
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white dark:bg-gray-900 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                  <Combobox.Input
                    className="input-premium w-full pr-10"
                    onChange={(event) => {
                      setQueryJob(event.target.value)
                      // If user types, we reset ID unless they type an exact match (handled on blur/submit? No, simpler to just treat as custom)
                      // Actually, let's just leave it null if they type.
                      setFormData(prev => ({ ...prev, title: event.target.value, job_type_id: null }))
                    }}
                    placeholder="Search or type job title..."
                    required
                    displayValue={(title) => title}
                  />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="input-premium"
              placeholder="Additional details about the job..."
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Client <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNewClient(!showNewClient)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {showNewClient ? 'Select Existing' : 'Add New Client'}
              </button>
            </div>

            {showNewClient ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30">
                <input
                  type="text"
                  name="name"
                  value={newClient.name}
                  onChange={handleClientChange}
                  placeholder="Client Name *"
                  required
                  className="input-premium"
                />
                <input
                  type="text"
                  name="address"
                  value={newClient.address}
                  onChange={handleClientChange}
                  placeholder="Address *"
                  required
                  className="input-premium"
                />
                <input
                  type="text"
                  name="contact_person"
                  value={newClient.contact_person}
                  onChange={handleClientChange}
                  placeholder="Contact Person"
                  className="input-premium"
                />
                <input
                  type="tel"
                  name="phone"
                  value={newClient.phone}
                  onChange={handleClientChange}
                  placeholder="Phone Number"
                  className="input-premium"
                />
                <button
                  type="button"
                  onClick={handleCreateClient}
                  className="w-full btn-primary"
                >
                  Create Client
                </button>
              </div>
            ) : (
              <Combobox value={selectedClient} onChange={(client) => setFormData({ ...formData, client_id: client.id })}>
                <div className="relative mt-1">
                  <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white dark:bg-gray-900 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                    <Combobox.Input
                      className="input-premium w-full pr-10"
                      displayValue={(client) => client?.name}
                      onChange={(event) => setQueryClient(event.target.value)}
                      placeholder="Search for a client..."
                      required
                    />
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
                                  {client.name} - <span className={`text-xs ${active ? 'text-gray-200' : 'text-gray-500'}`}>{client.address}</span>
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
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign To (Optional)
            </label>
            <select
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              className="input-premium appearance-none"
            >
              <option value="">Leave Unassigned</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scheduled Time
            </label>
            <input
              type="datetime-local"
              name="scheduled_time"
              value={formData.scheduled_time}
              onChange={handleChange}
              className="input-premium"
            />
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
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
              className="flex-1 btn-primary"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
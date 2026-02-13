import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Save, UserX, UserCheck, Smartphone } from 'lucide-react'

export default function EditStaffModal({ isOpen, onClose, staffMember, onStaffUpdated }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role: 'staff',
    status: 'active'
  })

  useEffect(() => {
    if (isOpen && staffMember) {
      setFormData({
        full_name: staffMember.full_name || '',
        phone_number: staffMember.phone_number || staffMember.phone || '', // Check both
        role: staffMember.role || 'staff',
        status: staffMember.status || 'active'
      })
    }
  }, [isOpen, staffMember])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Ensure we are saving phone_number, not 'phone' if the input has name='phone'
    // But we will update the input name to 'phone_number' below.
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          role: formData.role,
          status: formData.status
        })
        .eq('id', staffMember.id)

      if (error) throw error

      alert('Staff updated successfully!')
      onStaffUpdated()
      onClose()
    } catch (error) {
      alert('Error updating staff: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Are you sure you want to ${newStatus} this staff member?`)) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', staffMember.id)

      if (error) throw error

      alert(`Staff ${newStatus} successfully!`)
      onStaffUpdated()
      onClose()
    } catch (error) {
      alert('Error updating status: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetDevice = async () => {
    if (!confirm('Reset device lock for this staff member? They will be able to log in from a new device.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ device_id: null })
        .eq('id', staffMember.id)

      if (error) throw error

      alert('Device lock has been reset. The staff member can now log in from a new device.')
    } catch (error) {
      alert('Error resetting device: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-white/20 dark:border-gray-700 max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Edit Staff Member
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage account details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="input-premium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              required
              className="input-premium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input-premium appearance-none"
            >
              <option value="staff">Staff</option>
              <option value="procurement">Procurement</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="input-premium appearance-none"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
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
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3">
              {formData.status !== 'suspended' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('suspended')}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors flex items-center justify-center gap-2"
                >
                  <UserX className="w-4 h-4" />
                  Suspend User
                </button>
              )}
              {formData.status === 'suspended' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('active')}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Activate User
                </button>
              )}

              <button
                type="button"
                onClick={handleResetDevice}
                disabled={loading}
                className="col-span-2 px-3 py-2 rounded-xl text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Reset Device Lock
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
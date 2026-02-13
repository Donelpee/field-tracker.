import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, User, Mail, Lock, Phone, Shield } from 'lucide-react'
import { useToast } from '../lib/ToastContext'

export default function AddStaffModal({ isOpen, onClose, onStaffAdded }) {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState([])
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone_number: '',
    role_id: ''
  })

  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchRoles()
    }
  }, [isOpen])

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('name')
    if (data) {
      setRoles(data)
      // Set default role to 'Staff' if found, otherwise first role
      const staffRole = data.find(r => r.name === 'Staff')
      if (staffRole) {
        setFormData(prev => ({ ...prev, role_id: staffRole.id }))
      } else if (data.length > 0) {
        setFormData(prev => ({ ...prev, role_id: data[0].id }))
      }
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Find selected role name for legacy support
      const selectedRole = roles.find(r => r.id === formData.role_id)
      const roleName = selectedRole ? selectedRole.name : 'Staff'

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error('User creation failed')
      }

      // Wait a moment for the auth user to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: formData.fullName,
            phone_number: formData.phone_number,
            role: roleName.toLowerCase().replace(/\s+/g, '_'), // Legacy normalization: 'Super Admin' -> 'super_admin' or just keep as is? 
            // Actually existing code used 'admin', 'staff', 'procurement'. 
            // The new roles are 'Admin', 'Staff'. 
            // Let's safe-guard by using the actual name but maybe lowercase it if we want to stick to convention, 
            // BUT my policies checking `role = 'admin'`. So lowercase is safer if the roles table has 'Admin'.
            // wait, the previous hardcoded values were 'staff', 'procurement', 'admin'. 
            // My seed data has 'Admin', 'Staff'.
            // I should probably normalize to lowercase for the legacy column if that's what the policies expect.
            // My new policies allow 'Admin' (case sensitive?) -> wait, the policy is `profiles.role = 'admin'`. 
            // So I MUST normalize to lowercase 'admin' even if Role Name is 'Admin'.
            role_id: formData.role_id
          }
        ])

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error('Failed to create profile: ' + profileError.message)
      }

      showToast('Staff member added successfully!', 'success')
      onStaffAdded()
      onClose()
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone_number: '',
        role_id: ''
      })
    } catch (error) {
      console.error('Full error:', error)
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-white/20 dark:border-gray-700">
        <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Add Staff Member
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create a new user account</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 z-10" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="input-premium pl-10"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 z-10" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-premium pl-10"
                  placeholder="staff@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 z-10" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="input-premium pl-10"
                  placeholder="Min 6 chars"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 z-10" />
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="input-premium pl-10"
                  placeholder="+234..."
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 z-10" />
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleChange}
                  className="input-premium pl-10 appearance-none"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
            </div>
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
              {loading ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
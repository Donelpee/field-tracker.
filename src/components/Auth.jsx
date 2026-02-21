import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../lib/deviceFingerprint'
import { useToast } from '../lib/ToastContext'
import { Mail, Lock, User, Phone } from 'lucide-react'

export default function Auth({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  })
  const { showToast } = useToast()

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
      if (isSignUp) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              role: 'staff' // FORCE STAFF ROLE
            }
          }
        })

        if (signUpError) throw signUpError

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              full_name: formData.fullName,
              phone: formData.phone,
              role: 'staff'
            })

          if (profileError) {
            // Rollback auth if profile creation fails (Best effort)
            console.error('Profile creation failed', profileError)
            showToast('Account created but profile setup failed. Please contacted support.', 'warning')
          }
        }

        let locationInfo = null
        try {
          const { getCurrentLocation, getAddressFromCoordinates } = await import('../lib/location')
          const position = await getCurrentLocation()
          const address = await getAddressFromCoordinates(position.latitude, position.longitude)
          locationInfo = address.short || address.full
        } catch (error) {
          console.log('Location access denied or unavailable', error)
        }

        if (authData.user) {
          const deviceId = await getDeviceId()
          await supabase.from('login_attempts').insert({
            user_id: authData.user.id,
            device_id: deviceId,
            status: 'success',
            ip_address: null,
            ip_info: locationInfo
          })
        }

        showToast('Account created successfully!', 'success')
        onAuthSuccess()
      } else {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })

        if (signInError) throw signInError

        // Check if device is locked (STAFF ONLY)
        const deviceId = await getDeviceId()
        const { data: existingDevice, error: profileFetchError } = await supabase
          .from('profiles')
          .select('device_id, role')
          .eq('id', authData.user.id)
          .single()

        if (profileFetchError) {
          throw new Error('Could not verify account role. Please try again.')
        }

        const profileRole = String(existingDevice?.role || '').trim().toLowerCase()
        const metadataRole = String(authData.user?.user_metadata?.role || '').trim().toLowerCase()

        if (metadataRole && profileRole && metadataRole !== profileRole) {
          console.warn('Role mismatch detected between profile and auth metadata', {
            profileRole,
            metadataRole,
            userId: authData.user.id
          })
        }

        // Device lock enforcement: Only for staff, NOT admin
        const isStaffRole = profileRole === 'staff'
        const isAdminRole = profileRole === 'admin' || profileRole === 'super admin'

        if (isStaffRole && existingDevice?.device_id && existingDevice.device_id !== deviceId) {
          await supabase.auth.signOut()
          await supabase.from('login_attempts').insert({
            user_id: authData.user.id,
            device_id: deviceId,
            status: 'blocked_device',
            ip_address: null
          })
          throw new Error('This account is locked to another device. Please contact your administrator.')
        }

        // Staff: Set device_id if not already set
        if (isStaffRole && !existingDevice?.device_id) {
          await supabase.from('profiles').update({ device_id: deviceId }).eq('id', authData.user.id)
        }

        // Admin: No device lock enforcement, allow login from any device

        // Capture Location on Login
        let locationInfo = null
        try {
          const { getCurrentLocation, getAddressFromCoordinates } = await import('../lib/location')
          const position = await getCurrentLocation()
          const address = await getAddressFromCoordinates(position.latitude, position.longitude)
          locationInfo = address.short || address.full
        } catch (error) {
          console.log('Location access denied or unavailable', error)
        }

        await supabase.from('login_attempts').insert({
          user_id: authData.user.id,
          device_id: deviceId,
          status: 'success',
          ip_address: null,
          ip_info: locationInfo
        })

        showToast('Welcome back!', 'success')
        onAuthSuccess()
      }
    } catch (error) {
      console.error('Auth error:', error)
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg-light flex items-center justify-center p-4 safe-top safe-bottom">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            Trakby
          </h1>
          <p className="text-gray-600 text-lg">Professional Field Management</p>
        </div>

        {/* Auth Card */}
        <div className="glass-white rounded-3xl shadow-premium p-8 animate-scaleIn">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600 text-sm">
              {isSignUp ? 'Sign up to get started (Staff Only)' : 'Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="input-premium pl-16"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="input-premium pl-16"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-premium pl-16"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 icon-fixed" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-premium pl-16"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full min-h-[48px] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="loading-spinner w-5 h-5 border-2"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
              }}
              className="text-sm text-gray-600 hover:text-gradient-primary transition-smooth font-medium"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 animate-fadeIn">
          <p>© 2026 Trakby. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
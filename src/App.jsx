import { useState, useEffect } from 'react'
import { ThemeProvider } from './lib/ThemeContext'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = (user) => {
    setSession({ user })
  }

  const handleSignOut = async () => {
    // Set user offline before signing out
    if (session?.user?.id) {
      await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('id', session.user.id)
    }
    await supabase.auth.signOut()
    setSession(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <ThemeProvider>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Dashboard session={session} onSignOut={handleSignOut} />
    </ThemeProvider>
  )
}

export default App
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function DebugPage({ session }) {
    const [status, setStatus] = useState({
        user: null,
        profile: null,
        jobs: [],
        clients: [],
        errors: [],
        env: import.meta.env.VITE_SUPABASE_URL
    })

    useEffect(() => {
        runDiagnostics()
    }, [])

    const runDiagnostics = async () => {
        const errors = []

        // 1. Check Session
        const user = session?.user

        // 2. Fetch Profile (Check Role)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user?.id)
            .single()

        if (profileError) errors.push(`Profile Error: ${profileError.message}`)

        // 3. Fetch Jobs (Check RLS)
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .limit(5)

        if (jobsError) errors.push(`Jobs Error: ${jobsError.message}`)

        // 4. Fetch Clients
        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('*')
            .limit(5)

        if (clientsError) errors.push(`Clients Error: ${clientsError.message}`)

        setStatus({
            user,
            profile,
            jobs: jobs || [],
            clients: clients || [],
            errors,
            env: import.meta.env.VITE_SUPABASE_URL
        })
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">System Diagnostics</h1>

            <div className="space-y-6">
                <Section title="1. Environment Check">
                    <p><strong>Supabase URL:</strong> {status.env}</p>
                </Section>

                <Section title="2. Authentication Status">
                    {status.user ? (
                        <div className="text-green-600">
                            Logged in as: {status.user.email}<br />
                            ID: {status.user.id}
                        </div>
                    ) : (
                        <div className="text-red-600 font-bold">NOT LOGGED IN</div>
                    )}
                </Section>

                <Section title="3. User Profile & Role">
                    {status.profile ? (
                        <pre className="bg-white p-2 rounded border border-gray-200">
                            {JSON.stringify(status.profile, null, 2)}
                        </pre>
                    ) : (
                        <div className="text-red-500">Profile Not Found (Constraint/Auth Issue?)</div>
                    )}
                </Section>

                <Section title={`4. Jobs Data (${status.jobs.length} found)`}>
                    {status.jobs.length > 0 ? (
                        <pre className="bg-white p-2 rounded border border-gray-200">
                            {JSON.stringify(status.jobs, null, 2)}
                        </pre>
                    ) : (
                        <div className="text-orange-500">
                            No jobs found. (Either table is empty OR RLS is blocking view)
                        </div>
                    )}
                </Section>

                <Section title={`5. Clients Data (${status.clients.length} found)`}>
                    <pre className="bg-white p-2 rounded border border-gray-200">
                        {JSON.stringify(status.clients, null, 2)}
                    </pre>
                </Section>

                {status.errors.length > 0 && (
                    <Section title="⚠️ ERRORS DETECTED">
                        <div className="bg-red-50 text-red-700 p-4 rounded border border-red-200">
                            {status.errors.map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                    </Section>
                )}
            </div>
        </div>
    )
}

const Section = ({ title, children }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-700 mb-2 border-b pb-1">{title}</h2>
        {children}
    </div>
)

import { useEffect, useMemo, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  const isStandalone = useMemo(() => {
    const displayModeStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    const iosStandalone = typeof window.navigator.standalone === 'boolean' && window.navigator.standalone
    return displayModeStandalone || iosStandalone
  }, [])

  const isIOS = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent), [])

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed') === '1'
    if (wasDismissed) {
      setDismissed(true)
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setDismissed(true)
      localStorage.setItem('pwa-install-dismissed', '1')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const closePrompt = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (isStandalone || dismissed) return null

  const showInstallButton = Boolean(deferredPrompt)
  const showIOSHint = isIOS && !deferredPrompt

  if (!showInstallButton && !showIOSHint) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[10001] lg:left-auto lg:right-6 lg:max-w-sm">
      <div className="card-premium p-4 shadow-premium border border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Install Trakby</p>
              <p className="text-xs text-gray-600 mt-1">
                {showInstallButton
                  ? 'Add this app to your home screen for faster access and offline support.'
                  : 'On iPhone: tap Share, then “Add to Home Screen”.'}
              </p>
            </div>
          </div>
          <button
            onClick={closePrompt}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Dismiss install prompt"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showInstallButton && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full btn-primary py-2 text-sm"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  )
}

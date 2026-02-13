import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now().toString()
        setToasts((prev) => [...prev, { id, message, type }])

        // Auto remove after 3 seconds
        setTimeout(() => {
            removeToast(id)
        }, 4000)
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast: addToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

const ToastItem = ({ toast, onRemove }) => {
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    }

    const styles = {
        success: 'bg-white border-green-100 shadow-green-100',
        error: 'bg-white border-red-100 shadow-red-100',
        warning: 'bg-white border-yellow-100 shadow-yellow-100',
        info: 'bg-white border-blue-100 shadow-blue-100'
    }

    const progressColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    }

    return (
        <div className={`pointer-events-auto flex items-start p-4 rounded-xl border shadow-lg ${styles[toast.type]} animate-slideInRight relative overflow-hidden group`}>
            <div className="flex-shrink-0 mr-3 mt-0.5">
                {icons[toast.type]}
            </div>
            <div className="flex-1 mr-2">
                <p className="text-gray-800 font-medium text-sm leading-snug">{toast.message}</p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress Bar Animation */}
            <div className={`absolute bottom-0 left-0 h-1 ${progressColors[toast.type]} animate-progress opacity-20`} style={{ width: '100%' }}></div>
        </div>
    )
}

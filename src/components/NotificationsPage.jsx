import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/ToastContext'
import { Bell, Check, CheckCheck, Trash2, Briefcase, MapPin, Camera, Award, LogOut } from 'lucide-react'
import Pagination from './Pagination'

export default function NotificationsPage({ userId }) {
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to fetch notifications', err)
      setNotifications([])
      setError('Could not load notifications. Please retry.')
      showToast('Could not load notifications. Please retry.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, userId])

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications_page')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, userId])

  const markAsRead = async (notificationId) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      showToast('Notification marked as read.', 'success')
    } catch (err) {
      console.error('Failed to mark notification as read', err)
      setError('Could not update notification. Please try again.')
      showToast('Could not update notification. Please try again.', 'error')
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (updateError) throw updateError

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      showToast('All notifications marked as read.', 'success')
    } catch (err) {
      console.error('Failed to mark all notifications as read', err)
      setError('Could not mark all notifications as read. Please try again.')
      showToast('Could not mark all notifications as read. Please try again.', 'error')
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) throw deleteError

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      showToast('Notification deleted.', 'success')
    } catch (err) {
      console.error('Failed to delete notification', err)
      setError('Could not delete notification. Please try again.')
      showToast('Could not delete notification. Please try again.', 'error')
    }
  }

  const deleteAllRead = async () => {
    if (!confirm('Delete all read notifications?')) return

    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true)

      if (deleteError) throw deleteError

      setNotifications(prev => prev.filter(n => !n.is_read))
      showToast('Read notifications deleted.', 'success')
    } catch (err) {
      console.error('Failed to delete all read notifications', err)
      setError('Could not delete read notifications. Please try again.')
      showToast('Could not delete read notifications. Please try again.', 'error')
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job_assigned':
        return <Briefcase className="w-5 h-5 text-blue-600" />
      case 'check_in':
        return <MapPin className="w-5 h-5 text-green-600" />
      case 'check_out':
        return <LogOut className="w-5 h-5 text-orange-600" />
      case 'photo_uploaded':
        return <Camera className="w-5 h-5 text-purple-600" />
      case 'job_completed':
        return <Award className="w-5 h-5 text-yellow-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / itemsPerPage))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredNotifications.length, currentPage])

  const totalItems = filteredNotifications.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage)

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Mark All Read
              </button>
            )}
            {notifications.filter(n => n.is_read).length > 0 && (
              <button
                onClick={deleteAllRead}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Read
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {['all', 'unread', 'read'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                filter === tab
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
              {tab === 'unread' && unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-100 bg-red-50 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchNotifications}
              className="px-3 py-1.5 text-sm rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No {filter !== 'all' && filter} notifications</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter === 'unread' ? 'All caught up!' : 'Notifications will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {paginatedNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-5 hover:bg-gray-50 transition ${
                    !notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                      !notification.is_read ? 'bg-white' : 'bg-gray-100'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            {notification.title}
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </h3>
                          <p className="text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  )
}
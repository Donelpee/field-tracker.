import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Send, MessageSquare, User } from 'lucide-react'

export default function CommentsList({ jobId, userId }) {
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [loading, setLoading] = useState(false)

    const fetchComments = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('comments')
                .select(`
            *,
            profiles (full_name, role)
        `)
                .eq('job_id', jobId)
                .order('created_at', { ascending: true })

            if (data) setComments(data)
        } catch (error) {
            console.error("Error fetching comments", error)
        }
    }, [jobId])

    useEffect(() => {
        fetchComments()

        // Subscribe to new comments
        const channel = supabase
            .channel('comments')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'comments',
                filter: `job_id=eq.${jobId}`
            }, () => {
                // Fetch fresh to get profile data OR ideally payload has it if joined, 
                // but simple INSERT payload doesn't have joins.
                // Simplest: just refetch or append placeholder. Refetch is safer.
                fetchComments()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchComments, jobId])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newComment.trim()) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('comments')
                .insert({
                    job_id: jobId,
                    user_id: userId,
                    content: newComment
                })

            if (error) {
                // If table doesn't exist, we might catch it here
                if (error.code === '42P01') {
                    alert("Error: 'comments' table missing. Please ask Admin to create it.")
                }
                throw error
            }

            setNewComment('')
        } catch (error) {
            console.error('Error posting comment:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[400px] border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <h3 className="font-bold text-gray-700 dark:text-gray-300">Comments & Updates</h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{comments.length}</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 && (
                    <p className="text-center text-gray-400 text-sm mt-10">No comments yet. Start the conversation!</p>
                )}
                {comments.map(comment => {
                    const isMe = comment.user_id === userId
                    return (
                        <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                {comment.profiles?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                            </div>
                            <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
                                    }`}>
                                    {comment.content}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1">
                                    {comment.profiles?.full_name} • {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write an update..."
                    className="flex-1 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg px-4 focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                <button
                    type="submit"
                    disabled={loading || !newComment.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { Comment, commentAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface CommentsProps {
  lessonId: number
  playerRef?: React.MutableRefObject<any>
}

export default function Comments({ lessonId, playerRef }: CommentsProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchComments()
  }, [lessonId])

  const fetchComments = async (page: number = 1) => {
    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      const data = await commentAPI.getComments(lessonId, page)
      if (page === 1) {
        setComments(data.results)
      } else {
        setComments(prev => [...prev, ...data.results])
      }
      setCurrentPage(page)
      setHasMore(data.next !== null)
      setTotalCount(data.count)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreComments = () => {
    if (!loadingMore && hasMore) {
      fetchComments(currentPage + 1)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting comment:', newComment)
    if (!newComment.trim() || submitting || !user) return

    const currentTime = playerRef?.current?.currentTime
    const optimisticComment: Comment = {
      id: Date.now(), // Temporary ID
      user_id: user.id,
      username: user.username,
      lesson: lessonId,
      content: newComment.trim(),
      parent: null,
      timestamp_seconds: currentTime ? Math.floor(currentTime) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      reply_count: 0,
      replies: [],
    }

    // Optimistically add comment to UI
    setComments(prev => [optimisticComment, ...prev])
    setNewComment('')
    setSubmitting(true)

    try {
      const result = await commentAPI.createComment({
        lesson: lessonId,
        content: optimisticComment.content,
        timestamp_seconds: optimisticComment.timestamp_seconds || undefined,
      })
      console.log('Comment posted:', result)
      // Replace optimistic comment with real one
      setComments(prev => prev.map(c => c.id === optimisticComment.id ? result : c))
      addToast('Comment posted successfully!', 'success')
    } catch (err) {
      console.error('Error posting comment:', err)
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id))
      addToast('Failed to post comment', 'error')
      // Restore the comment text so user can try again
      setNewComment(optimisticComment.content)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: number) => {
    if (!replyText.trim() || submitting || !user) return

    const optimisticReply: Comment = {
      id: Date.now(), // Temporary ID
      user_id: user.id,
      username: user.username,
      lesson: lessonId,
      content: replyText.trim(),
      parent: parentId,
      timestamp_seconds: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      reply_count: 0,
      replies: [],
    }

    // Optimistically add reply to UI
    setComments(prev => prev.map(c =>
      c.id === parentId
        ? { ...c, replies: [optimisticReply, ...(c.replies || [])] }
        : c
    ))
    setReplyText('')
    setReplyingTo(null)
    setSubmitting(true)

    try {
      const result = await commentAPI.createComment({
        lesson: lessonId,
        content: optimisticReply.content,
        parent: parentId,
      })
      // Replace optimistic reply with real one
      setComments(prev => prev.map(c =>
        c.id === parentId
          ? { ...c, replies: c.replies?.map(r => r.id === optimisticReply.id ? result : r) || [] }
          : c
      ))
      addToast('Reply posted successfully!', 'success')
    } catch (err) {
      console.error('Error posting reply:', err)
      // Remove optimistic reply on error
      setComments(prev => prev.map(c =>
        c.id === parentId
          ? { ...c, replies: c.replies?.filter(r => r.id !== optimisticReply.id) || [] }
          : c
      ))
      addToast('Failed to post reply', 'error')
      setReplyText(optimisticReply.content)
      setReplyingTo(parentId)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: number) => {
    if (!editText.trim() || submitting) return

    try {
      setSubmitting(true)
      await commentAPI.updateComment(commentId, editText.trim())
      setEditingId(null)
      setEditText('')
      await fetchComments()
      addToast('Comment updated successfully!', 'success')
    } catch (err) {
      console.error('Error updating comment:', err)
      addToast('Failed to update comment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await commentAPI.deleteComment(commentId)
      await fetchComments()
      addToast('Comment deleted successfully!', 'success')
    } catch (err) {
      console.error('Error deleting comment:', err)
      addToast('Failed to delete comment', 'error')
    }
  }

  const jumpToTimestamp = (seconds: number) => {
    if (playerRef?.current) {
      playerRef.current.currentTime = seconds
    }
  }

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = user?.id === comment.user_id
    const isEditing = editingId === comment.id

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12' : ''} mb-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 dark:bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {comment.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{comment.username}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.created_at)}</span>
                  {comment.is_edited && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">(edited)</span>
                  )}
                </div>
                {comment.timestamp_seconds !== null && (
                  <button
                    onClick={() => jumpToTimestamp(comment.timestamp_seconds!)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                    {formatTimestamp(comment.timestamp_seconds)}
                  </button>
                )}
              </div>
            </div>
            {isOwner && !isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(comment.id)
                    setEditText(comment.content)
                  }}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Comment Content */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  disabled={submitting}
                  className="px-3 py-1 bg-primary-600 dark:bg-primary-500 text-white rounded hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null)
                    setEditText('')
                  }}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Reply Button */}
          {!isReply && !isEditing && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply {comment.reply_count > 0 && `(${comment.reply_count})`}
            </button>
          )}

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3 ml-10">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={submitting || !replyText.trim()}
                  className="px-3 py-1 bg-primary-600 dark:bg-primary-500 text-white rounded hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 text-sm transition-colors"
                >
                  Reply
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText('')
                  }}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Comments {totalCount > 0 && `(${totalCount})`}
      </h3>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-8">
        <textarea
          value={newComment}
          onChange={(e) => {
            console.log('Typing:', e.target.value)
            setNewComment(e.target.value)
          }}
          placeholder="Add a comment..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {playerRef?.current?.currentTime && (
              <>💡 Your comment will be linked to {formatTimestamp(Math.floor(playerRef.current.currentTime))}</>
            )}
          </span>
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 font-semibold transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {comments.length > 0 ? (
        <>
          <div className="space-y-4">
            {comments.map(comment => renderComment(comment))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMoreComments}
                disabled={loadingMore}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 font-medium transition-colors"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 dark:border-gray-300"></div>
                    Loading...
                  </span>
                ) : (
                  `Load More Comments (${comments.length} of ${totalCount})`
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  )
}

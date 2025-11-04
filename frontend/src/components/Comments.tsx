'use client'

import { useState, useEffect } from 'react'
import { Comment, commentAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface CommentsProps {
  lessonId: number
  playerRef?: React.MutableRefObject<any>
}

export default function Comments({ lessonId, playerRef }: CommentsProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [lessonId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const data = await commentAPI.getComments(lessonId)
      setComments(data)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting comment:', newComment)
    if (!newComment.trim() || submitting) return

    try {
      setSubmitting(true)
      const currentTime = playerRef?.current?.currentTime
      const result = await commentAPI.createComment({
        lesson: lessonId,
        content: newComment.trim(),
        timestamp_seconds: currentTime ? Math.floor(currentTime) : undefined,
      })
      console.log('Comment posted:', result)
      setNewComment('')
      await fetchComments()
      console.log('Comments refreshed')
    } catch (err) {
      console.error('Error posting comment:', err)
      alert('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: number) => {
    if (!replyText.trim() || submitting) return

    try {
      setSubmitting(true)
      await commentAPI.createComment({
        lesson: lessonId,
        content: replyText.trim(),
        parent: parentId,
      })
      setReplyText('')
      setReplyingTo(null)
      await fetchComments()
    } catch (err) {
      console.error('Error posting reply:', err)
      alert('Failed to post reply')
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
    } catch (err) {
      console.error('Error updating comment:', err)
      alert('Failed to update comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await commentAPI.deleteComment(commentId)
      await fetchComments()
    } catch (err) {
      console.error('Error deleting comment:', err)
      alert('Failed to delete comment')
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
        <div className="bg-white rounded-lg p-4 shadow-sm">
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {comment.username[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{comment.username}</span>
                  <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                  {comment.is_edited && (
                    <span className="text-xs text-gray-400 italic">(edited)</span>
                  )}
                </div>
                {comment.timestamp_seconds !== null && (
                  <button
                    onClick={() => jumpToTimestamp(comment.timestamp_seconds!)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
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
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-red-600 hover:text-red-700"
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
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  disabled={submitting}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null)
                    setEditText('')
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Reply Button */}
          {!isReply && !isEditing && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="mt-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
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
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={submitting || !replyText.trim()}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  Reply
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText('')
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Comments {comments.length > 0 && `(${comments.length})`}
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
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-600">
            {playerRef?.current?.currentTime && (
              <>💡 Your comment will be linked to {formatTimestamp(Math.floor(playerRef.current.currentTime))}</>
            )}
          </span>
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-semibold"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  )
}

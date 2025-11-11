'use client'

import { useState, useEffect } from 'react'
import StarRating from './StarRating'
import api from '@/lib/api'

interface CourseReview {
  id: number
  rating: number
  review_text: string
}

interface ReviewModalProps {
  courseId: number
  existingReview?: CourseReview | null
  onClose: () => void
  onSubmit: () => void
}

export default function ReviewModal({ courseId, existingReview, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError('')

    try {
      const method = existingReview ? 'put' : 'post'
      const url = existingReview
        ? `reviews/${existingReview.id}/`
        : 'reviews/'

      await api[method](url, {
        course_id: courseId,
        rating,
        review_text: reviewText
      })

      onSubmit()
      onClose()
    } catch (err: any) {
      const errorMessage = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || 'Failed to submit review. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl mb-6 text-gray-900 dark:text-white">
            {existingReview ? 'Edit Review' : 'Write a Review'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Rating Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Rating *
              </label>
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                readonly={false}
                size="lg"
              />
            </div>

            {/* Review Text Section */}
            <div className="mb-6">
              <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Review (Optional)
              </label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={2000}
                rows={5}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Share your experience with this course..."
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {reviewText.length}/2000 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rating === 0 || loading}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

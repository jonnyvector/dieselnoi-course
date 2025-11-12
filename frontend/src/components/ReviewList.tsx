'use client'

import { useState, useEffect } from 'react'
import StarRating from './StarRating'
import api from '@/lib/api'

interface CourseReview {
  id: number
  rating: number
  review_text: string
  user_name: string
  created_at: string
  updated_at: string
  is_edited: boolean
  is_featured: boolean
  can_edit: boolean
}

interface ReviewListProps {
  courseId: number
}

export default function ReviewList({ courseId }: ReviewListProps) {
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    fetchReviews()
  }, [courseId, sort])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await api.get(`reviews/?course_id=${courseId}&sort=${sort}`)
      // Handle paginated response
      const reviewsData = response.data.results || response.data
      setReviews(Array.isArray(reviewsData) ? reviewsData : [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-700 dark:text-gray-300">Loading reviews...</div>
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No reviews yet. Be the first to review this course!
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="newest">Newest First</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className={`border rounded-lg p-4 ${
              review.is_featured
                ? 'border-gold bg-gold/10 dark:bg-gold/20 dark:border-gold'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <StarRating rating={review.rating} size="sm" />
                  <span className="font-semibold text-gray-900 dark:text-white">{review.user_name}</span>
                  {review.is_featured && (
                    <span className="text-xs bg-gold/30 dark:bg-gold/50 text-gray-900 dark:text-white px-2 py-1 rounded">Featured</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {formatDate(review.created_at)}
                  {review.is_edited && ' (edited)'}
                </p>
              </div>
            </div>
            {review.review_text && (
              <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{review.review_text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

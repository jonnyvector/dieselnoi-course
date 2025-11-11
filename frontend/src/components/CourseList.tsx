'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { courseAPI, subscriptionAPI, Course } from '@/lib/api'
import { CourseListSkeleton } from './Skeleton'
import { useAuth } from '@/contexts/AuthContext'

export default function CourseList() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch courses
        const coursesData = await courseAPI.getCourses()
        setCourses(coursesData)

        // Fetch subscriptions if user is logged in
        if (user) {
          try {
            const subscriptions = await subscriptionAPI.getMySubscriptions()
            console.log('Fetched subscriptions:', subscriptions)
            const subscribedIds = new Set(
              subscriptions
                .filter((sub: any) => sub.status === 'active')
                .map((sub: any) => sub.course_id)
            )
            console.log('Subscribed course IDs:', Array.from(subscribedIds))
            setSubscribedCourseIds(subscribedIds)
          } catch (subError) {
            // Subscriptions might fail if user isn't fully authenticated yet
            console.error('Could not fetch subscriptions:', subError)
          }
        }

        setError(null)
      } catch (err: any) {
        console.error('Error fetching courses:', err)
        setError(
          err.response?.data?.detail ||
          'Failed to load courses. Please ensure you are logged in and the backend is running.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Available Courses</h2>
        <CourseListSkeleton count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">Error Loading Courses</h3>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-dark-bg rounded-lg shadow">
        <p className="text-gray-600 dark:text-gray-300 text-lg">No courses available yet.</p>
      </div>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-heading">Available Courses</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.slug}`}
            className="bg-white dark:bg-dark-bg rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
          >
            {course.thumbnail_url && (
              <div className="h-48 bg-gray-200 flex-shrink-0">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-4 sm:p-6 flex flex-col flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getDifficultyColor(
                    course.difficulty
                  )}`}
                >
                  {course.difficulty}
                </span>
                {subscribedCourseIds.has(course.id) && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700">
                    ✓ Subscribed
                  </span>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {course.lesson_count} lessons
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-dark-heading mb-2">
                {course.title}
              </h3>

              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 flex-grow">
                {course.description}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-auto">
                <span className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-dark-heading">
                  ${course.price}
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-normal">/month</span>
                </span>

                <span className={`w-full sm:w-auto text-center px-4 py-2 text-white rounded transition-colors inline-block ${
                  subscribedCourseIds.has(course.id)
                    ? 'bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600'
                    : 'bg-primary-600 dark:bg-dark-button hover:bg-primary-700 dark:hover:opacity-90'
                }`}>
                  {subscribedCourseIds.has(course.id) ? 'View Course' : 'Subscribe Now'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

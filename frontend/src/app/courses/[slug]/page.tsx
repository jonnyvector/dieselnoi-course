'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { courseAPI, CourseDetail, stripeAPI, subscriptionAPI, Subscription } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        setLoading(true)
        const [courseData, subscriptionsData] = await Promise.allSettled([
          courseAPI.getCourse(params.slug as string),
          subscriptionAPI.getMySubscriptions(),
        ])

        if (courseData.status === 'fulfilled') {
          setCourse(courseData.value)
        } else {
          console.error('Error fetching course:', courseData.reason)
          setError(courseData.reason?.response?.data?.detail || 'Failed to load course')
        }

        if (subscriptionsData.status === 'fulfilled') {
          setSubscriptions(subscriptionsData.value)
        } else {
          // No subscriptions is OK - user just hasn't subscribed yet
          setSubscriptions([])
        }

        setError(null)
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.response?.data?.detail || 'Failed to load course')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.slug, user, authLoading, router])

  const handleSubscribe = async () => {
    try {
      setSubscribing(true)
      const { url } = await stripeAPI.createCheckoutSession(params.slug as string)
      // Redirect to Stripe checkout
      window.location.href = url
    } catch (err: any) {
      console.error('Error creating checkout session:', err)
      alert('Failed to start checkout. Please try again.')
      setSubscribing(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Course</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!course) return null

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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Dieselnoi Muay Thai
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <span className="text-gray-700">Welcome, {user?.username}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Course Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
            ← Back to Courses
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getDifficultyColor(course.difficulty)}`}>
                  {course.difficulty}
                </span>
                <span className="text-sm text-gray-600">
                  {course.lesson_count} lessons
                </span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {course.title}
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl">
                {course.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary-600 mb-4">
                ${course.price}
                <span className="text-sm text-gray-600 font-normal">/month</span>
              </div>
              {subscriptions.some(sub => sub.course_slug === params.slug && sub.is_active) ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Subscribed</span>
                </div>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {subscribing ? 'Redirecting...' : 'Subscribe Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Lessons</h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {course.lessons && course.lessons.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {course.lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${params.slug}/lessons/${lesson.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-gray-500">
                            Lesson {index + 1}
                          </span>
                          {lesson.is_free_preview && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                              FREE PREVIEW
                            </span>
                          )}
                          {!lesson.video_url && !lesson.is_free_preview && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              LOCKED
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {lesson.title}
                        </h3>
                        <p className="text-gray-600">
                          {lesson.description}
                        </p>
                      </div>
                      <div className="ml-6 text-sm text-gray-500">
                        {lesson.duration_minutes} min
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-600">
              No lessons available for this course yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

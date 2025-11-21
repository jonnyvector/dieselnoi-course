'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { courseAPI, CourseDetail, stripeAPI, subscriptionAPI, Subscription, progressAPI, CourseDetailProgress, referralAPI, ReferralCredit, certificateAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { LessonListSkeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import Navigation from '@/components/Navigation'
import StarRating from '@/components/StarRating'
import ReviewList from '@/components/ReviewList'
import ReviewModal from '@/components/ReviewModal'
import ResourceList from '@/components/ResourceList'

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [progress, setProgress] = useState<CourseDetailProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [refreshReviews, setRefreshReviews] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [availableCredits, setAvailableCredits] = useState<ReferralCredit[]>([])
  const [isFirstSubscription, setIsFirstSubscription] = useState(false)
  const [generatingCertificate, setGeneratingCertificate] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        setLoading(true)
        const [courseData, subscriptionsData, progressData, creditsData] = await Promise.allSettled([
          courseAPI.getCourse(params.slug as string),
          subscriptionAPI.getMySubscriptions(),
          progressAPI.getCourseDetailProgress(params.slug as string),
          referralAPI.getCredits(),
        ])

        if (courseData.status === 'fulfilled') {
          setCourse(courseData.value)
        } else {
          console.error('Error fetching course:', courseData.reason)
          setError(courseData.reason?.response?.data?.detail || 'Failed to load course')
        }

        if (subscriptionsData.status === 'fulfilled') {
          setSubscriptions(subscriptionsData.value)
          setIsFirstSubscription(subscriptionsData.value.length === 0)
        } else {
          // No subscriptions is OK - user just hasn't subscribed yet
          setSubscriptions([])
          setIsFirstSubscription(true)
        }

        if (progressData.status === 'fulfilled') {
          setProgress(progressData.value)
        } else {
          // No progress is OK - user might not be subscribed yet
          setProgress(null)
        }

        if (creditsData.status === 'fulfilled') {
          setAvailableCredits(creditsData.value)
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

  // Update current time every minute to check for unlocked lessons (only if there are future unlock dates)
  useEffect(() => {
    const hasFutureUnlockDates = course?.lessons?.some(
      (lesson: any) => lesson.unlock_date && new Date(lesson.unlock_date) > new Date()
    )

    if (!hasFutureUnlockDates) return

    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [course?.lessons])

  // Helper function to check if lesson is still locked (client-side)
  const isLessonLocked = (lesson: any) => {
    if (lesson.is_free_preview) return false
    if (!lesson.unlock_date) return lesson.is_locked
    return new Date(lesson.unlock_date) > currentTime
  }

  const handleSubscribe = async () => {
    try {
      setSubscribing(true)
      const { url } = await stripeAPI.createCheckoutSession(params.slug as string)
      // Redirect to Stripe checkout
      window.location.href = url
    } catch (err: any) {
      console.error('Error creating checkout session:', err)
      addToast('Failed to start checkout. Please try again.', 'error')
      setSubscribing(false)
    }
  }

  const handleDownloadCertificate = async () => {
    try {
      setGeneratingCertificate(true)
      const response = await certificateAPI.generateCertificate(params.slug as string)

      // Download the PDF
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      const downloadUrl = apiUrl.replace('/api', response.download_url)

      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = response.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      addToast('Certificate downloaded successfully! 🎓', 'success')
    } catch (err: any) {
      console.error('Error generating certificate:', err)
      const errorMsg = err.response?.data?.error || 'Failed to generate certificate'
      addToast(errorMsg, 'error')
    } finally {
      setGeneratingCertificate(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <Navigation currentPage="course" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LessonListSkeleton count={5} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Course</h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
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
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <Navigation currentPage="course" />

      {/* Course Header */}
      <div className="bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-4 inline-block">
            ← Back to Courses
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getDifficultyColor(course.difficulty)}`}>
                  {course.difficulty}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {course.lesson_count} lessons
                </span>
                {progress && progress.completion_percentage > 0 && (
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                    {progress.completion_percentage}% Complete
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl mb-4">
                {course.title}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
                {course.description}
              </p>
              {course.average_rating && (
                <div className="flex items-center gap-2 mt-4">
                  <StarRating rating={parseFloat(course.average_rating.toString())} size="sm" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {parseFloat(course.average_rating.toString()).toFixed(1)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ({course.total_reviews} {course.total_reviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
              {progress && progress.completion_percentage > 0 && (
                <div className="mt-4 max-w-md">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {progress.completed_lessons} of {progress.total_lessons} lessons
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-primary-600 dark:bg-primary-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress.completion_percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="lg:text-right">
              <div className="space-y-3">
                <div className="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-dark-heading">
                  ${course.price}
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-normal">/month</span>
                </div>

                {/* Pricing breakdown for new subscribers */}
                {!subscriptions.some(sub => sub.course_slug === params.slug && sub.is_active) && (
                  <div className="text-sm text-left lg:text-right space-y-2">
                    {isFirstSubscription && (
                      <div className="flex items-center justify-between lg:justify-end gap-2 text-green-700 dark:text-green-400">
                        <span>🎁 First-time discount (20% off):</span>
                        <span className="font-semibold">-${(parseFloat(course.price) * 0.2).toFixed(2)}</span>
                      </div>
                    )}
                    {availableCredits.length > 0 && (
                      <div className="flex items-center justify-between lg:justify-end gap-2 text-yellow-700 dark:text-yellow-400">
                        <span>💰 Referral credits:</span>
                        <span className="font-semibold">
                          -${availableCredits.reduce((sum, credit) => sum + parseFloat(credit.amount.toString()), 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(isFirstSubscription || availableCredits.length > 0) && (
                      <>
                        <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex items-center justify-between lg:justify-end gap-2 font-bold text-gray-900 dark:text-gray-100">
                          <span>First month total:</span>
                          <span className="text-lg">
                            ${Math.max(0,
                              parseFloat(course.price) * (isFirstSubscription ? 0.8 : 1) -
                              availableCredits.reduce((sum, credit) => sum + parseFloat(credit.amount.toString()), 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                          {isFirstSubscription && availableCredits.length > 0
                            ? 'Discount and credits apply to first month only'
                            : isFirstSubscription
                            ? 'Discount applies to first month only'
                            : 'Credits apply automatically'}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                {subscriptions.some(sub => sub.course_slug === params.slug && sub.is_active) ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Subscribed</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full sm:w-auto px-6 py-3 bg-primary-600 dark:bg-dark-button text-white font-semibold rounded-lg hover:bg-primary-700 dark:hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {subscribing ? 'Redirecting...' : 'Subscribe Now'}
                  </button>
                )}

                {/* Certificate Download Button - show when course is 100% complete */}
                {subscriptions.some(sub => sub.course_slug === params.slug && sub.is_active) &&
                 progress && progress.completion_percentage === 100 && (
                  <button
                    onClick={handleDownloadCertificate}
                    disabled={generatingCertificate}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 dark:bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {generatingCertificate ? 'Generating...' : 'Download Certificate'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl mb-6">Course Lessons</h2>

        <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow overflow-hidden">
          {course.lessons && course.lessons.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {course.lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${params.slug}/lessons/${lesson.id}`}
                  className="block hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex gap-4 sm:contents">
                        {/* Video Thumbnail */}
                        <div className="flex-shrink-0 w-24 h-16 sm:w-32 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {lesson.mux_playback_id ? (
                            <img
                              src={`https://image.mux.com/${lesson.mux_playback_id}/thumbnail.jpg?width=256&height=160&fit_mode=smartcrop&time=0`}
                              alt={lesson.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Lesson Info - Mobile */}
                        <div className="flex-1 min-w-0 sm:hidden">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              Lesson {index + 1}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {lesson.duration_minutes} min
                            </span>
                          </div>
                          <h3 className="text-base font-semibold mb-1">
                            {lesson.title}
                          </h3>
                        </div>
                      </div>

                      {/* Lesson Info - Desktop */}
                      <div className="hidden sm:block flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            Lesson {index + 1}
                          </span>
                          {progress?.lessons.find(l => l.lesson_id === lesson.id)?.is_completed && (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              COMPLETED
                            </span>
                          )}
                          {lesson.is_free_preview && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded">
                              FREE PREVIEW
                            </span>
                          )}
                          {isLessonLocked(lesson) && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              {lesson.unlock_date ? `Unlocks ${new Date(lesson.unlock_date).toLocaleDateString()} at ${new Date(lesson.unlock_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'LOCKED'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          {lesson.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {lesson.description}
                        </p>
                      </div>

                      {/* Badges - Mobile only */}
                      <div className="flex flex-wrap items-center gap-2 sm:hidden">
                        {progress?.lessons.find(l => l.lesson_id === lesson.id)?.is_completed && (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            COMPLETED
                          </span>
                        )}
                        {lesson.is_free_preview && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded">
                            FREE PREVIEW
                          </span>
                        )}
                        {isLessonLocked(lesson) && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            {lesson.unlock_date ? `Unlocks ${new Date(lesson.unlock_date).toLocaleDateString()}` : 'LOCKED'}
                          </span>
                        )}
                      </div>

                      {/* Description - Mobile only */}
                      <p className="text-gray-600 dark:text-gray-400 text-sm sm:hidden">
                        {lesson.description}
                      </p>

                      {/* Duration - Desktop only */}
                      <div className="hidden sm:block flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                        {lesson.duration_minutes} min
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400">
              No lessons available for this course yet.
            </div>
          )}
        </div>

        {/* Course Resources Section */}
        {subscriptions.some(sub => sub.course_slug === params.slug && sub.is_active) && course.resources && course.resources.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl mb-6">Course Resources</h2>
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow p-6">
              <ResourceList resources={course.resources} />
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {subscriptions.some(sub => sub.course_slug === params.slug && sub.is_active) && (
          <div className="mt-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl">Student Reviews</h2>
                {course.average_rating && (
                  <div className="flex items-center gap-2 mt-2">
                    <StarRating rating={parseFloat(course.average_rating.toString())} size="sm" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {parseFloat(course.average_rating.toString()).toFixed(1)}
                    </span>
                    <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      ({course.total_reviews} {course.total_reviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>

              {/* Write/Edit Review Button */}
              {progress && progress.completion_percentage >= 50 && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="w-full sm:w-auto px-6 py-2 bg-primary-600 dark:bg-dark-button text-white font-semibold rounded-lg hover:bg-primary-700 dark:hover:opacity-90 transition-colors"
                >
                  {course.user_review ? 'Edit Review' : 'Write a Review'}
                </button>
              )}
            </div>

            {/* User's Review */}
            {course.user_review && (
              <div className="bg-purple/10 dark:bg-purple/20 border-2 border-purple dark:border-purple rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Your Review</p>
                    <StarRating rating={course.user_review.rating} />
                    {course.user_review.review_text && (
                      <p className="mt-2 text-gray-700 dark:text-gray-300">{course.user_review.review_text}</p>
                    )}
                    {course.user_review.is_edited && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Edited</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="self-start text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* All Reviews */}
            <div className="card p-6">
              <ReviewList key={refreshReviews} courseId={course.id} />
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && course && (
        <ReviewModal
          courseId={course.id}
          existingReview={course.user_review}
          onClose={() => setShowReviewModal(false)}
          onSubmit={() => {
            setRefreshReviews(prev => prev + 1)
            // Refresh course data to get updated user_review
            courseAPI.getCourse(params.slug as string).then(setCourse)
          }}
        />
      )}
    </div>
  )
}

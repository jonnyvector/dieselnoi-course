'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { subscriptionAPI, stripeAPI, Subscription, progressAPI, CourseProgress } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirectingToPortal, setRedirectingToPortal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        setLoading(true)
        const [subscriptionsData, progressData] = await Promise.allSettled([
          subscriptionAPI.getMySubscriptions(),
          progressAPI.getCourseProgress(),
        ])

        if (subscriptionsData.status === 'fulfilled') {
          setSubscriptions(subscriptionsData.value)
        }

        if (progressData.status === 'fulfilled') {
          setCourseProgress(progressData.value)
        }

        setError(null)
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.response?.data?.detail || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, authLoading, router])

  const handleManageBilling = async () => {
    try {
      setRedirectingToPortal(true)
      const { url } = await stripeAPI.createPortalSession()
      window.location.href = url
    } catch (err: any) {
      console.error('Error creating portal session:', err)
      alert('Failed to open billing portal. Please try again.')
      setRedirectingToPortal(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const activeSubscriptions = subscriptions.filter(sub => sub.is_active)

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
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                Browse Courses
              </Link>
              <Link href="/dashboard" className="text-primary-600 font-semibold">
                Dashboard
              </Link>
              {user?.is_staff && (
                <>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <Link
                    href="/admin/upload-video"
                    className="flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Video
                  </Link>
                  <Link
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/admin/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-gray-700 hover:text-primary-600 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Django Admin
                  </Link>
                </>
              )}
              <span className="text-gray-700">Welcome, {user?.username}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
          <p className="text-gray-600">Manage your subscriptions and training progress</p>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Subscriptions</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {activeSubscriptions.length} active {activeSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}
                </p>
              </div>
              {activeSubscriptions.length > 0 && (
                <button
                  onClick={handleManageBilling}
                  disabled={redirectingToPortal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {redirectingToPortal ? 'Opening...' : 'Manage Billing'}
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {activeSubscriptions.length > 0 ? (
              <div className="space-y-4">
                {activeSubscriptions.map((subscription) => {
                  const progress = courseProgress.find(p => p.course_slug === subscription.course_slug)
                  return (
                    <Link
                      key={subscription.id}
                      href={`/courses/${subscription.course_slug}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {subscription.course_title}
                            </h3>
                            {progress && progress.completion_percentage === 100 && (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                              {subscription.status.toUpperCase()}
                            </span>
                            <span>
                              Started {new Date(subscription.start_date).toLocaleDateString()}
                            </span>
                          </div>
                          {progress && (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600">
                                  {progress.completed_lessons} of {progress.total_lessons} lessons completed
                                </span>
                                <span className="font-semibold text-primary-600">
                                  {progress.completion_percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress.completion_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscriptions</h3>
                <p className="text-gray-600 mb-4">Start your Muay Thai journey today!</p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Inactive Subscriptions */}
        {subscriptions.filter(sub => !sub.is_active).length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Past Subscriptions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {subscriptions.filter(sub => !sub.is_active).map((subscription) => (
                  <div
                    key={subscription.id}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">
                          {subscription.course_title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold">
                            {subscription.status.toUpperCase()}
                          </span>
                          <span>
                            {subscription.start_date && `Started ${new Date(subscription.start_date).toLocaleDateString()}`}
                            {subscription.end_date && ` • Ended ${new Date(subscription.end_date).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/courses/${subscription.course_slug}`}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded hover:bg-primary-700 transition-colors"
                      >
                        Resubscribe
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Browse Courses</h3>
            <p className="text-sm text-gray-600">Explore all available training programs</p>
          </Link>

          {activeSubscriptions.length > 0 && (
            <button
              onClick={handleManageBilling}
              disabled={redirectingToPortal}
              className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-left disabled:opacity-50"
            >
              <div className="flex items-center mb-3">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Billing & Payments</h3>
              <p className="text-sm text-gray-600">Update payment method or view invoices</p>
            </button>
          )}

          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Training Progress</h3>
            {courseProgress.length > 0 ? (
              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  {courseProgress.reduce((sum, p) => sum + p.completed_lessons, 0)} total lessons completed
                </p>
                <p className="text-xs text-gray-500">
                  Average: {Math.round(courseProgress.reduce((sum, p) => sum + p.completion_percentage, 0) / courseProgress.length)}% complete
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Start watching lessons to track your progress</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

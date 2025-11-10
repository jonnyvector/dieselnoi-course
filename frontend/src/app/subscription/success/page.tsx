'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function SubscriptionSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [countdown, setCountdown] = useState(5)
  const [waitingForAuth, setWaitingForAuth] = useState(true)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (authLoading) return

    if (!user && waitingForAuth) {
      // Give auth a moment to restore after Stripe redirect
      const authTimeout = setTimeout(() => {
        setWaitingForAuth(false)
      }, 2000)

      return () => clearTimeout(authTimeout)
    }

    if (!user && !waitingForAuth) {
      // After waiting, still no user - redirect to login
      router.push('/login?from=subscription')
      return
    }

    if (user) {
      // User authenticated, start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push('/dashboard')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [user, authLoading, router, waitingForAuth])

  if (authLoading || (waitingForAuth && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
          <p className="mt-6 text-xl text-gray-700 font-medium">Processing your subscription...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait a moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Dieselnoi Muay Thai! 🥊
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-8">
            Your subscription is now active. Get ready to train with the legend!
          </p>

          {/* What's Next Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 What&apos;s Next?
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Access Your Dashboard</span>
                  <p className="text-sm text-gray-600">View all your courses and track progress</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Start Your First Lesson</span>
                  <p className="text-sm text-gray-600">Begin with the fundamentals or jump into advanced techniques</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Train Consistently</span>
                  <p className="text-sm text-gray-600">Learn from Dieselnoi&apos;s decades of championship experience</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Session Info (if available) */}
          {sessionId && (
            <div className="text-sm text-gray-500 mb-6">
              <p>Confirmation: {sessionId.substring(0, 20)}...</p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-colors shadow-lg"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
            >
              Browse Courses
            </Link>
          </div>

          {/* Auto-redirect message */}
          <p className="mt-8 text-sm text-gray-500">
            Redirecting to your dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help? Visit our{' '}
            <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
              support center
            </Link>
            {' '}or manage your subscription in your{' '}
            <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
              dashboard
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

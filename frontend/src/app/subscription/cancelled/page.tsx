'use client'

import Link from 'next/link'

export default function SubscriptionCancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Cancelled Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Cancelled Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Checkout Cancelled
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-8">
            No worries! You can subscribe anytime you&apos;re ready.
          </p>

          {/* Reassurance Section */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              💡 Still Interested?
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Browse Free Previews</span>
                  <p className="text-sm text-gray-600">Check out our free preview lessons to see what we offer</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Learn More About Dieselnoi</span>
                  <p className="text-sm text-gray-600">Discover the legend behind the training</p>
                </div>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">Subscribe When Ready</span>
                  <p className="text-sm text-gray-600">We&apos;ll be here whenever you decide to start training</p>
                </div>
              </li>
            </ul>
          </div>

          {/* No Charges Notice */}
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">No charges were made.</span> You can complete checkout anytime from any course page.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-colors shadow-lg"
            >
              Browse Courses
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Have questions?{' '}
            <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
              Contact us
            </Link>
            {' '}or explore our{' '}
            <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
              free preview content
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

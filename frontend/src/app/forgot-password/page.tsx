'use client'

import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/auth/password-reset/`, { email })
      setMessage(response.data.message)
      setEmail('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {message && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
              <p className="text-sm text-green-800 dark:text-green-300">{message}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-dark-bg rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-dark-button dark:hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <Link
              href="/login"
              className="text-center text-sm text-primary-600 dark:text-gold-400 hover:text-primary-500 dark:hover:text-gold-300"
            >
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

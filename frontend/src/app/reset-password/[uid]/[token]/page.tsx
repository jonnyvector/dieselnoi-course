'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PageProps {
  params: {
    uid: string
    token: string
  }
}

export default function ResetPasswordPage({ params }: PageProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      await axios.post(`${API_URL}/api/auth/password-reset-confirm/`, {
        uid: params.uid,
        token: params.token,
        new_password: newPassword,
      })

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-6">
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">
              Password reset successful!
            </h2>
            <p className="text-sm text-green-700 dark:text-green-400">
              You can now log in with your new password. Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="sr-only">
                New password
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-dark-bg rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-dark-bg rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-dark-button dark:hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset password'}
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

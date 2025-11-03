'use client'

import { useRouter } from 'next/navigation'
import CourseList from '@/components/CourseList'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Dieselnoi Muay Thai
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="text-gray-600">Loading...</div>
              ) : user ? (
                <>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Dashboard
                  </button>
                  <span className="text-gray-700">
                    Welcome, {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push('/signup')}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <header className="mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Authentic Golden Era Muay Thai Training
          </h2>
          <p className="text-lg text-gray-600">
            Learn from legendary fighter Dieselnoi
          </p>
        </header>

        <CourseList />
      </div>
    </main>
  )
}

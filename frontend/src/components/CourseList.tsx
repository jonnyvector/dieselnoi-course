'use client'

import { useState, useEffect } from 'react'
import { courseAPI, Course } from '@/lib/api'

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const data = await courseAPI.getCourses()
        setCourses(data)
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

    fetchCourses()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Courses</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-600 text-lg">No courses available yet.</p>
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
      <h2 className="text-2xl font-bold text-gray-900">Available Courses</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            {course.thumbnail_url && (
              <div className="h-48 bg-gray-200">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getDifficultyColor(
                    course.difficulty
                  )}`}
                >
                  {course.difficulty}
                </span>
                <span className="text-sm text-gray-600">
                  {course.lesson_count} lessons
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {course.title}
              </h3>

              <p className="text-gray-600 mb-4 line-clamp-3">
                {course.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary-600">
                  ${course.price}
                  <span className="text-sm text-gray-600 font-normal">/month</span>
                </span>

                <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
                  View Course
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

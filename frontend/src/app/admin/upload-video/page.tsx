'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { courseAPI, muxAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'

// Lazy load MuxUploader to improve initial page load
const MuxUploader = lazy(() => import('@mux/mux-uploader-react'))

interface Course {
  id: number
  title: string
  slug: string
}

interface Lesson {
  id: number
  title: string
  order: number
}

interface CourseWithLessons extends Course {
  lessons: Lesson[]
}

export default function AdminUploadVideoPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [courses, setCourses] = useState<CourseWithLessons[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourses = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        setLoading(true)
        const allCourses = await courseAPI.getCourses()

        // Fetch lessons for each course
        const coursesWithLessons = await Promise.all(
          allCourses.map(async (course: Course) => {
            const courseDetail = await courseAPI.getCourse(course.slug)
            return {
              ...course,
              lessons: courseDetail.lessons.sort((a, b) => a.order - b.order)
            }
          })
        )

        setCourses(coursesWithLessons)
        console.log('✓ Loaded courses:', coursesWithLessons.length)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching courses:', err)
        const errorMsg = err.response?.data?.detail || err.message || 'Failed to load courses'
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user, authLoading, router])

  const handleCreateUpload = async () => {
    if (!selectedLesson) {
      setError('Please select a lesson')
      return
    }

    try {
      setCreating(true)
      setError(null)
      setSuccess(null)

      console.log('Creating upload for lesson:', selectedLesson)
      const { upload_url } = await muxAPI.createUploadUrl(selectedLesson)
      console.log('✓ Got upload URL')
      setUploadUrl(upload_url)
    } catch (err: any) {
      console.error('Error creating upload:', err)
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to create upload URL'
      setError(errorMsg)
    } finally {
      setCreating(false)
    }
  }

  const handleUploadSuccess = () => {
    setSuccess('Video uploaded successfully! It may take a few minutes to process.')
    setUploadUrl(null)
    setSelectedLesson(null)
    setSelectedCourse('')
  }

  const handleUploadError = (error: any) => {
    console.error('Upload error:', error)
    setError('Failed to upload video. Please try again.')
    setUploadUrl(null)
  }

  const selectedCourseData = courses.find(c => c.slug === selectedCourse)
  const lessons = selectedCourseData?.lessons || []

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Navigation currentPage="admin" />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-heading mb-2">
            Upload Video to Lesson
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Select a lesson and upload a video file. The video will be processed by Mux and automatically attached to the lesson.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Course and Lesson Selection */}
        <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-heading mb-4">
            Step 1: Select Lesson
          </h2>

          {/* Course Selector */}
          <div className="mb-4">
            <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course
            </label>
            <select
              id="course"
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value)
                setSelectedLesson(null)
                setUploadUrl(null)
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            >
              <option value="">Select a course...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.slug}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Selector */}
          {selectedCourse && (
            <div className="mb-4">
              <label htmlFor="lesson" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lesson
              </label>
              <select
                id="lesson"
                value={selectedLesson || ''}
                onChange={(e) => {
                  setSelectedLesson(Number(e.target.value))
                  setUploadUrl(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              >
                <option value="">Select a lesson...</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.order}. {lesson.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Create Upload Button */}
          {selectedLesson && !uploadUrl && (
            <button
              onClick={handleCreateUpload}
              disabled={creating}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:bg-dark-button dark:hover:opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Preparing Upload...' : 'Prepare Video Upload'}
            </button>
          )}
        </div>

        {/* Upload Component */}
        {uploadUrl && (
          <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-heading mb-4">
              Step 2: Upload Video File
            </h2>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>}>
                <MuxUploader
                  endpoint={uploadUrl}
                  onSuccess={handleUploadSuccess}
                  onError={handleUploadError}
                />
              </Suspense>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              <p className="mb-2"><strong>Tips:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Supported formats: MP4, MOV, AVI, and more</li>
                <li>Maximum file size: 5GB (recommended)</li>
                <li>Processing usually takes 1-5 minutes depending on video length</li>
                <li>You can close this page after upload completes</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

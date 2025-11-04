'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import MuxPlayer from '@mux/mux-player-react'
import api, { Lesson, stripeAPI, progressAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import Comments from '@/components/Comments'

export default function LessonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [savedWatchTime, setSavedWatchTime] = useState<number>(0)
  const [hasResumed, setHasResumed] = useState(false)
  const playerRef = useRef<any>(null)
  const progressMarkedRef = useRef(false)
  const lastSavedTimeRef = useRef(0)

  useEffect(() => {
    const fetchLesson = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        setLoading(true)
        const [lessonResponse, progressResponse] = await Promise.allSettled([
          api.get(`/lessons/${params.id}/`),
          progressAPI.getMyProgress(),
        ])

        if (lessonResponse.status === 'fulfilled') {
          setLesson(lessonResponse.value.data)
        }

        // Check if there's saved progress for this lesson
        if (progressResponse.status === 'fulfilled') {
          const lessonProgress = progressResponse.value.find(
            (p: any) => p.lesson === Number(params.id)
          )
          if (lessonProgress) {
            setSavedWatchTime(lessonProgress.watch_time_seconds || 0)
            setIsCompleted(lessonProgress.is_completed)
            if (lessonProgress.is_completed) {
              progressMarkedRef.current = true
            }
          }
        }

        setError(null)
      } catch (err: any) {
        console.error('Error fetching lesson:', err)
        setError(err.response?.data?.detail || 'Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
  }, [params.id, user, authLoading, router])

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

  const handleVideoProgress = async () => {
    if (!lesson) return

    const player = playerRef.current
    if (!player) return

    const currentTime = player.currentTime || 0
    const duration = player.duration || 0

    // Resume to saved position on first play
    if (!hasResumed && savedWatchTime > 5 && currentTime < 5) {
      player.currentTime = savedWatchTime
      setHasResumed(true)
      return
    }

    // Save progress every 10 seconds
    if (currentTime - lastSavedTimeRef.current >= 10) {
      lastSavedTimeRef.current = currentTime
      try {
        await progressAPI.updateWatchTime(lesson.id, Math.floor(currentTime))
      } catch (err) {
        console.error('Error saving watch time:', err)
      }
    }

    // Mark as complete if watched 90% or more
    if (duration > 0 && currentTime / duration >= 0.9 && !progressMarkedRef.current) {
      try {
        progressMarkedRef.current = true
        await progressAPI.markLessonComplete(lesson.id, Math.floor(currentTime))
        setIsCompleted(true)
      } catch (err) {
        console.error('Error marking lesson complete:', err)
        progressMarkedRef.current = false
      }
    }
  }

  const handleVideoEnded = async () => {
    if (!lesson || progressMarkedRef.current) return

    try {
      progressMarkedRef.current = true
      const player = playerRef.current
      const watchTime = player?.currentTime ? Math.floor(player.currentTime) : 0
      await progressAPI.markLessonComplete(lesson.id, watchTime)
      setIsCompleted(true)
    } catch (err) {
      console.error('Error marking lesson complete:', err)
      progressMarkedRef.current = false
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Lesson</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => router.push(`/courses/${params.slug}`)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  if (!lesson) return null

  const isLocked = !lesson.mux_playback_id && !lesson.video_url && !lesson.is_free_preview

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

      {/* Lesson Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/courses/${params.slug}`}
          className="text-primary-600 hover:text-primary-700 mb-6 inline-block"
        >
          ← Back to Course
        </Link>

        {/* Resume notification */}
        {savedWatchTime > 5 && !hasResumed && !isLocked && lesson.mux_playback_id && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              <span className="text-sm text-blue-900 font-medium">
                Resume from {Math.floor(savedWatchTime / 60)}:{String(Math.floor(savedWatchTime % 60)).padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={() => {
                setSavedWatchTime(0)
                setHasResumed(true)
              }}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
            >
              Start from beginning
            </button>
          </div>
        )}

        {/* Video Player or Locked Message */}
        <div className="bg-black rounded-lg overflow-hidden mb-8" style={{ aspectRatio: '16/9' }}>
          {isLocked ? (
            <div className="h-full flex flex-col items-center justify-center text-white bg-gray-900">
              <svg className="w-16 h-16 mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <h3 className="text-2xl font-bold mb-2">This lesson is locked</h3>
              <p className="text-gray-400 mb-6">Subscribe to access this content</p>
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribing ? 'Redirecting...' : 'Subscribe Now'}
              </button>
            </div>
          ) : lesson.mux_playback_id ? (
            <MuxPlayer
              ref={playerRef}
              playbackId={lesson.mux_playback_id}
              streamType="on-demand"
              autoPlay={false}
              metadata={{
                video_title: lesson.title,
              }}
              onTimeUpdate={handleVideoProgress}
              onEnded={handleVideoEnded}
              style={{ height: '100%', maxWidth: '100%' }}
            />
          ) : lesson.video_url ? (
            <div className="h-full flex items-center justify-center bg-gray-900 text-white">
              {/* Fallback for non-Mux videos */}
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                <p className="text-gray-400 mb-2">Legacy Video Format</p>
                <p className="text-sm text-gray-500">Video URL: {lesson.video_url}</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
              <div className="text-center">
                <p>No video available</p>
              </div>
            </div>
          )}
        </div>

        {/* Lesson Info */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {lesson.is_free_preview && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded">
                    FREE PREVIEW
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    COMPLETED
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {lesson.title}
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {lesson.duration_minutes} minutes
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-600 text-lg">
              {lesson.description}
            </p>
          </div>

          {/* Additional lesson content could go here */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About this lesson</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2 font-semibold">{lesson.duration_minutes} minutes</span>
              </div>
              <div>
                <span className="text-gray-600">Access:</span>
                <span className="ml-2 font-semibold">
                  {lesson.is_free_preview ? 'Free Preview' : 'Subscription Required'}
                </span>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {!isLocked && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <Comments lessonId={lesson.id} playerRef={playerRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

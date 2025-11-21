'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import api, { Lesson, stripeAPI, progressAPI, courseAPI, CourseDetail } from '@/lib/api'

// Dynamic import for MuxPlayer to reduce initial bundle size
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false })
import { useAuth } from '@/contexts/AuthContext'
import Comments from '@/components/Comments'
import { VideoPlayerSkeleton, CommentListSkeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import Navigation from '@/components/Navigation'

// Badge icon mapping (constant to avoid recreating on each render)
const BADGE_ICON_MAP: { [key: string]: string } = {
  'gi-white-belt': '🥋',
  'books': '📚',
  'muscle': '💪',
  'trophy': '🏆',
  'star': '⭐',
  'chat': '💬',
  'megaphone': '📣',
}

const getBadgeIcon = (iconName: string): string => BADGE_ICON_MAP[iconName] || '🎖️'

export default function LessonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
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
        const [lessonResponse, courseResponse, progressResponse] = await Promise.allSettled([
          api.get(`/lessons/${params.id}/`),
          courseAPI.getCourse(params.slug as string),
          progressAPI.getMyProgress(),
        ])

        if (lessonResponse.status === 'fulfilled') {
          setLesson(lessonResponse.value.data)
        }

        // Get course data to find next lesson
        if (courseResponse.status === 'fulfilled') {
          const courseData = courseResponse.value
          setCourse(courseData)

          // Find current lesson index and next lesson
          const currentLessonId = Number(params.id)
          const currentIndex = courseData.lessons?.findIndex((l: Lesson) => l.id === currentLessonId) ?? -1
          if (currentIndex !== -1 && courseData.lessons && currentIndex < courseData.lessons.length - 1) {
            const nextLessonData = courseData.lessons[currentIndex + 1]
            if (nextLessonData) {
              setNextLesson(nextLessonData)
            }
          }
        }

        // Check if there's saved progress for this lesson
        if (progressResponse.status === 'fulfilled') {
          const progressData = progressResponse.value
          // Handle both paginated and non-paginated responses
          const progressArray = Array.isArray(progressData) ? progressData : ((progressData as any)?.results || [])
          const lessonProgress = progressArray.find(
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
  }, [params.id, params.slug, user, authLoading, router])

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

    // Resume to saved position on first play (but not for completed lessons)
    if (!hasResumed && !isCompleted && savedWatchTime > 5 && currentTime < 5) {
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
        const response = await progressAPI.markLessonComplete(lesson.id, Math.floor(currentTime))
        setIsCompleted(true)
        addToast('Lesson completed! Great work!', 'success')

        // Check for newly earned badges
        const responseData = response as any
        if (responseData.newly_earned_badges && responseData.newly_earned_badges.length > 0) {
          responseData.newly_earned_badges.forEach((badge: any) => {
            const badgeIcon = getBadgeIcon(badge.icon)
            addToast(`${badgeIcon} Achievement Unlocked: ${badge.name}!`, 'success')
          })
        }
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
      const response = await progressAPI.markLessonComplete(lesson.id, watchTime)
      setIsCompleted(true)
      addToast('Lesson completed! Great work!', 'success')

      // Check for newly earned badges
      const badgeResponse = response as any
      if (badgeResponse.newly_earned_badges && badgeResponse.newly_earned_badges.length > 0) {
        badgeResponse.newly_earned_badges.forEach((badge: any) => {
          const badgeIcon = getBadgeIcon(badge.icon)
          addToast(`${badgeIcon} Achievement Unlocked: ${badge.name}!`, 'success')
        })
      }
    } catch (err) {
      console.error('Error marking lesson complete:', err)
      progressMarkedRef.current = false
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <Navigation currentPage="lesson" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <VideoPlayerSkeleton />
          <div className="mt-8">
            <CommentListSkeleton count={3} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Lesson</h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => router.push(`/courses/${params.slug}`)}
            className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  if (!lesson) return null

  const isLocked = lesson.is_locked

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <Navigation currentPage="lesson" />

      {/* Lesson Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/courses/${params.slug}`}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-6 inline-block"
        >
          ← Back to Course
        </Link>

        {/* Resume notification */}
        {savedWatchTime > 5 && !hasResumed && !isLocked && lesson.mux_playback_id && (
          <div className="mb-4 p-3 bg-purple/10 dark:bg-purple/20 border border-purple dark:border-purple rounded-lg flex items-center justify-between">
            <button
              onClick={() => {
                if (playerRef.current) {
                  playerRef.current.currentTime = savedWatchTime
                  playerRef.current.play()
                }
                setHasResumed(true)
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <svg className="w-5 h-5 text-purple dark:text-purple" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                Resume from {Math.floor(savedWatchTime / 60)}:{String(Math.floor(savedWatchTime % 60)).padStart(2, '0')}
              </span>
            </button>
            <button
              onClick={() => {
                if (playerRef.current) {
                  playerRef.current.currentTime = 0
                  playerRef.current.play()
                }
                setSavedWatchTime(0)
                setHasResumed(true)
              }}
              className="text-xs text-gold dark:text-gold hover:text-gold-dark dark:hover:text-gold/80 font-semibold"
            >
              Start from beginning
            </button>
          </div>
        )}

        {/* Video Player or Locked Message */}
        <div className="bg-black rounded-lg overflow-hidden mb-8" style={{ aspectRatio: '16/9' }}>
          {isLocked ? (
            <div className="h-full flex flex-col items-center justify-center text-white bg-gray-900 px-6">
              <svg className="w-16 h-16 mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <h3 className="text-2xl mb-2">This lesson is locked</h3>
              {lesson.unlock_date ? (
                <p className="text-gray-400 mb-6 text-center">
                  This lesson will unlock on{' '}
                  <span className="font-semibold text-yellow-400">
                    {new Date(lesson.unlock_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {' at '}
                    {new Date(lesson.unlock_date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </span>
                </p>
              ) : (
                <p className="text-gray-400 mb-6">Subscribe to access this content</p>
              )}
              {!lesson.unlock_date && (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="px-6 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {subscribing ? 'Redirecting...' : 'Subscribe Now'}
                </button>
              )}
            </div>
          ) : lesson.mux_playback_id ? (
            <MuxPlayer
              ref={playerRef}
              playbackId={lesson.mux_playback_id}
              streamType="on-demand"
              autoPlay={false}
              preload="auto"
              preferPlayback="mse"
              startTime={0.01}
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
        <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow-md p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {lesson.is_free_preview && (
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-semibold rounded">
                    FREE PREVIEW
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-semibold rounded">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    COMPLETED
                  </span>
                )}
              </div>
              <h1 className="text-3xl mb-2">
                {lesson.title}
              </h1>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {lesson.duration_minutes} minutes
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {lesson.description}
            </p>
          </div>

          {/* Additional lesson content could go here */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">About this lesson</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{lesson.duration_minutes} minutes</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Access:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                  {lesson.is_free_preview ? 'Free Preview' : 'Subscription Required'}
                </span>
              </div>
            </div>
          </div>

          {/* Next Lesson Button */}
          {nextLesson && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <Link
                href={`/courses/${params.slug}/lessons/${nextLesson.id}`}
                className="flex items-center justify-between p-6 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg border-2 border-primary-200 dark:border-primary-800 transition-colors group"
              >
                <div className="flex-1">
                  <p className="text-sm text-primary-600 dark:text-primary-400 font-semibold mb-1">UP NEXT</p>
                  <h3 className="text-lg mb-1">{nextLesson.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{nextLesson.duration_minutes} minutes</p>
                </div>
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
                  <span className="font-semibold">Continue</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          )}

          {/* Comments Section */}
          {!isLocked && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <Comments lessonId={lesson.id} playerRef={playerRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

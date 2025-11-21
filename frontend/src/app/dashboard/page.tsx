'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { subscriptionAPI, stripeAPI, Subscription, progressAPI, CourseProgress, RecentlyWatched, badgeAPI, BadgeProgress, referralAPI, ReferralStats } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardSkeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import Navigation from '@/components/Navigation'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([])
  const [recentlyWatched, setRecentlyWatched] = useState<RecentlyWatched[]>([])
  const [badges, setBadges] = useState<BadgeProgress[]>([])
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirectingToPortal, setRedirectingToPortal] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      try {
        setLoading(true)
        // Load critical above-the-fold data first
        const [subscriptionsData, progressData, recentlyWatchedData] = await Promise.allSettled([
          subscriptionAPI.getMySubscriptions(),
          progressAPI.getCourseProgress(),
          progressAPI.getRecentlyWatched(),
        ])

        if (subscriptionsData.status === 'fulfilled') {
          setSubscriptions(subscriptionsData.value)
        }

        if (progressData.status === 'fulfilled') {
          setCourseProgress(progressData.value)
        }

        if (recentlyWatchedData.status === 'fulfilled') {
          setRecentlyWatched(recentlyWatchedData.value)
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

  // Lazy load below-the-fold data (badges and referral stats)
  useEffect(() => {
    if (!user || authLoading || loading) return

    const fetchSecondaryData = async () => {
      const [badgesData, referralData] = await Promise.allSettled([
        badgeAPI.getMyBadges(),
        referralAPI.getStats(),
      ])

      if (badgesData.status === 'fulfilled') {
        setBadges(badgesData.value)
      }

      if (referralData.status === 'fulfilled') {
        setReferralStats(referralData.value)
      }
    }

    fetchSecondaryData()
  }, [user, authLoading, loading])

  const handleManageBilling = async () => {
    try {
      setRedirectingToPortal(true)
      const { url } = await stripeAPI.createPortalSession()
      window.location.href = url
    } catch (err: any) {
      console.error('Error creating portal session:', err)
      addToast('Failed to open billing portal. Please try again.', 'error')
      setRedirectingToPortal(false)
    }
  }

  const handleCopyLink = async () => {
    if (!referralStats) return
    try {
      await navigator.clipboard.writeText(referralStats.referral_link)
      setCopiedCode(true)
      addToast('Referral link copied to clipboard!', 'success')
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      addToast('Failed to copy link', 'error')
    }
  }

  const handleShare = (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    if (!referralStats) return

    const message = `Join Dieselnoi's Muay Thai training platform and get 20% off your first month! ${referralStats.referral_link}`
    const encodedMessage = encodeURIComponent(message)
    const encodedUrl = encodeURIComponent(referralStats.referral_link)

    let shareUrl = ''

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedMessage}`
        break
    }

    window.open(shareUrl, '_blank', 'width=600,height=400')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <Navigation currentPage="dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  const activeSubscriptions = subscriptions.filter(sub => sub.is_active)

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <Navigation currentPage="dashboard" />

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">My Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your subscriptions and training progress</p>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-card dark:shadow-card mb-8 dark:border dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl">Active Subscriptions</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {activeSubscriptions.length} active {activeSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard/profile"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
                >
                  Profile Settings
                </Link>
                <Link
                  href="/dashboard/security"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
                >
                  Security Settings
                </Link>
                {activeSubscriptions.length > 0 && (
                  <button
                    onClick={handleManageBilling}
                    disabled={redirectingToPortal}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {redirectingToPortal ? 'Opening...' : 'Manage Billing'}
                  </button>
                )}
              </div>
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
                      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-600 dark:hover:border-primary-500 hover:shadow-card-hover transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">
                              {subscription.course_title}
                            </h3>
                            {progress && progress.completion_percentage === 100 && (
                              <svg className="w-5 h-5 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-semibold">
                              {subscription.status.toUpperCase()}
                            </span>
                            <span>
                              Started {new Date(subscription.start_date).toLocaleDateString()}
                            </span>
                          </div>
                          {progress && (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {progress.completed_lessons} of {progress.total_lessons} lessons completed
                                </span>
                                <span className="font-semibold text-gold dark:text-gold">
                                  {progress.completion_percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-gold dark:bg-gold h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress.completion_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Start your Muay Thai journey today!</p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-primary-600 dark:bg-dark-button text-white font-semibold rounded-lg hover:bg-primary-700 dark:hover:opacity-90 transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Continue Watching */}
        {recentlyWatched.length > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-card dark:shadow-card mb-8 dark:border dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl">Continue Watching</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Pick up where you left off</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentlyWatched.slice(0, 4).map((item) => {
                  const progressPercent = item.duration_minutes > 0
                    ? Math.round((item.watch_time_seconds / (item.duration_minutes * 60)) * 100)
                    : 0

                  return (
                    <Link
                      key={item.lesson_id}
                      href={`/courses/${item.course_slug}/lessons/${item.lesson_id}`}
                      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-600 dark:hover:border-primary-500 hover:shadow-card-hover transition-all"
                    >
                      <div className="flex gap-4">
                        {/* Video thumbnail */}
                        <div className="relative flex-shrink-0 w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                          {item.mux_playback_id ? (
                            <Image
                              src={`https://image.mux.com/${item.mux_playback_id}/thumbnail.jpg?width=256&height=160&fit_mode=smartcrop&time=2`}
                              alt={item.lesson_title}
                              fill
                              className="object-cover"
                              sizes="128px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Lesson info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{item.course_title}</div>
                          <h3 className="text-sm font-semibold mb-1 truncate">
                            Lesson {item.lesson_order}: {item.lesson_title}
                          </h3>

                          {/* Progress bar */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">
                                {item.is_completed ? 'Completed' : `${progressPercent}% watched`}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">{item.duration_minutes} min</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  item.is_completed ? 'bg-green-600 dark:bg-green-500' : 'bg-primary-600 dark:bg-primary-500'
                                }`}
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Resume button */}
                          <div className="flex items-center text-xs text-primary-600 dark:text-primary-400 font-semibold">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                            {item.is_completed ? 'Watch Again' : 'Resume'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Achievements */}
        {badges.length > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-card dark:shadow-card mb-8 dark:border dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl">Achievements</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {badges.filter(b => b.earned).length} of {badges.length} badges earned
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-4 border rounded-lg transition-all ${
                      badge.earned
                        ? 'border-gold dark:border-gold bg-gold/10 dark:bg-gold/20'
                        : 'border-gray-200 dark:border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Badge icon */}
                      <div className={`flex-shrink-0 text-4xl ${badge.earned ? '' : 'grayscale'}`}>
                        {badge.icon === 'gi-white-belt' && '🥋'}
                        {badge.icon === 'books' && '📚'}
                        {badge.icon === 'muscle' && '💪'}
                        {badge.icon === 'trophy' && '🏆'}
                        {badge.icon === 'star' && '⭐'}
                        {badge.icon === 'chat' && '💬'}
                        {badge.icon === 'chat-dots' && '🗣️'}
                        {badge.icon === 'check-circle' && '✅'}
                        {badge.icon === 'megaphone' && '📣'}
                      </div>

                      {/* Badge details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">
                          {badge.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                          {badge.description}
                        </p>

                        {badge.earned ? (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Earned {badge.earned_at && new Date(badge.earned_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">
                                {badge.progress.current} / {badge.progress.target}
                              </span>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {badge.progress.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-primary-600 dark:bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${badge.progress.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Inactive Subscriptions */}
        {subscriptions.filter(sub => !sub.is_active).length > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-card dark:shadow-card mb-8 dark:border dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl">Past Subscriptions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {subscriptions.filter(sub => !sub.is_active).map((subscription) => (
                  <div
                    key={subscription.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">
                          {subscription.course_title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="inline-flex items-center px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold">
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
                        className="px-4 py-2 bg-primary-600 dark:bg-dark-button text-white text-sm font-semibold rounded hover:bg-primary-700 dark:hover:opacity-90 transition-colors"
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

        {/* Referral Program */}
        {referralStats && (
          <div className="bg-gradient-to-br from-purple-50 to-gold/10 dark:from-dark-bg dark:to-dark-bg rounded-lg shadow mb-8 overflow-hidden border border-purple/30 dark:border-gray-700">
            <div className="p-6 border-b border-purple/30 dark:border-gray-700 bg-white/50 dark:bg-transparent">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎁</div>
                <div>
                  <h2 className="text-xl">Referral Program</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Earn $10 credit for every friend who subscribes
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Referral Link */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Your Referral Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralStats.referral_link}
                    className="flex-1 px-4 py-2 bg-white dark:bg-purple/10 border border-gray-300 dark:border-purple/40 rounded-lg text-gray-900 dark:text-gray-100 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-primary-600 dark:bg-dark-button text-white font-semibold rounded-lg hover:bg-primary-700 dark:hover:opacity-90 transition-colors flex items-center gap-2"
                  >
                    {copiedCode ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Your referral code: <span className="font-mono font-bold text-purple dark:text-gold">{referralStats.code}</span>
                </p>
              </div>

              {/* Social Sharing */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Share on Social Media
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="flex-1 px-4 py-2 bg-purple hover:bg-purple-700 dark:bg-dark-button dark:hover:opacity-90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                    Twitter
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="flex-1 px-4 py-2 bg-purple hover:bg-purple-700 dark:bg-dark-button dark:hover:opacity-90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="flex-1 px-4 py-2 bg-purple hover:bg-purple-700 dark:bg-dark-button dark:hover:opacity-90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-purple/10 rounded-lg p-4 text-center border border-gray-200 dark:border-purple/40">
                  <div className="text-2xl font-bold text-purple dark:text-purple-400">{referralStats.clicks}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Clicks</div>
                </div>
                <div className="bg-white dark:bg-purple/10 rounded-lg p-4 text-center border border-gray-200 dark:border-purple/40">
                  <div className="text-2xl font-bold text-purple dark:text-purple-400">{referralStats.signups}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Signups</div>
                </div>
                <div className="bg-white dark:bg-purple/10 rounded-lg p-4 text-center border border-gray-200 dark:border-purple/40">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{referralStats.conversions}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Conversions</div>
                </div>
                <div className="bg-white dark:bg-purple/10 rounded-lg p-4 text-center border border-gray-200 dark:border-purple/40">
                  <div className="text-2xl font-bold text-gold dark:text-gold">${Number(referralStats.credits_available || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Available Credit</div>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-white dark:bg-purple/10 rounded-lg p-4 border border-gray-200 dark:border-purple/40">
                <h3 className="text-sm font-semibold mb-3">How It Works</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-dark-heading font-bold">1.</span>
                    <span>Share your referral link with friends</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-dark-heading font-bold">2.</span>
                    <span>They get 20% off their first month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-dark-heading font-bold">3.</span>
                    <span>You earn $10 credit when they subscribe</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary-600 dark:text-dark-heading font-bold">4.</span>
                    <span>Credits automatically apply to your next payment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/"
            className="p-6 bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-primary-600 dark:text-dark-heading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">Browse Courses</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Explore all available training programs</p>
          </Link>

          {activeSubscriptions.length > 0 && (
            <button
              onClick={handleManageBilling}
              disabled={redirectingToPortal}
              className="p-6 bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow text-left disabled:opacity-50"
            >
              <div className="flex items-center mb-3">
                <svg className="w-8 h-8 text-primary-600 dark:text-dark-heading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Billing & Payments</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Update payment method or view invoices</p>
            </button>
          )}

          <div className="p-6 bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow">
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-primary-600 dark:text-dark-heading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">Training Progress</h3>
            {courseProgress.length > 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="mb-2">
                  {courseProgress.reduce((sum, p) => sum + p.completed_lessons, 0)} total lessons completed
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Average: {Math.round(courseProgress.reduce((sum, p) => sum + p.completion_percentage, 0) / courseProgress.length)}% complete
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">Start watching lessons to track your progress</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

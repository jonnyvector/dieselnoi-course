'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsAPI, type AnalyticsOverview, type CourseAnalytics, type EngagementMetrics, type UserGrowthMetrics } from '@/lib/api'
import Navigation from '@/components/Navigation'
import dynamic from 'next/dynamic'

// Metric tooltips
const METRIC_TOOLTIPS = {
  active_subs: 'Users with active or trialing subscription status',
  completion: 'Percentage of active subscribers who completed all lessons',
  avg_progress: 'Average lesson completion percentage across active subscribers',
  watch_time: 'Total hours watched by active subscribers / Average hours per subscriber',
  mrr: 'Monthly Recurring Revenue (active subscribers × course price)',
}

// Dynamically import recharts to improve initial page load
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

export default function AdminAnalyticsPage() {
  const { user, loading: isLoading } = useAuth()
  const router = useRouter()
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [courses, setCourses] = useState<CourseAnalytics[]>([])
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null)
  const [userGrowth, setUserGrowth] = useState<UserGrowthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<keyof CourseAnalytics>('active_subscribers')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (!isLoading && !user?.is_staff) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.is_staff) {
      fetchAnalytics()
    }
  }, [user])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [overviewData, coursesData, engagementData, userGrowthData] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getCourses(),
        analyticsAPI.getEngagement(),
        analyticsAPI.getUserGrowth(),
      ])
      setOverview(overviewData)
      setCourses(coursesData.courses)
      setEngagement(engagementData)
      setUserGrowth(userGrowthData)
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err)
      setError(err.userMessage || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof CourseAnalytics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedCourses = [...courses].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    const multiplier = sortDirection === 'asc' ? 1 : -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * multiplier
    }
    return String(aValue).localeCompare(String(bValue)) * multiplier
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getCompletionColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600 dark:text-green-400'
    if (rate >= 30) return 'text-gold dark:text-gold'
    return 'text-red-600 dark:text-red-400'
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!user?.is_staff) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-dark-button dark:hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Navigation currentPage="admin" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl mb-8">
          Analytics Dashboard
        </h1>

        {/* Overview Stats */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={overview.total_users}
              icon="👥"
              trend={overview.growth_metrics.users_growth_7d}
              trendLabel="from last week"
            />
            <StatCard
              title="Active Subscriptions"
              value={overview.active_subscriptions}
              icon="✅"
              trend={overview.growth_metrics.subs_growth_7d}
              trendLabel="from last week"
            />
            <StatCard
              title="Published Courses"
              value={overview.published_courses}
              subtitle={`${overview.total_courses} total`}
              icon="📚"
            />
            <StatCard
              title="Avg Completion Rate"
              value={`${overview.avg_completion_rate}%`}
              subtitle="across all courses"
              icon="🎯"
            />
          </div>
        )}

        {/* Secondary Stats */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Watch Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.total_watch_time_hours.toLocaleString()}h
              </p>
            </div>
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600 dark:text-gray-300">Comments (30d)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.comments_last_30_days.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600 dark:text-gray-300">New Users (7d)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.new_users_last_7_days}
              </p>
            </div>
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600 dark:text-gray-300">Est. MRR</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(overview.estimated_mrr)}
              </p>
            </div>
          </div>
        )}

        {/* Course Performance Table */}
        <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl">
              Course Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('title')}>
                    Course {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('active_subscribers')}>
                    <MetricTooltip text={METRIC_TOOLTIPS.active_subs}>
                      <span>Active Subs {sortField === 'active_subscribers' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                    </MetricTooltip>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('completion_rate')}>
                    <MetricTooltip text={METRIC_TOOLTIPS.completion}>
                      <span>Completion {sortField === 'completion_rate' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                    </MetricTooltip>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('avg_progress')}>
                    <MetricTooltip text={METRIC_TOOLTIPS.avg_progress}>
                      <span>Avg Progress {sortField === 'avg_progress' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                    </MetricTooltip>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('total_watch_time_hours')}>
                    <MetricTooltip text={METRIC_TOOLTIPS.watch_time}>
                      <span>Watch Time {sortField === 'total_watch_time_hours' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                    </MetricTooltip>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('monthly_revenue')}>
                    <MetricTooltip text={METRIC_TOOLTIPS.mrr}>
                      <span>MRR {sortField === 'monthly_revenue' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                    </MetricTooltip>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-bg divide-y divide-gray-200 dark:divide-gray-700">
                {sortedCourses.map((course) => (
                  <tr
                    key={course.course_slug}
                    className="hover:bg-gray-50 dark:hover:opacity-90 cursor-pointer"
                    onClick={() => router.push(`/admin/analytics/courses/${course.course_slug}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {course.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {course.lesson_count} lessons
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {course.active_subscribers}
                      <span className="text-gray-500 dark:text-gray-300 text-xs ml-1">
                        / {course.total_enrollments} total
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getCompletionColor(course.completion_rate)}`}>
                        {course.completion_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {course.avg_progress}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {course.total_watch_time_hours}h
                      <span className="text-gray-500 dark:text-gray-300 text-xs ml-1 block">
                        {course.avg_watch_time_per_user}h/user
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(course.monthly_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Growth Charts */}
        {userGrowth && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Daily Signups Chart */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow p-6">
              <h3 className="text-lg mb-4">
                Daily Signups (Last 30 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userGrowth.daily_signups}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="dark:fill-gray-400"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="dark:fill-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, white)',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                  <Bar dataKey="count" fill="#D6B84A" name="Signups" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Active Users Trend Chart */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow p-6">
              <h3 className="text-lg mb-4">
                Active Subscribers Trend (Last 30 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowth.active_users_trend}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="dark:fill-gray-400"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="dark:fill-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, white)',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                  <Line type="monotone" dataKey="count" stroke="#5f4891" strokeWidth={2} name="Active Subscribers" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Retention Rate</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {userGrowth.retention_rate !== null ? `${userGrowth.retention_rate}%` : 'N/A'}
                  </p>
                  {userGrowth.retention_rate === null && (
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Need 30+ days of data</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Churn Rate</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    {userGrowth.churn_rate !== null ? `${userGrowth.churn_rate}%` : 'N/A'}
                  </p>
                  {userGrowth.churn_rate === null && (
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Need 30+ days of data</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Insights */}
        {engagement && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Lessons by Watch Time */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg">
                  Top Lessons by Watch Time
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {engagement.top_lessons_by_watch_time.slice(0, 5).map((lesson, idx) => (
                    <div key={lesson.lesson_id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                            #{idx + 1}
                          </span>
                          <div className="ml-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {lesson.lesson_title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {lesson.course_title}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {lesson.total_watch_time_hours}h
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lesson.unique_watchers} viewers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Lessons by Comments */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg">
                  Most Commented Lessons
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {engagement.top_lessons_by_comments.slice(0, 5).map((lesson, idx) => (
                    <div key={lesson.lesson_id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                            #{idx + 1}
                          </span>
                          <div className="ml-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {lesson.lesson_title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {lesson.course_title}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {lesson.comment_count} comments
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lesson.unique_commenters} users
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Highest Completion Lessons */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg">
                  Highest Completion Rates
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {engagement.highest_completion_lessons.slice(0, 5).map((lesson, idx) => (
                    <div key={lesson.lesson_id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                            #{idx + 1}
                          </span>
                          <div className="ml-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {lesson.lesson_title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {lesson.course_title}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          {lesson.completion_rate}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lesson.watch_count} views
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Highest Dropout Lessons */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg">
                  Highest Drop-off Rates
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {engagement.highest_dropout_lessons.slice(0, 5).map((lesson, idx) => (
                    <div key={lesson.lesson_id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                            #{idx + 1}
                          </span>
                          <div className="ml-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {lesson.lesson_title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {lesson.course_title}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          {lesson.dropout_rate}% dropout
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lesson.watch_count} views
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: number
  trendLabel?: string
}

function StatCard({ title, value, subtitle, icon, trend, trendLabel }: StatCardProps) {
  const trendColor = trend && trend > 0 ? 'text-green-600 dark:text-green-400' : trend && trend < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
  const trendIcon = trend && trend > 0 ? '↗' : trend && trend < 0 ? '↘' : ''

  return (
    <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{subtitle}</p>
        )}
        {trend !== undefined && trendLabel && (
          <p className={`text-sm mt-1 ${trendColor}`}>
            {trendIcon} {Math.abs(trend)}% {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}

interface MetricTooltipProps {
  text: string
  children: React.ReactNode
}

function MetricTooltip({ text, children }: MetricTooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1"
      >
        {children}
        <span className="text-gray-400 dark:text-gray-500 cursor-help">ⓘ</span>
      </div>
      {show && (
        <div className="absolute z-10 w-64 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg -top-2 left-full ml-2">
          {text}
          <div className="absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45 -left-1 top-3"></div>
        </div>
      )}
    </div>
  )
}

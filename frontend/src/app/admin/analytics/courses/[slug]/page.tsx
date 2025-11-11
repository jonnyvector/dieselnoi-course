'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsAPI, type CourseDetailAnalytics } from '@/lib/api'
import Navigation from '@/components/Navigation'
import dynamic from 'next/dynamic'

// Dynamically import recharts
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

interface PageProps {
  params: {
    slug: string
  }
}

export default function CourseAnalyticsDetailPage({ params }: PageProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<CourseDetailAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lessonSortField, setLessonSortField] = useState<string>('order')
  const [lessonSortDirection, setLessonSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (!authLoading) {
      if (!user?.is_staff) {
        router.push('/dashboard')
      } else if (params.slug) {
        fetchData()
      }
    }
  }, [user, authLoading, router, params.slug])

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await analyticsAPI.getCourseDetail(params.slug)
      setData(result)
    } catch (err: any) {
      console.error('Failed to fetch course analytics:', err)
      setError(err.userMessage || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleLessonSort = (field: string) => {
    if (lessonSortField === field) {
      setLessonSortDirection(lessonSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setLessonSortField(field)
      setLessonSortDirection('desc')
    }
  }

  const sortedLessons = data?.lessons ? [...data.lessons].sort((a, b) => {
    const aValue = a[lessonSortField as keyof typeof a]
    const bValue = b[lessonSortField as keyof typeof b]
    const multiplier = lessonSortDirection === 'asc' ? 1 : -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * multiplier
    }
    return String(aValue).localeCompare(String(bValue)) * multiplier
  }) : []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading course analytics...</p>
        </div>
      </div>
    )
  }

  if (!user?.is_staff) {
    return null
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Course not found'}</p>
          <button
            onClick={() => router.push('/admin/analytics')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-dark-button dark:hover:opacity-90"
          >
            Back to Analytics
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Navigation currentPage="admin" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/analytics')}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            ← Back to Analytics
          </button>
          <h1 className="text-3xl text-gray-900 dark:text-dark-heading">
            {data.course.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {data.course.difficulty} • ${data.course.price}/month • {data.course.lesson_count} lessons • {data.course.total_duration_minutes} min
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Subscribers"
            value={data.subscribers.active}
            subtitle={`${data.subscribers.total_all_time} all-time`}
            trend={data.subscribers.new_7d}
            trendLabel="new in 7d"
            icon="👥"
          />
          <MetricCard
            title="MRR"
            value={formatCurrency(data.revenue.mrr)}
            subtitle={`${formatCurrency(data.revenue.arpu)} ARPU`}
            icon="💰"
          />
          <MetricCard
            title="Completion Rate"
            value={`${data.engagement.completion_rate}%`}
            subtitle={`${data.engagement.avg_progress}% avg progress`}
            icon="🎯"
          />
          <MetricCard
            title="Watch Time"
            value={`${data.engagement.total_watch_time_hours}h`}
            subtitle={`${data.engagement.avg_watch_time_per_user}h/user`}
            icon="⏱️"
          />
        </div>

        {/* Subscriber & Revenue Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Subscriber Trend */}
          <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow p-6">
            <h2 className="text-xl text-gray-900 dark:text-dark-heading mb-4">
              Active Subscribers (Last 30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.subscribers.trend}>
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
                />
                <Line type="monotone" dataKey="active_count" stroke="#dc2626" strokeWidth={2} name="Active Subscribers" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">New (7d)</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">+{data.subscribers.new_7d}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">New (30d)</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">+{data.subscribers.new_30d}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Cancelled (30d)</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{data.subscribers.cancelled_30d}</p>
              </div>
            </div>
          </div>

          {/* Revenue Trend */}
          <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow p-6">
            <h2 className="text-xl text-gray-900 dark:text-dark-heading mb-4">
              MRR Trend (Last 30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.revenue.trend}>
                <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  className="dark:fill-gray-400"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="dark:fill-gray-400"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, white)',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  formatter={(value: any) => [`$${value}`, 'MRR']}
                />
                <Line type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2} name="MRR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lesson Performance Table */}
        <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl text-gray-900 dark:text-dark-heading">
              Lesson Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleLessonSort('order')}
                  >
                    # {lessonSortField === 'order' && (lessonSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleLessonSort('title')}
                  >
                    Lesson {lessonSortField === 'title' && (lessonSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleLessonSort('unique_viewers')}
                  >
                    Viewers {lessonSortField === 'unique_viewers' && (lessonSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleLessonSort('total_watch_time_hours')}
                  >
                    Watch Time {lessonSortField === 'total_watch_time_hours' && (lessonSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleLessonSort('completion_rate')}
                  >
                    Completion {lessonSortField === 'completion_rate' && (lessonSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleLessonSort('dropout_rate')}
                  >
                    Drop-off {lessonSortField === 'dropout_rate' && (lessonSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleLessonSort('comment_count')}
                  >
                    Comments {lessonSortField === 'comment_count' && (lessonSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-bg divide-y divide-gray-200 dark:divide-gray-700">
                {sortedLessons.map((lesson) => (
                  <tr key={lesson.lesson_id} className="hover:bg-gray-50 dark:hover:opacity-90">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {lesson.order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {lesson.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {lesson.duration_minutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {lesson.unique_viewers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {lesson.total_watch_time_hours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        lesson.completion_rate >= 70 ? 'text-green-600 dark:text-green-400' :
                        lesson.completion_rate >= 30 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {lesson.completion_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        lesson.dropout_rate >= 50 ? 'text-red-600 dark:text-red-400' :
                        lesson.dropout_rate >= 30 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {lesson.dropout_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {lesson.comment_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent User Activity */}
        <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl text-gray-900 dark:text-dark-heading">
              Recent User Activity
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Showing {data.recent_activity.length} most recently active subscribers
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Watch Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Watched
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-bg divide-y divide-gray-200 dark:divide-gray-700">
                {data.recent_activity.map((activity) => (
                  <tr key={activity.user_id} className="hover:bg-gray-50 dark:hover:opacity-90">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.username}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full max-w-xs">
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                            <span>{activity.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-red-600 h-2 rounded-full"
                              style={{ width: `${activity.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {activity.total_watch_time_hours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activity.subscription_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        activity.subscription_status === 'trialing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {activity.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(activity.last_watched_at)}
                      </div>
                      {activity.last_lesson_watched && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.last_lesson_watched}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: number
  trendLabel?: string
}

function MetricCard({ title, value, subtitle, icon, trend, trendLabel }: MetricCardProps) {
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
          <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
            {trend > 0 && '+'}{trend} {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}

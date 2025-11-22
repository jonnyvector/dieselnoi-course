import axios from 'axios'

// Dynamically determine API URL based on how the app is accessed
const getApiUrl = () => {
  // Use environment variable if set (production)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL}/api`
  }

  // Fallback for local development
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const port = hostname === 'localhost' || hostname === '127.0.0.1' ? '8000' : '8000'
  const apiUrl = `http://${hostname}:${port}/api`
  return apiUrl
}

const API_URL = getApiUrl()

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for session authentication
})

// CSRF token management
let csrfToken: string | null = null

// Function to clear cached CSRF token (call after login/register)
export const clearCSRFToken = () => {
  csrfToken = null
}

// Function to get CSRF token
export const getCSRFToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken

  try {
    const response = await api.get('/auth/csrf/')
    csrfToken = response.data.csrfToken
    if (!csrfToken) {
      throw new Error('CSRF token not returned from server')
    }
    return csrfToken
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error)
    throw error
  }
}

// Add request interceptor to include CSRF token in non-GET requests
api.interceptors.request.use(
  async (config) => {
    // Only add CSRF token for non-GET requests
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const token = await getCSRFToken()
      if (token) {
        config.headers['X-CSRFToken'] = token
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle CSRF token expiry and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle CSRF token expiry
    if (error.response?.status === 403 && error.response?.data?.detail?.includes('CSRF')) {
      csrfToken = null
      const config = error.config
      const token = await getCSRFToken()
      config.headers['X-CSRFToken'] = token
      return api.request(config)
    }

    // Enhanced error handling with better messages
    const status = error.response?.status
    const errorData = error.response?.data

    // Create a user-friendly error object
    const enhancedError = {
      ...error,
      userMessage: getUserFriendlyErrorMessage(status, errorData),
      statusCode: status,
      originalError: error
    }

    return Promise.reject(enhancedError)
  }
)

// Helper function to generate user-friendly error messages
function getUserFriendlyErrorMessage(status: number | undefined, errorData: any): string {
  // Handle specific status codes
  switch (status) {
    case 400:
      if (errorData?.error) return errorData.error
      if (errorData?.detail) return errorData.detail
      return 'Invalid request. Please check your input and try again.'

    case 401:
      return 'Please log in to continue.'

    case 403:
      return 'You don\'t have permission to access this resource.'

    case 404:
      return 'The requested resource was not found.'

    case 429:
      if (errorData?.error) return errorData.error
      return 'Too many requests. Please slow down and try again later.'

    case 500:
      return 'Server error. Please try again later.'

    case 503:
      return 'Service temporarily unavailable. Please try again later.'

    default:
      // Check for specific error messages in response
      if (errorData?.error) return errorData.error
      if (errorData?.detail) return errorData.detail
      if (errorData?.message) return errorData.message

      // Network errors
      if (!status) return 'Network error. Please check your internet connection.'

      return 'An unexpected error occurred. Please try again.'
  }
}

// Types
export interface CourseReview {
  id: number
  rating: number
  review_text: string
  user_name: string
  created_at: string
  updated_at: string
  is_edited: boolean
  is_featured: boolean
  can_edit: boolean
}

export interface CourseResource {
  id: number
  title: string
  description: string
  download_url: string | null
  file_size_display: string
  uploaded_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  image?: string
  order: number
  parent?: number
  course_count: number
  children: Category[]
}

export interface CategoryMinimal {
  id: number
  name: string
  slug: string
  icon: string
}

export interface Course {
  id: number
  title: string
  description: string
  slug: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  price: string
  thumbnail_url?: string
  lesson_count: number
  categories: CategoryMinimal[]
  is_featured: boolean
  is_coming_soon: boolean
  release_date?: string
  is_free: boolean
  enrollment_count: number
  average_rating?: string | number
  total_reviews?: number
  is_subscribed?: boolean
  user_progress?: number | null
  is_notified?: boolean
  created_at: string
}

export interface VideoChapter {
  id: number
  title: string
  timestamp_seconds: number
  formatted_timestamp: string
  description: string
}

export interface Lesson {
  id: number
  title: string
  description: string
  video_url: string | null
  mux_playback_id: string | null
  playback_token: string | null
  duration_minutes: number
  order: number
  is_free_preview: boolean
  unlock_date: string | null
  is_locked: boolean
  chapters: VideoChapter[]
  created_at: string
}

export interface CourseDetail extends Course {
  lessons: Lesson[]
  resources: CourseResource[]
  average_rating?: string | number
  total_reviews?: number
  user_review?: CourseReview | null
}

export interface Subscription {
  id: number
  user_email: string
  course_title: string
  course_slug: string
  status: 'active' | 'past_due' | 'cancelled' | 'trialing'
  is_active: boolean
  start_date: string
  end_date?: string
  created_at: string
}

export interface LessonProgress {
  id: number
  lesson: number
  lesson_title: string
  course_title: string
  course_slug: string
  is_completed: boolean
  completed_at: string | null
  last_watched_at: string
  watch_time_seconds: number
  last_position_seconds: number
  created_at: string
}

export interface CourseProgress {
  course_id: number
  course_title: string
  course_slug: string
  total_lessons: number
  completed_lessons: number
  completion_percentage: number
  last_watched_at: string | null
}

export interface CourseDetailProgress {
  course_id: number
  course_title: string
  course_slug: string
  total_lessons: number
  completed_lessons: number
  completion_percentage: number
  lessons: {
    lesson_id: number
    lesson_title: string
    lesson_order: number
    is_completed: boolean
    completed_at: string | null
    last_watched_at: string | null
    watch_time_seconds: number
  }[]
}

export interface Comment {
  id: number
  user_id: number
  username: string
  lesson: number
  content: string
  parent: number | null
  timestamp_seconds: number | null
  is_edited: boolean
  reply_count: number
  replies: Comment[]
  created_at: string
  updated_at: string
}

export interface CreateCommentData {
  lesson: number
  content: string
  parent?: number
  timestamp_seconds?: number
}

export interface RecentlyWatched {
  lesson_id: number
  lesson_title: string
  lesson_order: number
  course_id: number
  course_title: string
  course_slug: string
  is_completed: boolean
  watch_time_seconds: number
  last_watched_at: string
  duration_minutes: number
  mux_playback_id: string | null
}

// Analytics types
export interface AnalyticsOverview {
  total_users: number
  active_subscriptions: number
  total_courses: number
  published_courses: number
  avg_completion_rate: number
  total_watch_time_hours: number
  comments_last_30_days: number
  new_users_last_7_days: number
  new_users_last_30_days: number
  estimated_mrr: number
  growth_metrics: {
    users_growth_7d: number
    subs_growth_7d: number
  }
}

export interface CourseAnalytics {
  course_slug: string
  title: string
  difficulty: string
  price: number
  active_subscribers: number        // Currently active subscribers
  total_enrollments: number          // All-time enrollments
  completion_rate: number
  avg_progress: number
  total_watch_time_hours: number
  avg_watch_time_per_user: number   // Average hours per active subscriber
  comment_count: number
  lesson_count: number
  monthly_revenue: number            // MRR for this course
}

export interface LessonAnalytics {
  lesson_id: number
  title: string
  order: number
  duration_minutes: number
  unique_viewers: number
  completion_rate: number
  avg_watch_percentage: number
  total_watch_time_hours: number
  comment_count: number
  dropout_rate: number
}

export interface SubscriberTrendPoint {
  date: string
  active_count: number
}

export interface RevenueTrendPoint {
  date: string
  mrr: number
}

export interface UserActivity {
  user_id: number
  username: string
  email: string  // Masked for privacy
  progress_percentage: number
  total_watch_time_hours: number
  subscription_status: string
  subscription_start_date: string
  last_watched_at: string | null
  last_lesson_watched: string | null
}

export interface CourseDetailAnalytics {
  course: {
    slug: string
    title: string
    difficulty: string
    price: number
    lesson_count: number
    total_duration_minutes: number
  }
  subscribers: {
    active: number
    total_all_time: number
    new_7d: number
    new_30d: number
    cancelled_30d: number
    trend: SubscriberTrendPoint[]
  }
  engagement: {
    total_watch_time_hours: number
    avg_watch_time_per_user: number
    completion_rate: number
    avg_progress: number
    comment_count: number
  }
  revenue: {
    mrr: number
    arpu: number
    trend: RevenueTrendPoint[]
  }
  lessons: LessonAnalytics[]
  recent_activity: UserActivity[]
}

export interface TopLesson {
  lesson_id: number
  lesson_title: string
  course_title: string
  total_watch_time_hours?: number
  unique_watchers?: number
  comment_count?: number
  unique_commenters?: number
  completion_rate?: number
  watch_count?: number
  dropout_rate?: number
}

export interface EngagementMetrics {
  top_lessons_by_watch_time: TopLesson[]
  top_lessons_by_comments: TopLesson[]
  highest_completion_lessons: TopLesson[]
  highest_dropout_lessons: TopLesson[]
}

export interface DailyMetric {
  date: string
  count: number
}

export interface UserGrowthMetrics {
  daily_signups: DailyMetric[]
  active_users_trend: DailyMetric[]
  retention_rate: number | null
  churn_rate: number | null
}

// Badge types
export interface Badge {
  id: number
  name: string
  description: string
  icon: string
  category: string
  requirement_value: number | null
  created_at: string
}

export interface BadgeProgress {
  id: number
  name: string
  description: string
  icon: string
  category: string
  earned: boolean
  earned_at: string | null
  progress: {
    current: number
    target: number
    percentage: number
  }
}

// Course filter params
export interface CourseFilters {
  category?: string
  difficulty?: string
  price?: 'free' | 'paid'
  featured?: boolean
  coming_soon?: boolean
  search?: string
  sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'difficulty'
}

// API functions
export const categoryAPI = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories/')
    return response.data.results || response.data
  },
}

export const courseAPI = {
  // Get all courses with optional filters
  getCourses: async (filters?: CourseFilters): Promise<Course[]> => {
    const params = new URLSearchParams()
    if (filters?.category) params.append('category', filters.category)
    if (filters?.difficulty) params.append('difficulty', filters.difficulty)
    if (filters?.price) params.append('price', filters.price)
    if (filters?.featured) params.append('featured', 'true')
    if (filters?.coming_soon) params.append('coming_soon', 'true')
    if (filters?.search) params.append('search', filters.search)
    if (filters?.sort) params.append('sort', filters.sort)

    const queryString = params.toString()
    const url = queryString ? `/courses/?${queryString}` : '/courses/'
    const response = await api.get(url)
    return response.data.results || response.data
  },

  // Get single course by slug
  getCourse: async (slug: string): Promise<CourseDetail> => {
    const response = await api.get(`/courses/${slug}/`)
    return response.data
  },

  // Get lessons for a course
  getLessons: async (slug: string): Promise<Lesson[]> => {
    const response = await api.get(`/courses/${slug}/lessons/`)
    return response.data
  },

  // Subscribe to notification for coming soon course
  notifyMe: async (courseId: number): Promise<void> => {
    await api.post('/course-notifications/', { course: courseId })
  },

  // Unsubscribe from notification
  unnotifyMe: async (courseId: number): Promise<void> => {
    // First get the notification ID
    const response = await api.get(`/course-notifications/?course=${courseId}`)
    const notifications = response.data.results || response.data
    if (notifications.length > 0) {
      await api.delete(`/course-notifications/${notifications[0].id}/`)
    }
  },
}

export const subscriptionAPI = {
  // Get current user's subscriptions (now returns array)
  getMySubscriptions: async (): Promise<Subscription[]> => {
    const response = await api.get('/subscriptions/me/')
    return response.data
  },
}

export const stripeAPI = {
  // Create a checkout session for subscription
  createCheckoutSession: async (courseSlug?: string): Promise<{ sessionId: string; url: string }> => {
    const response = await api.post('/stripe/create-checkout-session/', {
      course_slug: courseSlug,
    })
    return response.data
  },

  // Create a customer portal session for billing management
  createPortalSession: async (): Promise<{ url: string }> => {
    const response = await api.post('/stripe/create-portal-session/')
    return response.data
  },
}

export const muxAPI = {
  // Create a Mux Direct Upload URL for a lesson
  createUploadUrl: async (lessonId: number): Promise<{ upload_url: string; upload_id: string }> => {
    const response = await api.post('/mux/create-upload/', {
      lesson_id: lessonId,
    })
    return response.data
  },
}

export const progressAPI = {
  // Mark a lesson as complete
  markLessonComplete: async (lessonId: number, watchTimeSeconds?: number): Promise<LessonProgress> => {
    const response = await api.post('/progress/mark_complete/', {
      lesson_id: lessonId,
      watch_time_seconds: watchTimeSeconds || 0,
    })
    return response.data
  },

  // Update watch time for a lesson (without marking complete)
  updateWatchTime: async (lessonId: number, watchTimeSeconds: number, lastPositionSeconds?: number): Promise<LessonProgress> => {
    const response = await api.post('/progress/update_watch_time/', {
      lesson_id: lessonId,
      watch_time_seconds: watchTimeSeconds,
      last_position_seconds: lastPositionSeconds ?? watchTimeSeconds,
    })
    return response.data
  },

  // Get progress summary for all subscribed courses
  getCourseProgress: async (): Promise<CourseProgress[]> => {
    const response = await api.get('/progress/course_progress/')
    return response.data
  },

  // Get detailed progress for a specific course
  getCourseDetailProgress: async (courseSlug: string): Promise<CourseDetailProgress> => {
    const response = await api.get(`/progress/course/${courseSlug}/`)
    return response.data
  },

  // Get all lesson progress for the current user
  getMyProgress: async (): Promise<LessonProgress[]> => {
    const response = await api.get('/progress/')
    return response.data
  },

  // Get recently watched lessons for continue watching
  getRecentlyWatched: async (): Promise<RecentlyWatched[]> => {
    const response = await api.get('/progress/recently_watched/')
    return response.data
  },
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface VideoNote {
  id: number
  lesson: number
  lesson_title: string
  timestamp_seconds: number
  content: string
  created_at: string
  updated_at: string
}

export const videoNoteAPI = {
  getNotes: async (lessonId: number): Promise<VideoNote[]> => {
    const response = await api.get(`/notes/?lesson_id=${lessonId}`)
    // Handle paginated response
    return response.data.results || response.data
  },
  createNote: async (lessonId: number, timestampSeconds: number, content: string): Promise<VideoNote> => {
    const response = await api.post('/notes/', {
      lesson: lessonId,
      timestamp_seconds: timestampSeconds,
      content,
    })
    return response.data
  },
  updateNote: async (noteId: number, content: string): Promise<VideoNote> => {
    const response = await api.patch(`/notes/${noteId}/`, { content })
    return response.data
  },
  deleteNote: async (noteId: number): Promise<void> => {
    await api.delete(`/notes/${noteId}/`)
  },
}

export const commentAPI = {
  // Get comments for a specific lesson (paginated)
  getComments: async (lessonId: number, page: number = 1): Promise<PaginatedResponse<Comment>> => {
    const response = await api.get(`/comments/?lesson_id=${lessonId}&page=${page}`)
    // Handle both paginated and non-paginated responses
    if (response.data.results) {
      return response.data
    } else {
      // Non-paginated response (shouldn't happen but handle it)
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data
      }
    }
  },

  // Create a new comment
  createComment: async (data: CreateCommentData): Promise<Comment> => {
    const response = await api.post('/comments/', data)
    return response.data
  },

  // Update a comment
  updateComment: async (commentId: number, content: string): Promise<Comment> => {
    const response = await api.patch(`/comments/${commentId}/`, { content })
    return response.data
  },

  // Delete a comment
  deleteComment: async (commentId: number): Promise<void> => {
    await api.delete(`/comments/${commentId}/`)
  },
}

export const analyticsAPI = {
  // Get overview stats
  getOverview: async (): Promise<AnalyticsOverview> => {
    const response = await api.get('/admin/analytics/overview/')
    return response.data
  },

  // Get course analytics
  getCourses: async (): Promise<{ courses: CourseAnalytics[] }> => {
    const response = await api.get('/admin/analytics/courses/')
    return response.data
  },

  // Get course detail analytics
  getCourseDetail: async (courseSlug: string): Promise<CourseDetailAnalytics> => {
    const response = await api.get(`/admin/analytics/courses/${courseSlug}/`)
    return response.data
  },

  // Get engagement metrics
  getEngagement: async (): Promise<EngagementMetrics> => {
    const response = await api.get('/admin/analytics/engagement/')
    return response.data
  },

  // Get user growth metrics
  getUserGrowth: async (): Promise<UserGrowthMetrics> => {
    const response = await api.get('/admin/analytics/user-growth/')
    return response.data
  },
}

export const badgeAPI = {
  // Get all badges
  getAllBadges: async (): Promise<Badge[]> => {
    const response = await api.get('/badges/')
    return response.data
  },

  // Get user's badge progress (earned and unearned with progress)
  getMyBadges: async (): Promise<BadgeProgress[]> => {
    const response = await api.get('/badges/my_badges/')
    return response.data
  },

  // Get only earned badges
  getEarnedBadges: async (): Promise<Badge[]> => {
    const response = await api.get('/badges/earned/')
    return response.data
  },
}

// Referral types
export interface ReferralCode {
  code: string
  referral_link: string
  created_at: string
}

export interface ReferralStats {
  code: string
  referral_link: string
  clicks: number
  signups: number
  conversions: number
  credits_available: number
  credits_used: number
  credits_total: number
}

export interface ReferralHistory {
  id: number
  referee_email: string
  referee_name: string
  status: 'clicked' | 'signed_up' | 'converted' | 'rewarded'
  clicked_at: string | null
  signed_up_at: string | null
  first_subscription_at: string | null
  created_at: string
}

export interface ReferralCredit {
  id: number
  amount: number
  earned_at: string
  expires_at: string
  used: boolean
  used_at: string | null
  referral_id: number
}

export interface ReferralValidation {
  valid: boolean
  code?: string
  referrer_name?: string
}

export const referralAPI = {
  // Get user's referral code
  getMyCode: async (): Promise<ReferralCode> => {
    const response = await api.get('/referrals/my_code/')
    return response.data
  },

  // Get referral statistics
  getStats: async (): Promise<ReferralStats> => {
    const response = await api.get('/referrals/stats/')
    return response.data
  },

  // Get referral history
  getHistory: async (): Promise<ReferralHistory[]> => {
    const response = await api.get('/referrals/history/')
    return response.data
  },

  // Get available credits
  getCredits: async (): Promise<ReferralCredit[]> => {
    const response = await api.get('/referrals/credits/')
    return response.data
  },

  // Track a referral click (anonymous)
  trackClick: async (code: string): Promise<void> => {
    await api.post('/referrals/track_click/', { code })
  },

  // Validate a referral code
  validateCode: async (code: string): Promise<ReferralValidation> => {
    const response = await api.get(`/referrals/validate/?code=${code}`)
    return response.data
  },
}

export interface CertificateResponse {
  success: boolean
  download_url: string
  filename: string
}

export const certificateAPI = {
  // Generate certificate for a completed course
  generateCertificate: async (courseSlug: string): Promise<CertificateResponse> => {
    const response = await api.post('/certificates/generate/', {
      course_slug: courseSlug
    })
    return response.data
  },
}

// ============================================
// Two-Factor Authentication API
// ============================================

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
}

export interface LoginResponse {
  user: User
  message: string
  warning?: string
}

export interface TwoFactorStatus {
  enabled: boolean
  device_name?: string
}

export interface TwoFactorSetupResponse {
  qr_code: string // base64 encoded QR code image
  secret: string
  device_id: number
}

export interface TwoFactorVerifyResponse {
  success: boolean
  message: string
  backup_codes: string[]
}

export interface TwoFactorDisableResponse {
  success: boolean
  message: string
}

export interface TwoFactorBackupCodesResponse {
  success: boolean
  backup_codes: string[]
}

export const twoFactorAPI = {
  // Check if user has 2FA enabled
  getStatus: async (): Promise<TwoFactorStatus> => {
    const response = await api.get('/auth/2fa/status/')
    return response.data
  },

  // Start 2FA setup (get QR code)
  setup: async (): Promise<TwoFactorSetupResponse> => {
    const response = await api.post('/auth/2fa/setup/')
    return response.data
  },

  // Verify token and enable 2FA
  verify: async (token: string): Promise<TwoFactorVerifyResponse> => {
    const response = await api.post('/auth/2fa/verify/', { token })
    return response.data
  },

  // Verify 2FA token during login
  verifyLogin: async (token: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/2fa/verify-login/', { token })
    return response.data
  },

  // Cancel 2FA setup in progress
  cancelSetup: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/2fa/cancel-setup/')
    return response.data
  },

  // Disable 2FA
  disable: async (password: string): Promise<TwoFactorDisableResponse> => {
    const response = await api.post('/auth/2fa/disable/', { password })
    return response.data
  },

  // Regenerate backup codes
  regenerateBackupCodes: async (password: string): Promise<TwoFactorBackupCodesResponse> => {
    const response = await api.post('/auth/2fa/backup-codes/', { password })
    return response.data
  },
}

export default api

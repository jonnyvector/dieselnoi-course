import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

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

// Function to get CSRF token
export const getCSRFToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken

  try {
    const response = await api.get('/auth/csrf/')
    csrfToken = response.data.csrfToken
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

// Add response interceptor to handle CSRF token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.detail?.includes('CSRF')) {
      // CSRF token expired, clear it and retry
      csrfToken = null
      const config = error.config
      const token = await getCSRFToken()
      config.headers['X-CSRFToken'] = token
      return api.request(config)
    }
    return Promise.reject(error)
  }
)

// Types
export interface Course {
  id: number
  title: string
  description: string
  slug: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  price: string
  thumbnail_url?: string
  lesson_count: number
  created_at: string
}

export interface Lesson {
  id: number
  title: string
  description: string
  video_url: string | null
  mux_playback_id: string | null
  duration_minutes: number
  order: number
  is_free_preview: boolean
  created_at: string
}

export interface CourseDetail extends Course {
  lessons: Lesson[]
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

// API functions
export const courseAPI = {
  // Get all courses
  getCourses: async (): Promise<Course[]> => {
    const response = await api.get('/courses/')
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

export default api

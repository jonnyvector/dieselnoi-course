'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import { courseAPI, categoryAPI, Course, Category, CourseFilters } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

function CoursesPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')

  // Get filters from URL
  const filters: CourseFilters = useMemo(() => ({
    category: searchParams.get('category') || undefined,
    difficulty: searchParams.get('difficulty') || undefined,
    price: (searchParams.get('price') as 'free' | 'paid') || undefined,
    search: searchParams.get('search') || undefined,
    sort: (searchParams.get('sort') as CourseFilters['sort']) || 'newest',
  }), [searchParams])

  const debouncedSearch = useDebounce(searchInput, 300)

  // Update URL when filters change
  const updateFilters = useCallback((newFilters: Partial<CourseFilters>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value.toString())
      } else {
        params.delete(key)
      }
    })

    router.push(`/courses?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      updateFilters({ search: debouncedSearch || undefined })
    }
  }, [debouncedSearch, filters.search, updateFilters])

  // Fetch categories
  useEffect(() => {
    categoryAPI.getCategories().then(setCategories).catch(console.error)
  }, [])

  // Fetch courses when filters change
  useEffect(() => {
    setLoading(true)
    courseAPI.getCourses(filters)
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('')
    router.push('/courses')
  }

  const hasActiveFilters = filters.category || filters.difficulty || filters.price || filters.search

  // Separate featured and regular courses
  const featuredCourse = courses.find(c => c.is_featured && !c.is_coming_soon)
  const regularCourses = courses.filter(c => c !== featuredCourse)

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <Navigation currentPage="courses" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Course Hero */}
        {featuredCourse && !hasActiveFilters && (
          <div className="mb-8">
            <Link href={`/courses/${featuredCourse.slug}`}>
              <div className="relative bg-gradient-to-r from-purple to-purple-dark rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute inset-0 bg-black/20" />
                {featuredCourse.thumbnail_url && (
                  <div className="absolute inset-0">
                    <Image
                      src={featuredCourse.thumbnail_url}
                      alt={featuredCourse.title}
                      fill
                      className="object-cover opacity-30"
                    />
                  </div>
                )}
                <div className="relative p-8 md:p-12">
                  <span className="inline-block px-3 py-1 bg-gold text-purple-dark text-sm font-bold rounded-full mb-4">
                    FEATURED
                  </span>
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
                    {featuredCourse.title}
                  </h2>
                  <p className="text-gray-200 mb-4 max-w-2xl line-clamp-2">
                    {featuredCourse.description}
                  </p>
                  <div className="flex items-center gap-4 text-white/80 text-sm">
                    <span>{featuredCourse.lesson_count} lessons</span>
                    <span>•</span>
                    <span className="capitalize">{featuredCourse.difficulty}</span>
                    {featuredCourse.average_rating && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {Number(featuredCourse.average_rating).toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              All Courses
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {courses.length} course{courses.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple dark:focus:ring-gold focus:border-transparent transition-base"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {/* Category Pills */}
          <button
            onClick={() => updateFilters({ category: undefined })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-base ${
              !filters.category
                ? 'bg-purple dark:bg-gold text-white dark:text-purple-dark'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => updateFilters({ category: category.slug })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-base ${
                filters.category === category.slug
                  ? 'bg-purple dark:bg-gold text-white dark:text-purple-dark'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category.icon && <span className="mr-1">{category.icon}</span>}
              {category.name}
            </button>
          ))}

          <div className="flex-1" />

          {/* Difficulty Dropdown */}
          <select
            value={filters.difficulty || ''}
            onChange={(e) => updateFilters({ difficulty: e.target.value || undefined })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-base"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {/* Price Filter */}
          <select
            value={filters.price || ''}
            onChange={(e) => updateFilters({ price: (e.target.value as 'free' | 'paid') || undefined })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-base"
          >
            <option value="">All Prices</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={filters.sort || 'newest'}
            onChange={(e) => updateFilters({ sort: e.target.value as CourseFilters['sort'] })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-base"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="difficulty">Difficulty</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-base"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-card overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-gray-700" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No courses found</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Try adjusting your filters or search query.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 px-6 py-2 bg-purple dark:bg-gold text-white dark:text-purple-dark rounded-lg font-medium transition-base hover:opacity-90"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Course Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Course Card Component
function CourseCard({ course }: { course: Course }) {
  const [notifying, setNotifying] = useState(false)
  const [isNotified, setIsNotified] = useState(course.is_notified || false)

  const handleNotifyMe = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setNotifying(true)
    try {
      if (isNotified) {
        await courseAPI.unnotifyMe(course.id)
        setIsNotified(false)
      } else {
        await courseAPI.notifyMe(course.id)
        setIsNotified(true)
      }
    } catch (err) {
      console.error('Error toggling notification:', err)
    } finally {
      setNotifying(false)
    }
  }

  return (
    <Link href={`/courses/${course.slug}`} className="h-full block">
      <div className={`h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-card hover:shadow-card-hover overflow-hidden transition-slow group ${
        course.is_coming_soon ? 'opacity-75' : ''
      }`}>
        {/* Thumbnail */}
        <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
          {course.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-slow"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {course.is_coming_soon && (
              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
                COMING SOON
              </span>
            )}
            {course.is_free && !course.is_coming_soon && (
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                FREE
              </span>
            )}
            {course.is_subscribed && (
              <span className="px-2 py-1 bg-purple dark:bg-gold text-white dark:text-purple-dark text-xs font-bold rounded">
                SUBSCRIBED
              </span>
            )}
          </div>

          {/* Progress bar */}
          {course.user_progress !== null && course.user_progress !== undefined && course.user_progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full bg-purple dark:bg-gold transition-slow"
                style={{ width: `${course.user_progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          {/* Categories */}
          {course.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {course.categories.slice(0, 2).map((cat) => (
                <span key={cat.id} className="text-xs text-gray-500 dark:text-gray-400">
                  {cat.icon} {cat.name}
                </span>
              ))}
            </div>
          )}

          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-purple dark:group-hover:text-gold transition-base">
            {course.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {course.description}
          </p>

          {/* Spacer to push meta to bottom */}
          <div className="flex-grow" />

          {/* Meta */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <span>{course.lesson_count} lessons</span>
              <span className="capitalize">{course.difficulty}</span>
            </div>

            {course.is_coming_soon ? (
              <button
                onClick={handleNotifyMe}
                disabled={notifying}
                className={`px-3 py-1 text-xs font-medium rounded transition-base ${
                  isNotified
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-purple dark:bg-gold text-white dark:text-purple-dark hover:opacity-90'
                }`}
              >
                {notifying ? '...' : isNotified ? 'Notified' : 'Notify Me'}
              </button>
            ) : (
              <span className="font-semibold text-purple dark:text-gold">
                {course.is_free ? 'Free' : `$${course.price}/mo`}
              </span>
            )}
          </div>

          {/* Rating - always reserve space */}
          <div className="h-6 mt-3">
            {course.average_rating && course.total_reviews && course.total_reviews > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{Number(course.average_rating).toFixed(1)}</span>
                <span>({course.total_reviews})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// Main page component with Suspense boundary
export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <Navigation currentPage="courses" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading courses...</p>
          </div>
        </div>
      </div>
    }>
      <CoursesPageContent />
    </Suspense>
  )
}

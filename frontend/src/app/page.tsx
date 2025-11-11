'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CourseList from '@/components/CourseList'
import Navigation from '@/components/Navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const [videoPlaying, setVideoPlaying] = useState(false)

  return (
    <main className="min-h-screen bg-white dark:bg-dark-bg">
      <Navigation currentPage="home" />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-black dark:from-[#5f4891] dark:via-purple-900 dark:to-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23D6B84A\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-block mb-4 px-4 py-2 bg-yellow-400 text-purple-900 rounded-full text-sm font-bold">
                🏆 Train with a Legend
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-6 leading-tight">
                Master <span className="text-yellow-400">Golden Era</span> Muay Thai
              </h1>

              <p className="text-xl sm:text-2xl mb-4 text-gray-100">
                Learn from Dieselnoi Yodnayok - The Sky-Piercing Knee Striker
              </p>

              <p className="text-lg mb-8 text-gray-200">
                Champion of Lumpinee Stadium. Undefeated lightweight king. Master the techniques that dominated Thailand's golden era of Muay Thai.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="px-8 py-4 bg-yellow-400 text-purple-900 font-bold rounded-lg text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Go to Dashboard →
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="px-8 py-4 bg-yellow-400 text-purple-900 font-bold rounded-lg text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
                    >
                      Start Training Now →
                    </Link>
                    <a
                      href="#courses"
                      className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-yellow-400 text-white font-bold rounded-lg text-lg hover:bg-white/20 transition-all"
                    >
                      View Courses
                    </a>
                  </>
                )}
              </div>

              <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>4.9/5 rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>10,000+ students</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Certified training</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Video Placeholder */}
            <div className="relative">
              <div className="aspect-video bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border-4 border-yellow-400/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-300 transition-all transform hover:scale-110 shadow-lg">
                    <svg className="w-8 h-8 text-red-900 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-sm font-semibold">Watch: Dieselnoi's Training Philosophy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-gray-900 dark:bg-black py-6 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure Payment
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              30-Day Money-Back
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              HD Video Lessons
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              All Skill Levels
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Cancel Anytime
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50 dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 dark:text-dark-heading mb-4">
              What Students Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Join thousands training with authentic Muay Thai techniques
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                "Dieselnoi's knee technique is legendary. This course breaks down the mechanics in ways I never understood before. My training has improved dramatically."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-dark-heading">Marcus Chen</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Competitive Fighter, 6 years</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                "As a beginner, I was intimidated by Muay Thai. Dieselnoi's teaching style is clear and encouraging. I'm now sparring confidently after just 3 months!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  S
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-dark-heading">Sarah Johnson</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Beginner, Fitness Enthusiast</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white dark:bg-dark-bg dark:border dark:border-gray-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                "I've trained at gyms in Thailand, but having access to Dieselnoi's knowledge anywhere, anytime is invaluable. The detail in these courses is incredible."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  J
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-dark-heading">James Rodriguez</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gym Owner & Instructor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 dark:text-dark-heading mb-4">
              Why Choose Dieselnoi Training
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to master authentic Muay Thai
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl text-gray-900 dark:text-dark-heading mb-2">Structured Curriculum</h3>
              <p className="text-gray-600 dark:text-gray-400">Beginner to advanced paths with clear progression</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl text-gray-900 dark:text-dark-heading mb-2">HD Video Lessons</h3>
              <p className="text-gray-600 dark:text-gray-400">Crystal clear instruction from every angle</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl text-gray-900 dark:text-dark-heading mb-2">Track Progress</h3>
              <p className="text-gray-600 dark:text-gray-400">Earn badges and certificates as you advance</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl text-gray-900 dark:text-dark-heading mb-2">Train Anytime</h3>
              <p className="text-gray-600 dark:text-gray-400">Learn at your own pace, on your schedule</p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-16 bg-gray-50 dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 dark:text-dark-heading mb-4">
              Available Courses
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Choose your path to mastery
            </p>
          </div>

          <CourseList />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white dark:bg-dark-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 dark:text-dark-heading mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to know before you start
            </p>
          </div>

          <div className="space-y-6">
            {/* FAQ Item 1 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                Do I need prior Muay Thai experience?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>No! Our courses are designed for all skill levels, from complete beginners to advanced practitioners. Each course clearly indicates its difficulty level, and lessons progress systematically from fundamentals to advanced techniques.</p>
              </div>
            </details>

            {/* FAQ Item 2 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                How does the subscription work?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>Each course has a monthly subscription fee. You pay per course, not for the entire platform. This allows you to focus on what you want to learn without paying for courses you don't need. You can cancel anytime with no penalties.</p>
              </div>
            </details>

            {/* FAQ Item 3 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                Can I access courses on mobile devices?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>Yes! Our platform is fully responsive and works on phones, tablets, and computers. You can train anywhere - at home, at the gym, or on the go. All videos are optimized for mobile viewing with adaptive quality.</p>
              </div>
            </details>

            {/* FAQ Item 4 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                What if I'm not satisfied with a course?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>We offer a 30-day money-back guarantee on all courses. If you're not completely satisfied within the first 30 days, contact us for a full refund - no questions asked.</p>
              </div>
            </details>

            {/* FAQ Item 5 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                How long do I have access to course content?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>As long as your subscription is active, you have unlimited access to all course videos, resources, and materials. Your progress is saved automatically, so you can pick up exactly where you left off.</p>
              </div>
            </details>

            {/* FAQ Item 6 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                Are the certificates recognized?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>Upon completing a course, you'll receive a certificate of completion signed by Dieselnoi. While these are not official belt rankings, they demonstrate your dedication to learning authentic Golden Era techniques from a legendary fighter.</p>
              </div>
            </details>

            {/* FAQ Item 7 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                Who is Dieselnoi?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>Dieselnoi Chor Thanasukarn is a legendary Muay Thai fighter known as "The Sky-Piercing Knee Striker." He held the Lumpinee Stadium lightweight championship and was so dominant that he struggled to find opponents. His knee technique is considered among the best in Muay Thai history.</p>
              </div>
            </details>

            {/* FAQ Item 8 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                Do I need special equipment?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>For shadowboxing and technique drills, you can train with minimal equipment. As you progress, you'll want hand wraps, gloves, and ideally access to a heavy bag and pads. Each course specifies recommended equipment for optimal training.</p>
              </div>
            </details>

            {/* FAQ Item 9 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                Can I download videos for offline viewing?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>Currently, videos are stream-only to protect the content and ensure you always have access to the latest updates. However, you can watch on any device with an internet connection, and videos load quickly even on slower connections.</p>
              </div>
            </details>

            {/* FAQ Item 10 */}
            <details className="group bg-gray-50 dark:bg-dark-bg dark:border dark:border-gray-700 rounded-lg">
              <summary className="flex justify-between items-center cursor-pointer p-6 font-semibold text-gray-900 dark:text-dark-heading text-lg hover:bg-gray-100 dark:hover:opacity-90 transition-colors">
                How do I cancel my subscription?
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">
                <p>You can cancel anytime from your dashboard with just a few clicks. There are no cancellation fees, and you'll retain access until the end of your current billing period. We make it as easy to leave as it is to join.</p>
              </div>
            </details>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Still have questions?</p>
            <a href="#" className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300 transition-colors">
              Contact our support team →
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-900 via-purple-800 to-black dark:from-[#5f4891] dark:to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl mb-8 text-gray-100">
            Join thousands of students learning authentic Muay Thai techniques from a living legend
          </p>
          <Link
            href="/signup"
            className="inline-block px-10 py-5 bg-yellow-400 text-purple-900 font-bold rounded-lg text-xl hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-2xl"
          >
            Start Training Today →
          </Link>
          <p className="mt-6 text-gray-100">
            30-day money-back guarantee • Cancel anytime • Secure payment
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white text-lg mb-4">Dieselnoi Muay Thai</h3>
              <p className="text-sm">
                Authentic Golden Era training from the legendary Sky-Piercing Knee Striker
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white transition-colors">Browse Courses</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Refund Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2025 Dieselnoi Muay Thai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

# Feature: Dark Mode

## Overview

Implement a system-wide dark mode toggle that allows users to switch between light and dark color schemes. The preference will be persisted in localStorage and applied consistently across all pages.

**Why**: Many users prefer dark mode for reduced eye strain, especially during extended training video sessions. This is a modern UX expectation for video platforms.

## User Stories

- As a user, I want to toggle dark mode so I can reduce eye strain during night viewing
- As a user, I want my dark mode preference to persist across sessions so I don't have to re-enable it
- As a user watching videos, I want a dark interface that doesn't distract from the video content
- As a user, I want the toggle to be easily accessible from any page

## Design Decisions

### Color Scheme

**Light Mode (Current):**
- Background: gray-50 (#F9FAFB)
- Cards: white (#FFFFFF)
- Text: gray-900 (#111827)
- Primary: red-600 (#DC2626)

**Dark Mode:**
- Background: gray-900 (#111827)
- Cards: gray-800 (#1F2937)
- Text: gray-100 (#F3F4F6)
- Primary: red-500 (#EF4444) - slightly lighter for better contrast
- Borders: gray-700 (#374151)
- Muted text: gray-400 (#9CA3AF)

### Toggle Placement

**Primary location**: Navigation bar (top right, next to username)
- Icon-based toggle (sun/moon icons)
- Visible on all pages
- Smooth transition animation

**Visual design**:
- Light mode: Show moon icon
- Dark mode: Show sun icon
- Include hover tooltip: "Toggle dark mode"

### Implementation Approach

**Technology**: Tailwind CSS built-in dark mode with `class` strategy

**Persistence**: localStorage key: `theme` (values: `'light'` | `'dark'` | `'system'`)

**Initial state**: Respect system preference using `prefers-color-scheme` media query

## Technical Implementation

### 1. Tailwind Configuration

Update `tailwind.config.ts`:
```typescript
module.exports = {
  darkMode: 'class', // Use class strategy instead of media query
  // ... rest of config
}
```

### 2. Theme Context

Create `src/contexts/ThemeContext.tsx`:
```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) {
      setThemeState(saved)
    }
  }, [])

  useEffect(() => {
    // Update HTML class and resolved theme
    const root = document.documentElement

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.toggle('dark', systemTheme === 'dark')
      setResolvedTheme(systemTheme)
    } else {
      root.classList.toggle('dark', theme === 'dark')
      setResolvedTheme(theme)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

### 3. Theme Toggle Component

Create `src/components/ThemeToggle.tsx`:
```typescript
'use client'

import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {resolvedTheme === 'dark' ? (
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  )
}
```

### 4. Update Layout

Wrap app with ThemeProvider in `src/app/layout.tsx`:
```typescript
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider>
              <ToastProvider>
                <AuthProvider>
                  {children}
                </AuthProvider>
                <ToastContainer />
              </ToastProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

### 5. Prevent Flash of Unstyled Content (FOUC)

Add inline script to `src/app/layout.tsx` before body:
```typescript
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = localStorage.getItem('theme') || 'system';
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        }
      })();
    `,
  }}
/>
```

## Component Updates

### Pages to Update (Add dark mode classes)

1. **Homepage** (`src/app/page.tsx`)
   - `bg-gray-50` → `bg-gray-50 dark:bg-gray-900`
   - `bg-white` → `bg-white dark:bg-gray-800`
   - `text-gray-900` → `text-gray-900 dark:text-gray-100`

2. **Course Detail** (`src/app/courses/[slug]/page.tsx`)
   - Navigation bar backgrounds
   - Course header
   - Lesson cards

3. **Lesson Page** (`src/app/courses/[slug]/lessons/[id]/page.tsx`)
   - Video player container (keep black)
   - Lesson info cards
   - Comments section

4. **Dashboard** (`src/app/dashboard/page.tsx`)
   - Subscription cards
   - Continue watching section
   - Stats cards

5. **Navigation Components**
   - All nav bars need dark mode
   - Add ThemeToggle to nav

### Shared Components

**CourseList** (`src/components/CourseList.tsx`):
- Card backgrounds
- Text colors
- Hover states

**Comments** (`src/components/Comments.tsx`):
- Comment cards
- Input fields
- Borders

**Skeleton** (`src/components/Skeleton.tsx`):
- Change `bg-gray-200` → `bg-gray-200 dark:bg-gray-700`

**Toast** (`src/components/Toast.tsx`):
- Update all color variants to have dark mode versions

## Tailwind Class Patterns

Common replacements across all components:

```typescript
// Backgrounds
bg-gray-50 → bg-gray-50 dark:bg-gray-900
bg-white → bg-white dark:bg-gray-800
bg-gray-100 → bg-gray-100 dark:bg-gray-700

// Text
text-gray-900 → text-gray-900 dark:text-gray-100
text-gray-700 → text-gray-700 dark:text-gray-300
text-gray-600 → text-gray-600 dark:text-gray-400
text-gray-500 → text-gray-500 dark:text-gray-400

// Borders
border-gray-200 → border-gray-200 dark:border-gray-700
border-gray-300 → border-gray-300 dark:border-gray-600

// Hover states
hover:bg-gray-50 → hover:bg-gray-50 dark:hover:bg-gray-700
hover:bg-gray-100 → hover:bg-gray-100 dark:hover:bg-gray-800

// Primary colors (keep consistent or slightly lighter)
bg-primary-600 → bg-primary-600 dark:bg-primary-500
text-primary-600 → text-primary-600 dark:text-primary-400
```

## Edge Cases & Special Handling

### Video Player
- Keep video player background black in both modes
- Mux player controls should work naturally

### Images & Thumbnails
- No changes needed (keep natural colors)

### Code/Monospace Elements
- If any exist, use gray-800 dark:gray-200 for background

### Modals/Overlays
- Backdrop: `bg-black/50` (works in both modes)
- Modal background: `bg-white dark:bg-gray-800`

### Form Inputs
```typescript
className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
```

## Testing Checklist

### Functionality
- [ ] Toggle switches between light and dark mode
- [ ] Preference persists after page reload
- [ ] Preference persists after browser close/reopen
- [ ] System preference is respected on first visit
- [ ] No FOUC (flash of unstyled content) on page load
- [ ] Toggle is accessible from all pages

### Visual Consistency
- [ ] All pages have consistent dark mode styling
- [ ] Text is readable in both modes (sufficient contrast)
- [ ] Primary colors (red) work well in dark mode
- [ ] Borders are visible but subtle in dark mode
- [ ] Hover states are visible in both modes
- [ ] Focus states are visible in both modes

### Components
- [ ] CourseList cards render properly
- [ ] Dashboard cards render properly
- [ ] Comments section is readable
- [ ] Toast notifications are visible
- [ ] Skeleton loaders are visible
- [ ] Error boundaries render properly
- [ ] Video player controls are accessible

### Performance
- [ ] No layout shift during theme switch
- [ ] Smooth transitions (200ms) on theme change
- [ ] No janky animations
- [ ] localStorage writes don't block UI

## Implementation Order

1. **Setup** (30 min)
   - Configure Tailwind for dark mode
   - Create ThemeContext
   - Add FOUC prevention script
   - Wrap app with ThemeProvider

2. **Toggle Component** (15 min)
   - Create ThemeToggle component
   - Add to all navigation bars

3. **Core Pages** (2 hours)
   - Update homepage
   - Update course detail page
   - Update lesson page
   - Update dashboard

4. **Shared Components** (1 hour)
   - Update CourseList
   - Update Comments
   - Update Skeleton
   - Update Toast

5. **Polish** (30 min)
   - Add transitions to color changes
   - Test all pages for visual consistency
   - Fix any missed elements

6. **Testing** (30 min)
   - Run through full testing checklist
   - Fix contrast issues
   - Verify persistence works

**Total Estimated Time**: 4-5 hours

## Open Questions

1. Should we add a third "system" option to the toggle (cycle through light → dark → system)?
2. Should dark mode be the default for new users?
3. Do we need different thumbnail overlays for dark mode?
4. Should we add a transition animation when toggling? (fade vs instant)
5. Should the toggle show current state with color (e.g., yellow sun icon)?

## Success Metrics

- **Adoption**: 40%+ of users enable dark mode within first month
- **Retention**: 90%+ of users who enable it keep it enabled
- **Accessibility**: Pass WCAG AA contrast requirements in both modes
- **Performance**: No measurable impact on page load times

## References

- Tailwind Dark Mode Docs: https://tailwindcss.com/docs/dark-mode
- Next.js Dark Mode Guide: https://nextjs.org/docs/basic-features/dark-mode
- next-themes library (alternative): https://github.com/pacocoursey/next-themes
- Material Design Dark Theme: https://material.io/design/color/dark-theme.html

---

**Status**: Draft
**Author**: Claude
**Created**: 2025-11-07
**Last Updated**: 2025-11-07

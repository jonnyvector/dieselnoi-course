'use client'

import { CourseResource } from '@/lib/api'
import { DownloadIcon, FileTextIcon, LockIcon } from 'lucide-react'

interface ResourceListProps {
  resources: CourseResource[]
}

export default function ResourceList({ resources }: ResourceListProps) {
  if (!resources || resources.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No resources available for this course yet.
      </div>
    )
  }

  const handleDownload = (url: string, title: string) => {
    // Open in new tab to trigger download
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => (
        <div
          key={resource.id}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:border-red-300 dark:hover:border-red-700 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Icon and content */}
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-1">
                <FileTextIcon className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg mb-1">
                  {resource.title}
                </h3>
                {resource.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {resource.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                  <span>PDF</span>
                  <span>•</span>
                  <span>{resource.file_size_display}</span>
                </div>
              </div>
            </div>

            {/* Download button */}
            <div className="flex-shrink-0">
              {resource.download_url ? (
                <button
                  onClick={() => handleDownload(resource.download_url!, resource.title)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download
                </button>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
                  title="Active subscription required to download this resource"
                >
                  <LockIcon className="w-4 h-4" />
                  Locked
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

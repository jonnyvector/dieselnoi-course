'use client'

import { useState, useEffect } from 'react'
import { videoNoteAPI, VideoNote } from '@/lib/api'

interface VideoNotesProps {
  lessonId: number
  currentTime: number
  onSeek: (time: number) => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function VideoNotes({ lessonId, currentTime, onSeek }: VideoNotesProps) {
  const [notes, setNotes] = useState<VideoNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await videoNoteAPI.getNotes(lessonId)
        setNotes(data)
      } catch (err) {
        console.error('Error fetching notes:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotes()
  }, [lessonId])

  const handleAddNote = async () => {
    if (!newNote.trim() || saving) return
    setSaving(true)
    try {
      const note = await videoNoteAPI.createNote(lessonId, Math.floor(currentTime), newNote.trim())
      setNotes(prev => [...prev, note].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds))
      setNewNote('')
    } catch (err) {
      console.error('Error creating note:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateNote = async (noteId: number) => {
    if (!editContent.trim() || saving) return
    setSaving(true)
    try {
      const updated = await videoNoteAPI.updateNote(noteId, editContent.trim())
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n))
      setEditingId(null)
    } catch (err) {
      console.error('Error updating note:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Delete this note?')) return
    try {
      await videoNoteAPI.deleteNote(noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  }

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400 text-sm">Loading notes...</div>
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={`Add note at ${formatTime(currentTime)}...`}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple dark:focus:ring-gold focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
        />
        <button
          onClick={handleAddNote}
          disabled={!newNote.trim() || saving}
          className="px-4 py-2 text-sm font-medium text-white bg-purple dark:bg-gold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '...' : 'Add'}
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No notes yet. Add your first note above!
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div
              key={note.id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={saving}
                      className="px-3 py-1 text-xs font-medium text-white bg-purple dark:bg-gold rounded hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onSeek(note.timestamp_seconds)}
                      className="text-sm font-medium text-purple dark:text-gold hover:underline"
                    >
                      {formatTime(note.timestamp_seconds)}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(note.id)
                          setEditContent(note.content)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{note.content}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

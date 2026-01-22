'use client'

import { useState } from 'react'
import { StickyNote, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface Note {
  id: string
  content: string
  createdAt: string
  authorName?: string
  isImportant?: boolean
}

interface NotesCardProps {
  notes: Note[]
  onAddNote?: (content: string) => Promise<void>
}

export default function NotesCard({
  notes,
  onAddNote
}: NotesCardProps) {
  const [showInput, setShowInput] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAddNote = async () => {
    if (!newNote.trim() || !onAddNote) return

    setAdding(true)
    try {
      await onAddNote(newNote.trim())
      setNewNote('')
      setShowInput(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-gray-400" />
          Interne beleške
        </h3>
      </div>

      {/* Content */}
      <div className="p-4">
        {notes.length === 0 && !showInput ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Nema beleški</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-xl border ${
                  note.isImportant
                    ? 'bg-yellow-50 border-yellow-100'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {note.authorName && `${note.authorName} • `}
                  {format(new Date(note.createdAt), "d. MMM 'u' HH:mm", { locale: sr })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add Note Input */}
        {showInput ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Unesite belešku..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || adding}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {adding ? 'Dodavanje...' : 'Dodaj'}
              </button>
              <button
                onClick={() => {
                  setShowInput(false)
                  setNewNote('')
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Otkaži
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full mt-3 px-4 py-2 text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Dodaj belešku
          </button>
        )}
      </div>
    </div>
  )
}

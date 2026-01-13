'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Loader2 } from 'lucide-react'

interface EmailCapturePopupProps {
  slug: string
  offerId?: string
  qualificationData?: Record<string, unknown>
  onClose: () => void
  onSuccess?: () => void
}

export default function EmailCapturePopup({
  slug,
  offerId,
  qualificationData,
  onClose,
  onSuccess,
}: EmailCapturePopupProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Prevent scrolling when popup is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Unesite email adresu')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/public/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          email,
          name: name || null,
          offer_id: offerId || null,
          qualification_data: qualificationData || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      setSuccess(true)
      onSuccess?.()
      
      // Auto close after success
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError('Greška. Pokušajte ponovo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hvala!</h3>
            <p className="text-gray-600">
              Poslali smo vam email sa ponudama koje ste gledali.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <Mail className="w-10 h-10 mb-3" />
              <h3 className="text-xl font-bold mb-1">Sačuvaj pretragu</h3>
              <p className="text-blue-100 text-sm">
                Ostavite email i poslaćemo vam rezultate pretrage
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ime (opciono)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Vaše ime"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    error ? 'border-red-500' : 'border-gray-200'
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  placeholder="vas@email.com"
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Šalje se...
                  </>
                ) : (
                  'Pošalji mi ponude'
                )}
              </button>

              <p className="text-xs text-center text-gray-500">
                Nećemo vas spamovati. Možete se odjaviti bilo kada.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

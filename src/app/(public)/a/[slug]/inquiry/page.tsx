'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { InquiryForm, InquiryCriteriaSummary, InquirySuccess } from '@/components/inquiry'
import type { QualificationData } from '@/types'
import type { InquiryFormData, AgencyInquirySettings } from '@/types/inquiry'

export default function InquiryPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [qualification, setQualification] = useState<QualificationData | null>(null)
  const [settings, setSettings] = useState<AgencyInquirySettings | null>(null)
  const [agencyName, setAgencyName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load qualification data from sessionStorage
    const storedQualification = sessionStorage.getItem('qualification')
    if (storedQualification) {
      try {
        setQualification(JSON.parse(storedQualification))
      } catch (e) {
        console.error('Error parsing qualification data:', e)
      }
    }

    // Fetch agency settings
    async function fetchSettings() {
      try {
        const response = await fetch(`/api/public/agencies/${slug}/landing`)
        if (!response.ok) {
          setError('Agencija nije pronađena')
          return
        }
        const data = await response.json()
        setAgencyName(data.agency.name)
        setSettings({
          allow_custom_inquiries: data.inquiry_settings.allow_custom_inquiries,
          show_inquiry_with_results: data.inquiry_settings.show_inquiry_with_results,
          inquiry_response_text: data.inquiry_settings.inquiry_response_text,
          inquiry_notification_email: null,
          inquiry_notification_phone: null,
        })
      } catch (err) {
        console.error('Error fetching settings:', err)
        setError('Greška pri učitavanju')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [slug])

  const handleSubmit = async (formData: InquiryFormData) => {
    if (!qualification) {
      setError('Podaci o pretrazi nisu pronađeni. Molimo pokrenite pretragu ponovo.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/public/agencies/${slug}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          qualification_data: qualification,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Greška pri slanju upita')
        return
      }

      setIsSuccess(true)
    } catch (err) {
      console.error('Error submitting inquiry:', err)
      setError('Greška pri slanju upita. Pokušajte ponovo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (error && !qualification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{error}</h1>
          <Link
            href={`/a/${slug}`}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Nazad na početnu
          </Link>
        </div>
      </div>
    )
  }

  if (!settings?.allow_custom_inquiries) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Upiti trenutno nisu dostupni
          </h1>
          <p className="text-gray-600 mb-4">
            Ova agencija trenutno ne prima prilagođene upite.
          </p>
          <Link
            href={`/a/${slug}`}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Nazad na početnu
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <InquirySuccess 
          responseTimeText={settings.inquiry_response_text} 
          slug={slug} 
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/a/${slug}/results`}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900">Pošalji upit</h1>
            <p className="text-sm text-gray-500">{agencyName}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Criteria summary */}
        {qualification && (
          <div className="mb-6">
            <InquiryCriteriaSummary qualification={qualification} />
          </div>
        )}

        {/* No qualification warning */}
        {!qualification && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-800 text-sm">
              Nismo pronašli podatke o vašoj pretrazi. Možete nastaviti sa slanjem upita, ali preporučujemo da prvo 
              <Link href={`/a/${slug}/qualify`} className="font-medium underline ml-1">
                pokrenete pretragu
              </Link>
              .
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Form section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Kontakt podaci
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Ostavite vaše podatke i mi ćemo vas kontaktirati sa najboljim ponudama.
          </p>

          <InquiryForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            responseTimeText={settings.inquiry_response_text}
          />
        </div>
      </main>
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function AgencyLandingPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch agency settings (only active ones are publicly visible per RLS)
  const { data: agency, error } = await supabase
    .from('agency_booking_settings')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true) // RLS policy requires is_active = true for public access
    .single()

  if (error || !agency) {
    notFound()
  }

  // Fetch organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', agency.organization_id)
    .single()

  // Database columns are: agency_name, agency_logo_url (not display_name, logo_url)
  const displayName = (agency as any).agency_name || organization?.name || 'Turistička agencija'
  const logoUrl = (agency as any).agency_logo_url

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {displayName[0] || 'A'}
              </div>
            )}
            <span className="font-semibold text-gray-900">{displayName}</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Pronađite savršeno putovanje
            </h1>
            <p className="text-xl text-gray-600">
              Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href={`/a/${slug}/qualify`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Započni pretragu
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-gray-500">
              Besplatno • Bez obaveze • Rezultati za 1 minut
            </p>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 pt-8 text-gray-500">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">1000+</span>
              <span className="text-sm">Zadovoljnih putnika</span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">50+</span>
              <span className="text-sm">Destinacija</span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">⭐ 4.9</span>
              <span className="text-sm">Prosečna ocena</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          {displayName} • Licencirana turistička agencija
        </div>
      </footer>
    </div>
  )
}

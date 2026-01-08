'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const industries = [
  { value: 'travel', label: 'Turistička agencija', icon: '🏖️' },
  { value: 'realestate', label: 'Nekretnine', icon: '🏠' },
  { value: 'salon', label: 'Salon lepote', icon: '💇' },
  { value: 'healthcare', label: 'Zdravstvo', icon: '🏥' },
  { value: 'education', label: 'Edukacija', icon: '📚' },
  { value: 'other', label: 'Ostalo', icon: '🛠️' },
]

const teamSizes = [
  { value: 'solo', label: 'Samo ja' },
  { value: '2-5', label: '2-5 ljudi' },
  { value: '6-10', label: '6-10 ljudi' },
  { value: '10+', label: '10+ ljudi' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 data
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')

  // Step 2 data
  const [industry, setIndustry] = useState<string>('')

  // Step 3 data
  const [teamSize, setTeamSize] = useState<string>('')

  const handleStep1Next = () => {
    if (!companyName.trim() || !fullName.trim()) {
      setError('Molimo popunite sva polja')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleStep2Next = () => {
    if (!industry) {
      setError('Molimo izaberite industriju')
      return
    }
    setError(null)
    setStep(3)
  }

  const handleStep2Back = () => {
    setStep(1)
  }

  const handleStep3Back = () => {
    setStep(2)
  }

  const handleFinish = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Korisnik nije autentifikovan')
        setLoading(false)
        return
      }

      // Generate slug from company name
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Generate organization ID client-side
      const organizationId = crypto.randomUUID()

      // Create organization
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: organizationId,
          name: companyName,
          slug: slug,
          industry: industry || null,
        })

      if (orgError) {
        setError(orgError.message)
        setLoading(false)
        return
      }

      // Create user record
      const { error: userRecordError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          organization_id: organizationId,
          full_name: fullName,
          role: 'owner',
          is_active: true,
        })

      if (userRecordError) {
        setError(userRecordError.message)
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Došlo je do greške')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#64748B]">Korak {step} od 3</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#3B82F6] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-[10px] bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-[#EF4444]">{error}</p>
        </div>
      )}

      {/* Step 1: Welcome & Company Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
              Dobrodošli u Trak! 👋
            </h1>
            <p className="text-sm text-[#64748B]">
              Hajde da podesimo vaš nalog
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Ime kompanije <span className="text-[#EF4444]">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                placeholder="Npr. Moja Agencija"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Vaše puno ime <span className="text-[#EF4444]">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                placeholder="Npr. Marko Petrović"
              />
            </div>
          </div>

          <button
            onClick={handleStep1Next}
            className="w-full flex justify-center rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-all"
          >
            Nastavi →
          </button>
        </div>
      )}

      {/* Step 2: Industry Selection */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
              Čime se bavite?
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {industries.map((ind) => (
              <button
                key={ind.value}
                onClick={() => setIndustry(ind.value)}
                className={`p-4 rounded-[10px] border-2 transition-all text-left ${
                  industry === ind.value
                    ? 'border-[#3B82F6] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#3B82F6]/50 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-2">{ind.icon}</div>
                <div className="text-sm font-medium text-[#1E293B]">{ind.label}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStep2Back}
              className="flex items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white px-6 py-3 text-sm font-medium text-[#1E293B] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad
            </button>
            <button
              onClick={handleStep2Next}
              className="flex-1 flex justify-center rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-all"
            >
              Nastavi →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Team Size */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
              Koliko vas ima u timu?
            </h1>
            <p className="text-sm text-[#64748B]">
              Ovo polje je opcionalno
            </p>
          </div>

          <div className="space-y-3">
            {teamSizes.map((size) => (
              <label
                key={size.value}
                className={`flex items-center p-4 rounded-[10px] border-2 cursor-pointer transition-all ${
                  teamSize === size.value
                    ? 'border-[#3B82F6] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#3B82F6]/50 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="teamSize"
                  value={size.value}
                  checked={teamSize === size.value}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="h-4 w-4 text-[#3B82F6] focus:ring-[#3B82F6] focus:ring-offset-0"
                />
                <span className="ml-3 text-sm font-medium text-[#1E293B]">
                  {size.label}
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStep3Back}
              className="flex items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white px-6 py-3 text-sm font-medium text-[#1E293B] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex-1 flex justify-center rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Čuvanje...' : 'Završi podešavanje'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

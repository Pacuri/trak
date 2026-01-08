'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, ArrowRight, Check } from 'lucide-react'

const registerSchema = z.object({
  email: z.string().email('Unesite validnu email adresu'),
  password: z.string().min(6, 'Lozinka mora imati najmanje 6 karaktera'),
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          setError('Korisnik sa ovim emailom već postoji')
        } else {
          setError(signUpError.message)
        }
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setError('Neuspešno kreiranje korisnika')
        setIsLoading(false)
        return
      }

      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError('Došlo je do neočekivane greške')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="flex justify-center mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]">
            <span className="text-xl font-bold text-white">T</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Trak</h1>
        </div>
      </div>

      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1E293B]">Kreirajte nalog</h2>
        <p className="mt-2 text-sm text-[#64748B]">
          Započnite besplatno, bez kreditne kartice
        </p>
      </div>

      {/* Features */}
      <div className="space-y-2">
        {['Upravljanje upitima', 'Pipeline pregled', 'Analitika'].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-[#64748B]">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Check className="h-3 w-3 text-[#10B981]" />
            </div>
            {feature}
          </div>
        ))}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="rounded-[10px] bg-[#FEF2F2] p-4 border border-[#EF4444]/20">
            <p className="text-sm font-medium text-[#EF4444]">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1E293B] mb-1.5">
            Email adresa
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              placeholder="vas@email.com"
              className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-sm text-[#EF4444]">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#1E293B] mb-1.5">
            Lozinka
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              {...register('password')}
              type="password"
              id="password"
              autoComplete="new-password"
              placeholder="Minimum 6 karaktera"
              className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
              disabled={isLoading}
            />
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-[#EF4444]">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Kreiranje naloga...
            </>
          ) : (
            <>
              Kreiraj nalog
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-[#64748B]">
        Već imate nalog?{' '}
        <Link href="/login" className="font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors">
          Prijavite se
        </Link>
      </p>
    </div>
  )
}

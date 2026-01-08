'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Users, Euro, FileText, MessageSquare } from 'lucide-react'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'

const leadSchema = z.object({
  name: z.string().min(1, 'Ime je obavezno'),
  phone: z.string().optional(),
  email: z.string().email('Unesite validnu email adresu').optional().or(z.literal('')),
  source_id: z.string().optional(),
  destination: z.string().optional(),
  travel_date: z.string().optional(),
  guests: z.number().min(1).optional().or(z.literal('')),
  budget: z.number().min(0).optional().or(z.literal('')),
  value: z.number().min(0).optional().or(z.literal('')),
  notes: z.string().optional(),
  original_message: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

export default function NewLeadPage() {
  const router = useRouter()
  const { createLead, loading, error } = useLeads()
  const { sources } = useOrganization()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      source_id: '',
      destination: '',
      travel_date: '',
      guests: '',
      budget: '',
      value: '',
      notes: '',
      original_message: '',
    },
  })

  const onSubmit = async (data: LeadFormData) => {
    const submitData = {
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      source_id: data.source_id || undefined,
      destination: data.destination || undefined,
      travel_date: data.travel_date || undefined,
      guests: typeof data.guests === 'number' ? data.guests : undefined,
      budget: typeof data.budget === 'number' ? data.budget : undefined,
      value: typeof data.value === 'number' ? data.value : undefined,
      notes: data.notes || undefined,
      original_message: data.original_message || undefined,
    }

    const newLead = await createLead(submitData)
    if (newLead) {
      router.push(`/dashboard/leads/${newLead.id}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-sm text-[#64748B] hover:text-[#1E293B] transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Nazad
      </button>

      {/* Form */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
            <User className="h-5 w-5 text-[#3B82F6]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Novi upit</h1>
            <p className="text-sm text-[#64748B]">Unesite podatke o novom upitu</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-6">
          {error && (
            <div className="rounded-[10px] bg-[#FEF2F2] p-4 border border-[#EF4444]/20">
              <p className="text-sm font-medium text-[#EF4444]">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h2 className="text-base font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#64748B]" />
              Osnovni podaci
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Ime i prezime <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    placeholder="Unesite ime"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-sm text-[#EF4444]">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('phone')}
                    type="tel"
                    id="phone"
                    placeholder="+381 64 123 4567"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1.5 text-sm text-[#EF4444]">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    placeholder="email@primer.com"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-sm text-[#EF4444]">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="source_id" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Izvor
                </label>
                <select
                  {...register('source_id')}
                  id="source_id"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  <option value="">Izaberite izvor</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Travel Information */}
          <div>
            <h2 className="text-base font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#64748B]" />
              Informacije o putovanju
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="destination" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Destinacija
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('destination')}
                    type="text"
                    id="destination"
                    placeholder="npr. Maldivi, Pariz, Santorini"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="travel_date" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Datum putovanja
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('travel_date')}
                    type="text"
                    id="travel_date"
                    placeholder="npr. 15-20. mart 2024"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="guests" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Broj gostiju
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('guests', { valueAsNumber: true })}
                    type="number"
                    id="guests"
                    min="1"
                    placeholder="2"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
                {errors.guests && (
                  <p className="mt-1.5 text-sm text-[#EF4444]">{errors.guests.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Budžet
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('budget', { valueAsNumber: true })}
                    type="number"
                    id="budget"
                    min="0"
                    step="0.01"
                    placeholder="2000"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
                {errors.budget && (
                  <p className="mt-1.5 text-sm text-[#EF4444]">{errors.budget.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="value" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Vrednost
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    {...register('value', { valueAsNumber: true })}
                    type="number"
                    id="value"
                    min="0"
                    step="0.01"
                    placeholder="2500"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
                {errors.value && (
                  <p className="mt-1.5 text-sm text-[#EF4444]">{errors.value.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Original Message */}
          <div>
            <h2 className="text-base font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#64748B]" />
              Originalna poruka
            </h2>
            <textarea
              {...register('original_message')}
              id="original_message"
              rows={4}
              placeholder="Originalna poruka ili upit od klijenta..."
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-3 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <h2 className="text-base font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#64748B]" />
              Beleške
            </h2>
            <textarea
              {...register('notes')}
              id="notes"
              rows={4}
              placeholder="Dodatne napomene ili informacije..."
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-3 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-[10px] border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-all"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Čuvanje...
                </span>
              ) : (
                'Sačuvaj upit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

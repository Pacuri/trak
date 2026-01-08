'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
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
        className="flex items-center text-sm text-[#64748B] hover:text-[#1E293B]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </button>

      {/* Form */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="p-5">
          <h1 className="text-2xl font-bold text-[#1E293B] mb-6">New Lead</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-[10px] bg-red-50 p-4 border border-red-200">
                <p className="text-sm font-medium text-[#EF4444]">{error}</p>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Phone
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    id="phone"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="source_id"
                    className="block text-sm font-medium text-[#374151] mb-1.5"
                  >
                    Source
                  </label>
                  <select
                    {...register('source_id')}
                    id="source_id"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  >
                    <option value="">Select source</option>
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
              <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Travel Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="destination"
                    className="block text-sm font-medium text-[#374151] mb-1.5"
                  >
                    Destination
                  </label>
                  <input
                    {...register('destination')}
                    type="text"
                    id="destination"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="travel_date"
                    className="block text-sm font-medium text-[#374151] mb-1.5"
                  >
                    Travel Date
                  </label>
                  <input
                    {...register('travel_date')}
                    type="text"
                    id="travel_date"
                    placeholder="e.g., March 15-20, 2024"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                </div>

                <div>
                  <label htmlFor="guests" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Number of Guests
                  </label>
                  <input
                    {...register('guests', { valueAsNumber: true })}
                    type="number"
                    id="guests"
                    min="1"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                  {errors.guests && (
                    <p className="mt-1 text-sm text-red-600">{errors.guests.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Budget
                  </label>
                  <input
                    {...register('budget', { valueAsNumber: true })}
                    type="number"
                    id="budget"
                    min="0"
                    step="0.01"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                  {errors.budget && (
                    <p className="mt-1 text-sm text-red-600">{errors.budget.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="value" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Value
                  </label>
                  <input
                    {...register('value', { valueAsNumber: true })}
                    type="number"
                    id="value"
                    min="0"
                    step="0.01"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                  />
                  {errors.value && (
                    <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Original Message */}
            <div>
              <label
                htmlFor="original_message"
                className="block text-sm font-medium text-[#374151] mb-1.5"
              >
                Original Message
              </label>
              <textarea
                {...register('original_message')}
                id="original_message"
                rows={4}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#374151] bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-0"
                placeholder="The original message or inquiry from the lead..."
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[#374151] mb-1.5">
                Notes
              </label>
              <textarea
                {...register('notes')}
                id="notes"
                rows={4}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#374151] bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-0"
                placeholder="Add any additional notes or information..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-[10px] border border-[#E2E8F0] bg-white px-6 py-3 text-sm font-medium text-[#1E293B] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Saving...' : 'Save Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
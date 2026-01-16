'use client'

import { Users, Calendar, Star, MapPin } from 'lucide-react'
import type { LandingStatsProps } from '@/types/landing'

export default function LandingStats({ travelers, years, rating, destinations }: LandingStatsProps) {
  // Don't render if no stats
  const hasAnyStats = travelers || years || rating || destinations
  if (!hasAnyStats) return null

  const stats = [
    {
      value: travelers ? `${travelers.toLocaleString('sr-RS')}+` : null,
      label: 'Putnika',
      icon: Users,
    },
    {
      value: years ? `${years}` : null,
      label: 'Godina',
      icon: Calendar,
    },
    {
      value: rating ? `⭐ ${rating.toFixed(1)}` : null,
      label: 'Ocena',
      icon: Star,
    },
    {
      value: destinations ? `${destinations}+` : null,
      label: 'Destinacija',
      icon: MapPin,
    },
  ].filter(stat => stat.value !== null)

  if (stats.length === 0) return null

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mx-4 max-w-2xl w-full">
      <div className={`grid gap-6 ${stats.length === 4 ? 'grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {stats.map((stat, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <span className="text-2xl md:text-3xl font-bold text-gray-900">
              {stat.value}
            </span>
            <span className="text-sm text-gray-500 mt-1">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

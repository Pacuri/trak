'use client'

import Link from 'next/link'
import { Calendar, MapPin, Star, Eye, Pencil, Package as PackageIcon, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Package } from '@/types/packages'
import { 
  PACKAGE_TYPE_SHORT_LABELS, 
  formatPrice, 
  formatDate,
  getLocationString,
} from '@/lib/package-labels'

interface PackageCardProps {
  package: Package
}

export function PackageCard({ package: pkg }: PackageCardProps) {
  const primaryImage = pkg.images?.find(i => i.is_primary) || pkg.images?.[0]
  const location = getLocationString(pkg.destination_city, pkg.destination_country)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-48 h-36 flex-shrink-0 bg-gray-100 relative">
          {primaryImage ? (
            <img 
              src={primaryImage.url} 
              alt={pkg.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <PackageIcon className="h-12 w-12" />
            </div>
          )}
          {pkg.is_featured && (
            <span className="absolute top-2 left-2 bg-purple-500 text-white text-[10px] font-medium px-2 py-0.5 rounded">
              ⭐ Preporučeno
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{pkg.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{location}</span>
                {pkg.hotel_stars && (
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    {pkg.hotel_stars}
                  </span>
                )}
              </div>
            </div>
            
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
              pkg.package_type === 'fiksni' 
                ? 'bg-teal-100 text-teal-700' 
                : 'bg-purple-100 text-purple-700'
            )}>
              {PACKAGE_TYPE_SHORT_LABELS[pkg.package_type]}
            </span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{pkg.active_departures_count || 0} polazaka</span>
            </div>
            
            {pkg.min_price && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">od</span>
                <span className="font-bold text-teal-600">{formatPrice(pkg.min_price)}</span>
              </div>
            )}
            
            {pkg.next_departure_date && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="text-gray-500">Sledeći:</span>
                <span>{formatDate(pkg.next_departure_date)}</span>
              </div>
            )}
          </div>
          
          {/* Capacity (for fiksni only) */}
          {pkg.package_type === 'fiksni' && pkg.total_capacity && pkg.total_capacity > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Users className="h-4 w-4 text-gray-400" />
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all',
                    ((pkg.total_capacity - (pkg.available_capacity || 0)) / pkg.total_capacity) >= 0.9 
                      ? 'bg-red-500' 
                      : ((pkg.total_capacity - (pkg.available_capacity || 0)) / pkg.total_capacity) >= 0.7 
                        ? 'bg-orange-500' 
                        : 'bg-green-500'
                  )}
                  style={{ width: `${((pkg.total_capacity - (pkg.available_capacity || 0)) / pkg.total_capacity) * 100}%` }}
                />
              </div>
              <span className="text-gray-500 text-xs">
                {pkg.total_capacity - (pkg.available_capacity || 0)}/{pkg.total_capacity}
              </span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col justify-center gap-2 p-4 border-l border-gray-100">
          <Link href={`/dashboard/packages/${pkg.id}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Eye className="h-4 w-4" />
              Detalji
            </button>
          </Link>
          <Link href={`/dashboard/packages/${pkg.id}/edit`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Pencil className="h-4 w-4" />
              Izmeni
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

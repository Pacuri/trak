'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Pencil, 
  Archive, 
  Calendar, 
  MapPin, 
  Star, 
  Euro,
  Plane,
  Users,
  Plus,
  ExternalLink,
  Package as PackageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePackages } from '@/hooks/use-packages'
import { DeparturesTable, CapacityBar } from '@/components/packages'
import type { Package, Departure } from '@/types/packages'
import { 
  PACKAGE_UI_TEXT, 
  PACKAGE_TYPE_LABELS,
  MEAL_PLAN_LABELS,
  TRANSPORT_LABELS,
  formatPrice,
  formatDate,
  getLocationString,
  getStarsString,
} from '@/lib/package-labels'

export default function PackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const packageId = params.id as string
  
  const { getPackage, archivePackage, updateCapacity, loading, error } = usePackages()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  useEffect(() => {
    async function loadPackage() {
      const data = await getPackage(packageId)
      setPkg(data)
    }
    loadPackage()
  }, [getPackage, packageId])

  const handleArchive = async () => {
    if (!confirm('Da li ste sigurni da želite da arhivirate ovaj paket?')) return
    
    setIsArchiving(true)
    const success = await archivePackage(packageId)
    if (success) {
      router.push('/dashboard/packages')
    }
    setIsArchiving(false)
  }

  const handleUpdateCapacity = async (departureId: string, available: number) => {
    const success = await updateCapacity(departureId, available)
    if (success) {
      // Reload package data
      const data = await getPackage(packageId)
      setPkg(data)
    }
  }

  if (loading && !pkg) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="text-center py-12">
        <PackageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Paket nije pronađen</h2>
        <Link href="/dashboard/packages" className="text-teal-600 hover:underline mt-2 inline-block">
          Nazad na listu
        </Link>
      </div>
    )
  }

  const location = getLocationString(pkg.destination_city, pkg.destination_country)
  const departures = pkg.departures || []
  const primaryImage = pkg.images?.find(i => i.is_primary) || pkg.images?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/packages">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{pkg.name}</h1>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                pkg.package_type === 'fiksni' 
                  ? 'bg-teal-100 text-teal-700' 
                  : 'bg-purple-100 text-purple-700'
              )}>
                {PACKAGE_TYPE_LABELS[pkg.package_type].split('(')[0].trim()}
              </span>
              {pkg.is_featured && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                  ⭐ Preporučeno
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-500 mt-1">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
              {pkg.hotel_stars && (
                <span className="text-amber-500 ml-1">
                  {getStarsString(pkg.hotel_stars)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/dashboard/packages/${packageId}/edit`}>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Pencil className="h-4 w-4" />
              Izmeni
            </button>
          </Link>
          <button 
            onClick={handleArchive}
            disabled={isArchiving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Archive className="h-4 w-4" />
            {isArchiving ? 'Arhiviranje...' : 'Arhiviraj'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Calendar className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pkg.active_departures_count || 0}</p>
              <p className="text-sm text-gray-500">Aktivnih polazaka</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Euro className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {pkg.min_price ? formatPrice(pkg.min_price) : '-'}
              </p>
              <p className="text-sm text-gray-500">Minimalna cena</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Plane className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {pkg.next_departure_date ? formatDate(pkg.next_departure_date) : '-'}
              </p>
              <p className="text-sm text-gray-500">Sledeći polazak</p>
            </div>
          </div>
        </div>
        
        {pkg.package_type === 'fiksni' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {pkg.available_capacity || 0}/{pkg.total_capacity || 0}
                </p>
                <p className="text-sm text-gray-500">Dostupno mesta</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details & Image */}
      <div className="grid grid-cols-3 gap-6">
        {/* Details */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalji paketa</h2>
          
          <div className="grid grid-cols-2 gap-y-4">
            {pkg.board_type && (
              <div>
                <p className="text-sm text-gray-500">Ishrana</p>
                <p className="font-medium text-gray-900">{MEAL_PLAN_LABELS[pkg.board_type]}</p>
              </div>
            )}
            {pkg.transport_type && (
              <div>
                <p className="text-sm text-gray-500">Prevoz</p>
                <p className="font-medium text-gray-900">{TRANSPORT_LABELS[pkg.transport_type]}</p>
              </div>
            )}
            {pkg.departure_location && (
              <div>
                <p className="text-sm text-gray-500">Mesto polaska</p>
                <p className="font-medium text-gray-900">{pkg.departure_location}</p>
              </div>
            )}
            {pkg.default_duration && (
              <div>
                <p className="text-sm text-gray-500">Trajanje</p>
                <p className="font-medium text-gray-900">{pkg.default_duration} noći</p>
              </div>
            )}
          </div>
          
          {pkg.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Opis</p>
              <p className="text-gray-700">{pkg.description}</p>
            </div>
          )}
        </div>
        
        {/* Primary Image */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {primaryImage ? (
            <img 
              src={primaryImage.url} 
              alt={pkg.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-300">
              <PackageIcon className="h-16 w-16" />
            </div>
          )}
          {pkg.images && pkg.images.length > 1 && (
            <div className="p-4">
              <p className="text-sm text-gray-500">+{pkg.images.length - 1} slika</p>
            </div>
          )}
        </div>
      </div>

      {/* Departures */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Polasci ({departures.length})
          </h2>
          <Link href={`/dashboard/packages/${packageId}/edit`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors">
              <Plus className="h-4 w-4" />
              Dodaj polazak
            </button>
          </Link>
        </div>
        
        <DeparturesTable 
          departures={departures}
          packageType={pkg.package_type}
          onUpdateCapacity={handleUpdateCapacity}
        />
      </div>

      {/* Images Gallery */}
      {pkg.images && pkg.images.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Slike</h2>
          <div className="grid grid-cols-4 gap-4">
            {pkg.images.map((img, i) => (
              <div key={img.id} className="aspect-video rounded-lg overflow-hidden bg-gray-100 relative">
                <img 
                  src={img.url} 
                  alt={img.alt_text || `Slika ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {img.is_primary && (
                  <span className="absolute top-1 left-1 bg-teal-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Glavna
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

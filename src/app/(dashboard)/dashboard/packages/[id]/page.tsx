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
  Bed,
  DollarSign,
  Baby,
  Bus,
  Info,
  AlertTriangle,
  CheckCircle,
  Tag,
  Receipt,
  Percent,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePackages } from '@/hooks/use-packages'
import { DeparturesTable, CapacityBar, DepartureModal, GenerateDeparturesDialog } from '@/components/packages'
import type { Package, Departure, TransportPrice, PackageDeparture, PackageDepartureFormData } from '@/types/packages'
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
  
  const { getPackage, archivePackage, updateCapacity, createPackageDeparture, updatePackageDeparture, deletePackageDeparture, loading, error } = usePackages()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [departureModalOpen, setDepartureModalOpen] = useState(false)
  const [editingDeparture, setEditingDeparture] = useState<Departure | null>(null)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)

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
    const success = await updateCapacity(packageId, departureId, available)
    if (success) {
      const data = await getPackage(packageId)
      setPkg(data)
    }
  }

  const handleDepartureSubmit = async (data: PackageDepartureFormData) => {
    if (editingDeparture) {
      await updatePackageDeparture(packageId, editingDeparture.id, data)
    } else {
      await createPackageDeparture(packageId, data)
    }
    const next = await getPackage(packageId)
    setPkg(next)
    setDepartureModalOpen(false)
    setEditingDeparture(null)
  }

  const handleGenerated = async () => {
    const data = await getPackage(packageId)
    setPkg(data)
  }

  const handleDeleteDeparture = async (departureId: string) => {
    const ok = await deletePackageDeparture(packageId, departureId)
    if (ok) {
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditingDeparture(null); setDepartureModalOpen(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Dodaj polazak
            </button>
            <button
              type="button"
              onClick={() => setGenerateDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Generiši polaske
            </button>
          </div>
        </div>

        <DeparturesTable
          departures={departures}
          packageType={pkg.package_type}
          onEditDeparture={(d) => { setEditingDeparture(d); setDepartureModalOpen(true) }}
          onUpdateCapacity={handleUpdateCapacity}
          onDeleteDeparture={handleDeleteDeparture}
        />
      </div>

      {/* Room Types (for na_upit) */}
      {pkg.package_type === 'na_upit' && pkg.room_types && pkg.room_types.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bed className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Tipovi soba ({pkg.room_types.length})
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pkg.room_types.map((rt) => (
              <div key={rt.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-teal-600">{rt.code}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">{rt.max_persons} osoba max</span>
                </div>
                <p className="font-medium text-gray-900">{rt.name}</p>
                {rt.description && (
                  <p className="text-sm text-gray-500 mt-1">{rt.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Intervals & Matrix */}
      {pkg.price_intervals && pkg.price_intervals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Cenovni intervali ({pkg.price_intervals.length})
            </h2>
            {pkg.original_currency && pkg.original_currency !== 'EUR' && (
              <span className="ml-auto text-sm text-gray-500">
                Originalna valuta: {pkg.original_currency}
                {pkg.margin_percent && ` • Marža: ${pkg.margin_percent}%`}
              </span>
            )}
          </div>

          {/* Price Intervals */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {pkg.price_intervals.map((interval) => (
              <div key={interval.id} className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-gray-900">{interval.name || 'Period'}</p>
                <p className="text-sm text-gray-600">
                  {formatDate(interval.start_date)} - {formatDate(interval.end_date)}
                </p>
              </div>
            ))}
          </div>

          {/* Hotel Price Matrix (for na_upit) */}
          {pkg.package_type === 'na_upit' && pkg.hotel_prices && pkg.hotel_prices.length > 0 && pkg.room_types && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border border-gray-200">Interval / Soba</th>
                    {pkg.room_types.map(rt => (
                      <th key={rt.id} className="px-3 py-2 text-center font-medium text-gray-600 border border-gray-200">
                        {rt.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pkg.price_intervals.map((interval) => {
                    const intervalPrices = pkg.hotel_prices?.filter(hp => hp.interval_id === interval.id) || []
                    return (
                      <tr key={interval.id}>
                        <td className="px-3 py-2 font-medium text-gray-900 border border-gray-200 bg-gray-50">
                          {interval.name || 'Period'}
                        </td>
                        {pkg.room_types?.map(rt => {
                          const price = intervalPrices.find(hp => hp.room_type_id === rt.id)
                          // Show the first available meal plan price
                          const displayPrice = price?.price_hb || price?.price_bb || price?.price_nd || price?.price_fb || price?.price_ai
                          return (
                            <td key={rt.id} className="px-3 py-2 text-center border border-gray-200">
                              {displayPrice ? (
                                <span className="text-gray-900">{formatPrice(displayPrice)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">* Cene su po osobi po noćenju (najčešći pansion)</p>
            </div>
          )}
        </div>
      )}

      {/* Children Policies */}
      {pkg.children_policies && pkg.children_policies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Baby className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Politika za decu ({pkg.children_policies.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pkg.children_policies.map((policy, i) => {
              // Build conditions label
              const conditions: string[] = []
              if (policy.min_adults != null || policy.max_adults != null) {
                if (policy.min_adults === policy.max_adults && policy.min_adults != null) {
                  conditions.push(`${policy.min_adults} odrasla`)
                } else if (policy.min_adults != null && policy.max_adults != null) {
                  conditions.push(`${policy.min_adults}-${policy.max_adults} odraslih`)
                } else if (policy.min_adults != null) {
                  conditions.push(`min ${policy.min_adults} odraslih`)
                }
              }
              if (policy.child_position) {
                conditions.push(`${policy.child_position}. dete`)
              }
              if (policy.room_type_codes && policy.room_type_codes.length > 0) {
                conditions.push(`sobe: ${policy.room_type_codes.join(', ')}`)
              }
              if (policy.bed_type && policy.bed_type !== 'any') {
                const bedLabels: Record<string, string> = {
                  separate: 'zaseban ležaj',
                  shared: 'zajednički ležaj',
                }
                conditions.push(bedLabels[policy.bed_type] || policy.bed_type)
              }
              const conditionsLabel = conditions.join(', ')

              return (
                <div key={policy.id || i} className="flex items-start gap-4 p-3 bg-purple-50 rounded-lg">
                  <div className="flex-shrink-0 w-20 text-center">
                    <span className="text-lg font-bold text-purple-600">
                      {policy.age_from ?? 0}-{policy.age_to ?? 18}
                    </span>
                    <p className="text-xs text-gray-500">godina</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'font-medium',
                        policy.discount_type === 'FREE' ? 'text-green-600' : 'text-purple-700'
                      )}>
                        {policy.discount_type === 'FREE'
                          ? 'BESPLATNO'
                          : policy.discount_type === 'PERCENT'
                            ? `${policy.discount_value}% popusta`
                            : `Fiksna cena: ${formatPrice(policy.discount_value || 0)}`
                        }
                      </span>
                      {conditionsLabel && (
                        <span className="text-sm text-gray-500">• {conditionsLabel}</span>
                      )}
                    </div>
                    {policy.rule_name && (
                      <p className="text-sm text-gray-500 mt-1 truncate" title={policy.rule_name}>
                        {policy.rule_name}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transport Price List */}
      {pkg.transport_price_list && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bus className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Cenovnik prevoza
            </h2>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <p className="font-medium text-gray-900">{pkg.transport_price_list.name}</p>
            {pkg.transport_price_list.supplier_name && (
              <p className="text-sm text-gray-500">Dobavljač: {pkg.transport_price_list.supplier_name}</p>
            )}
          </div>
          {pkg.transport_price_list.transport_prices && pkg.transport_price_list.transport_prices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Grad</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Lokacija</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Cena (odrasli)</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Cena (deca)</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.transport_price_list.transport_prices.map((tp: TransportPrice) => (
                    <tr key={tp.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">{tp.departure_city}</td>
                      <td className="px-3 py-2 text-gray-600">{tp.departure_location || '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{formatPrice(tp.price_per_person)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {tp.child_price ? formatPrice(tp.child_price) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supplier/Import Info */}
      {(pkg.original_currency || pkg.prices_are_net || pkg.margin_percent) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Informacije o cenama
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pkg.original_currency && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Originalna valuta</p>
                <p className="font-medium text-gray-900">{pkg.original_currency}</p>
              </div>
            )}
            {pkg.exchange_rate && pkg.exchange_rate !== 1 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Kurs konverzije</p>
                <p className="font-medium text-gray-900">1 EUR = {pkg.exchange_rate.toFixed(4)} {pkg.original_currency}</p>
              </div>
            )}
            {pkg.prices_are_net !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Tip cena</p>
                <p className="font-medium text-gray-900">{pkg.prices_are_net ? 'Neto (kupljene)' : 'Maloprodajne'}</p>
              </div>
            )}
            {pkg.margin_percent && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Marža agencije</p>
                <p className="font-medium text-green-700">{pkg.margin_percent}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Package Data (from import) */}
      {/* Warnings & Important Notes */}
      {pkg.notes && pkg.notes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Warnings (red) */}
            {pkg.notes.filter(n => n.note_type === 'warning').length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800 mb-2">Upozorenja</h4>
                    <ul className="space-y-1">
                      {pkg.notes.filter(n => n.note_type === 'warning').map((note) => (
                        <li key={note.id} className="text-sm text-red-700 flex items-start gap-2">
                          <span>•</span>
                          <span>{note.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Info notes (blue) */}
            {pkg.notes.filter(n => n.note_type === 'info').length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800 mb-2">Važne napomene</h4>
                    <ul className="space-y-1">
                      {pkg.notes.filter(n => n.note_type === 'info').map((note) => (
                        <li key={note.id} className="text-sm text-blue-700 flex items-start gap-2">
                          <span>•</span>
                          <span>{note.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Promo notes (green) */}
            {pkg.notes.filter(n => n.note_type === 'promo').length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800 mb-2">Promocije</h4>
                    <ul className="space-y-1">
                      {pkg.notes.filter(n => n.note_type === 'promo').map((note) => (
                        <li key={note.id} className="text-sm text-green-700 flex items-start gap-2">
                          <span>•</span>
                          <span>{note.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Included Services */}
      {pkg.included_services && pkg.included_services.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Uključeno u cenu</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pkg.included_services.map((service, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500">✓</span>
                <span>{service}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory Fees (not included in price) */}
      {pkg.fees && pkg.fees.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Obavezne naknade (nisu uključene)</h2>
          </div>
          <div className="space-y-3">
            {pkg.fees.map((fee) => (
              <div key={fee.id} className="p-3 bg-orange-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">{fee.name}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {fee.rules.map((rule, i) => (
                    <div key={i} className="text-sm text-gray-600">
                      {rule.age_from === 0 && rule.age_to < 3 ? (
                        <span>Bebe (0-{rule.age_to} god):</span>
                      ) : (
                        <span>{rule.age_from}-{rule.age_to} god:</span>
                      )}
                      {' '}
                      <span className="font-medium text-gray-900">
                        {rule.amount === 0 ? 'Besplatno' : `${rule.amount} ${fee.currency}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {fee.per === 'stay' ? 'Po boravku' : 'Po noćenju'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplements (optional add-ons) */}
      {pkg.supplements && pkg.supplements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">Doplate</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pkg.supplements.map((supp) => (
              <div key={supp.id} className="p-3 bg-purple-50 rounded-lg">
                <p className="font-medium text-gray-900">{supp.name}</p>
                <p className="text-sm text-gray-600">
                  {supp.percent 
                    ? `${supp.percent}%` 
                    : `${supp.amount} ${supp.currency || 'EUR'}`}
                  {' '}
                  {supp.per === 'person_night' && 'po osobi po danu'}
                  {supp.per === 'night' && 'po danu'}
                  {supp.per === 'stay' && 'po boravku'}
                  {supp.per === 'person_stay' && 'po osobi'}
                </p>
                {supp.mandatory && (
                  <span className="text-xs text-orange-600 font-medium">Obavezno</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discounts */}
      {pkg.discounts && pkg.discounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Popusti</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pkg.discounts.map((disc) => (
              <div key={disc.id} className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-gray-900">{disc.name}</p>
                <p className="text-sm text-green-700 font-medium">
                  {disc.percent ? `-${disc.percent}%` : `-${disc.fixed_amount} EUR`}
                </p>
                {disc.valid_from && disc.valid_to && (
                  <p className="text-xs text-gray-500 mt-1">
                    Važi: {formatDate(disc.valid_from)} - {formatDate(disc.valid_to)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

      <DepartureModal
        open={departureModalOpen}
        onOpenChange={setDepartureModalOpen}
        packageId={packageId}
        packageDefaults={{
          default_duration: pkg.default_duration ?? undefined,
          departure_location: pkg.departure_location ?? undefined,
        }}
        initial={editingDeparture ? (editingDeparture as unknown as PackageDeparture) : undefined}
        onSubmit={handleDepartureSubmit}
      />

      <GenerateDeparturesDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        packageId={packageId}
        packageType={pkg.package_type}
        onGenerated={handleGenerated}
      />
    </div>
  )
}

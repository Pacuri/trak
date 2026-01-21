'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  Check, 
  Star, 
  MapPin, 
  Bed, 
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Bus,
  Percent,
} from 'lucide-react'
import type { 
  DocumentParseResult, 
  ImportFormData, 
  ImportPackageFormData,
  BusinessModel,
  Currency,
} from '@/types/import'
import { EXCHANGE_RATES, formatCurrency } from '@/types/import'
import {
  ImportAttentionSection,
  MandatoryFeesSection,
  TransportSection,
  DiscountsSection,
  PoliciesSection,
} from './import'

interface ImportReviewScreenProps {
  parseResult: DocumentParseResult
  importId: string
  onContinue: (formData: ImportFormData) => void
  onCancel: () => void
}

export function ImportReviewScreen({ 
  parseResult, 
  importId,
  onContinue, 
  onCancel 
}: ImportReviewScreenProps) {
  const packages = parseResult?.packages ?? []
  const [selectedPackages, setSelectedPackages] = useState<Set<number>>(
    () => new Set(packages.map((_, i) => i))
  )
  const [businessModel, setBusinessModel] = useState<BusinessModel>(parseResult?.business_model ?? 'vlastita_marza')
  const [marginPercent, setMarginPercent] = useState<string>('')
  const [expandedPackage, setExpandedPackage] = useState<number | null>(0)

  // Normalize confidence: AI may return "confidence" or "parsing_confidence"
  const confidence = {
    overall: parseResult?.confidence?.overall ?? parseResult?.parsing_confidence?.overall ?? 0.5,
    issues: parseResult?.confidence?.issues ?? parseResult?.parsing_confidence?.issues ?? [],
  }

  const togglePackage = (index: number) => {
    const newSelected = new Set(selectedPackages)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedPackages(newSelected)
  }

  const selectAll = () => {
    setSelectedPackages(new Set(packages.map((_, i) => i)))
  }

  const deselectAll = () => {
    setSelectedPackages(new Set())
  }

  const handleContinue = () => {
    const formPackages: ImportPackageFormData[] = packages.map((pkg, index) => ({
      selected: selectedPackages.has(index),
      confidence: pkg.confidence,
      hotel_name: pkg.hotel_name,
      stars: pkg.stars,
      destination_country: pkg.destination?.country || '',
      destination_city: pkg.destination?.city,
      destination_region: pkg.destination?.region,
      // Hotel description and amenities
      hotel_description: pkg.hotel_description,
      hotel_amenities: pkg.hotel_amenities,
      generated_description: pkg.generated_description,
      distance_from_beach: pkg.distance_from_beach,
      distance_from_center: pkg.distance_from_center,
      // Enhanced pricing info
      price_type: pkg.price_type,
      base_occupancy: pkg.base_occupancy,
      occupancy_pricing: pkg.occupancy_pricing,
      room_types: (pkg.room_types || []).map(rt => ({
        code: rt.code,
        name: rt.name,
        max_persons: rt.max_persons,
        description: rt.description,
      })),
      price_intervals: (pkg.price_intervals || []).map(pi => ({
        name: pi.name,
        start_date: pi.start_date,
        end_date: pi.end_date,
      })),
      price_matrix: pkg.price_matrix || {},
      children_policies: (pkg.children_policies || []).map(cp => ({
        rule_name: cp.rule_name,
        min_adults: cp.conditions?.min_adults,
        max_adults: cp.conditions?.max_adults,
        child_position: cp.conditions?.child_position,
        room_type_codes: cp.conditions?.room_type_codes,
        bed_type: cp.conditions?.bed_type,
        age_from: cp.age_from ?? (cp.conditions as any)?.age_from ?? 0,
        age_to: cp.age_to ?? (cp.conditions as any)?.age_to ?? 18,
        discount_type: cp.discount_type,
        discount_value: cp.discount_value,
        source_text: cp.source_text,
      })),
      // Enhanced room details
      room_details: pkg.room_details,
      meal_plans: getMealPlansFromMatrix(pkg.price_matrix || {}),
      issues: pkg.notes || [],
    }))

    const formData: ImportFormData = {
      source_document_url: '', // Will be filled from import record
      business_model: businessModel,
      currency: parseResult.currency,
      margin_percent: marginPercent ? parseFloat(marginPercent) : undefined,
      packages: formPackages,
      transport: parseResult.transport ? {
        name: `${parseResult.transport.supplier || parseResult.transport.operator || 'Transport'} - Transport`,
        supplier_name: parseResult.transport.supplier || parseResult.transport.operator,
        transport_type: parseResult.transport.transport_type || parseResult.transport.type,
        // Handle both 'routes' (Claude output) and 'prices' (legacy) field names
        prices: parseResult.transport.routes
          ? parseResult.transport.routes.map((r) => ({
              city: r.departure_city,
              location: r.departure_point,
              price: r.adult_price,
              child_price: r.child_price,
            }))
          : parseResult.transport.prices || [],
      } : undefined,
      // Enhanced fields
      supplements: parseResult.supplements,
      mandatory_fees: parseResult.mandatory_fees,
      discounts: parseResult.discounts,
      policies: parseResult.policies,
      included_services: parseResult.included_services,
      important_notes: parseResult.important_notes,
    }

    onContinue(formData)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Pregled importa</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pronađeno {packages.length} paket{packages.length === 1 ? '' : 'a'} u dokumentu
        </p>
      </div>

      {/* Confidence indicator */}
      <div className={cn(
        'rounded-lg p-4 flex items-start gap-3',
        confidence.overall >= 0.8 ? 'bg-green-50 border border-green-200' :
        confidence.overall >= 0.6 ? 'bg-amber-50 border border-amber-200' :
        'bg-red-50 border border-red-200'
      )}>
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          confidence.overall >= 0.8 ? 'bg-green-100 text-green-600' :
          confidence.overall >= 0.6 ? 'bg-amber-100 text-amber-600' :
          'bg-red-100 text-red-600'
        )}>
          {confidence.overall >= 0.8 ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className={cn(
            'font-medium',
            confidence.overall >= 0.8 ? 'text-green-800' :
            confidence.overall >= 0.6 ? 'text-amber-800' :
            'text-red-800'
          )}>
            Pouzdanost parsiranja: {Math.round(confidence.overall * 100)}%
          </p>
          {confidence.issues.length > 0 && (
            <ul className="text-sm mt-1 space-y-0.5">
              {confidence.issues.map((issue, i) => (
                <li key={i} className={cn(
                  confidence.overall >= 0.8 ? 'text-green-700' :
                  confidence.overall >= 0.6 ? 'text-amber-700' :
                  'text-red-700'
                )}>
                  • {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Business model & margin */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Poslovni model
          </label>
          <select
            value={businessModel}
            onChange={(e) => setBusinessModel(e.target.value as BusinessModel)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="vlastita_marza">Vlastita marža (neto cene + marža)</option>
            <option value="posrednik">Posrednik (prodajne cene, provizija)</option>
          </select>
        </div>

        {businessModel === 'vlastita_marza' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Percent className="h-4 w-4 inline mr-1" />
              Marža (%)
            </label>
            <input
              type="number"
              value={marginPercent}
              onChange={(e) => setMarginPercent(e.target.value)}
              placeholder="npr. 11"
              min="0"
              max="100"
              step="0.5"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        )}
      </div>

      {/* Currency info */}
      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        Valuta u dokumentu: <strong>{parseResult.currency}</strong>
        {parseResult.currency !== 'EUR' && (
          <span className="ml-2 text-gray-500">
            (1 EUR = {EXCHANGE_RATES[parseResult.currency]} {parseResult.currency})
          </span>
        )}
      </div>

      {/* Enhanced sections - Attention, Fees, Discounts, Policies */}
      <ImportAttentionSection
        priceType={packages[0]?.price_type}
        supplements={parseResult.supplements}
        mandatoryFees={parseResult.mandatory_fees}
        policies={parseResult.policies}
        includedServices={parseResult.included_services}
        importantNotes={parseResult.important_notes}
        roomDetails={packages.flatMap(p => p.room_details || [])}
      />

      <MandatoryFeesSection fees={parseResult.mandatory_fees || []} />
      
      <DiscountsSection discounts={parseResult.discounts || []} />
      
      <PoliciesSection policies={parseResult.policies} />

      {/* Package selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Paketi za import</h3>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={selectAll}
              className="text-teal-600 hover:text-teal-700"
            >
              Izaberi sve
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-gray-500 hover:text-gray-700"
            >
              Poništi izbor
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <div
              key={index}
              className={cn(
                'rounded-xl border transition-all',
                selectedPackages.has(index)
                  ? 'border-teal-500 bg-teal-50/50'
                  : 'border-gray-200 bg-white'
              )}
            >
              {/* Package header */}
              <div className="p-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => togglePackage(index)}
                  className={cn(
                    'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    selectedPackages.has(index)
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : 'border-gray-300 hover:border-teal-500'
                  )}
                >
                  {selectedPackages.has(index) && <Check className="h-4 w-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">{pkg.hotel_name}</h4>
                    {pkg.stars && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: pkg.stars }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {pkg.destination?.city ? `${pkg.destination.city}, ` : ''}{pkg.destination?.country || 'Nepoznato'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" />
                      {(pkg.room_types?.length || 0)} tip{(pkg.room_types?.length || 0) === 1 ? '' : 'a'} soba
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {(pkg.price_intervals?.length || 0)} interval{(pkg.price_intervals?.length || 0) === 1 ? '' : 'a'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedPackage(expandedPackage === index ? null : index)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  {expandedPackage === index ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Expanded details */}
              {expandedPackage === index && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
                  {/* Room types */}
                  {pkg.room_types && pkg.room_types.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Tipovi soba</h5>
                      <div className="flex flex-wrap gap-2">
                        {pkg.room_types.map((rt, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-gray-100 rounded-md text-sm text-gray-700"
                          >
                            {rt.code} - {rt.name} ({rt.max_persons} os.)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price intervals */}
                  {pkg.price_intervals && pkg.price_intervals.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Cenovni intervali</h5>
                      <div className="flex flex-wrap gap-2">
                        {pkg.price_intervals.map((pi, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-blue-50 rounded-md text-sm text-blue-700"
                          >
                            {pi.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Children policies */}
                  {pkg.children_policies && pkg.children_policies.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Politika za decu ({pkg.children_policies.length} pravil{pkg.children_policies.length === 1 ? 'o' : 'a'})
                      </h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {pkg.children_policies.slice(0, 3).map((cp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            <span>
                              {cp.age_from ?? 0}-{cp.age_to ?? 18} god: {' '}
                              {cp.discount_type === 'FREE' ? 'Besplatno' :
                               cp.discount_type === 'PERCENT' ? `-${cp.discount_value}%` :
                               `${cp.discount_value}€`}
                            </span>
                          </li>
                        ))}
                        {pkg.children_policies.length > 3 && (
                          <li className="text-gray-400 italic">
                            ...i još {pkg.children_policies.length - 3} pravila
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transport info - using enhanced component */}
      <TransportSection transport={parseResult.transport} />

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Otkaži
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selectedPackages.size === 0}
          className={cn(
            'flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg',
            'bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Nastavi sa {selectedPackages.size} paket{selectedPackages.size === 1 ? 'om' : 'a'}
        </button>
      </div>
    </div>
  )
}

// Helper function to extract meal plans from price matrix
function getMealPlansFromMatrix(matrix: Record<string, Record<string, Record<string, number>>>): string[] {
  const mealPlans = new Set<string>()
  for (const rooms of Object.values(matrix)) {
    for (const meals of Object.values(rooms)) {
      for (const mealPlan of Object.keys(meals)) {
        mealPlans.add(mealPlan)
      }
    }
  }
  return Array.from(mealPlans)
}

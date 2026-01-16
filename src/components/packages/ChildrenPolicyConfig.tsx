'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ChildrenPolicyFormData, DiscountType } from '@/types/packages'
import { Plus, Trash2, Baby, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

interface ChildrenPolicyConfigProps {
  policies: ChildrenPolicyFormData[]
  onChange: (policies: ChildrenPolicyFormData[]) => void
}

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  FREE: 'Besplatno',
  PERCENT: 'Procenat popusta',
  FIXED: 'Fiksna cena',
}

// Common presets for children policies
const POLICY_PRESETS: ChildrenPolicyFormData[] = [
  { age_from: 0, age_to: 1.99, discount_type: 'FREE', label: 'Bebe' },
  { age_from: 2, age_to: 11.99, discount_type: 'PERCENT', discount_value: 50, label: 'Deca' },
]

export function ChildrenPolicyConfig({ policies, onChange }: ChildrenPolicyConfigProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addPolicy = (preset?: ChildrenPolicyFormData) => {
    // Find the next age range
    const maxAge = Math.max(0, ...policies.map(p => p.age_to))
    
    const newPolicy: ChildrenPolicyFormData = preset
      ? { ...preset }
      : {
          age_from: maxAge > 0 ? maxAge : 0,
          age_to: maxAge > 0 ? maxAge + 5.99 : 1.99,
          discount_type: 'FREE',
          label: `Kategorija ${policies.length + 1}`,
        }
    
    const newPolicies = [...policies, newPolicy]
    
    // Check for overlaps
    if (checkOverlaps(newPolicies)) {
      setError('Uzrasne kategorije se ne smeju preklapati')
      return
    }
    
    setError(null)
    onChange(newPolicies)
    setExpandedIndex(policies.length)
  }

  const updatePolicy = (index: number, data: Partial<ChildrenPolicyFormData>) => {
    const newPolicies = [...policies]
    newPolicies[index] = { ...newPolicies[index], ...data }
    
    // Check for overlaps
    if (checkOverlaps(newPolicies)) {
      setError('Uzrasne kategorije se ne smeju preklapati')
    } else {
      setError(null)
    }
    
    onChange(newPolicies)
  }

  const removePolicy = (index: number) => {
    onChange(policies.filter((_, i) => i !== index))
    setError(null)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  const checkOverlaps = (policiesToCheck: ChildrenPolicyFormData[]): boolean => {
    for (let i = 0; i < policiesToCheck.length; i++) {
      for (let j = i + 1; j < policiesToCheck.length; j++) {
        const a = policiesToCheck[i]
        const b = policiesToCheck[j]
        
        if (a.age_from < b.age_to && b.age_from < a.age_to) {
          return true
        }
      }
    }
    return false
  }

  const applyPresets = () => {
    const newPolicies = POLICY_PRESETS.map(p => ({ ...p }))
    onChange(newPolicies)
    setError(null)
    setExpandedIndex(null)
  }

  const formatAge = (age: number) => {
    if (age === Math.floor(age)) return `${age}`
    return age.toFixed(2).replace('.99', '.99')
  }

  const getDiscountLabel = (policy: ChildrenPolicyFormData) => {
    switch (policy.discount_type) {
      case 'FREE':
        return 'Besplatno'
      case 'PERCENT':
        return policy.discount_value ? `-${policy.discount_value}%` : 'Popust'
      case 'FIXED':
        return policy.discount_value ? `€${policy.discount_value}/noć` : 'Fiksna cena'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Politika cena za decu</h3>
          <p className="text-sm text-gray-500">
            Definišite uzrasne kategorije i popuste
          </p>
        </div>
        <div className="flex gap-2">
          {policies.length === 0 && (
            <button
              type="button"
              onClick={applyPresets}
              className="flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
            >
              Primeni standardne kategorije
            </button>
          )}
          <button
            type="button"
            onClick={() => addPolicy()}
            className="flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Dodaj kategoriju
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {policies.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Baby className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">Nema definisanih kategorija za decu</p>
          <p className="text-xs text-gray-400">
            Dodajte uzrasne kategorije sa popustima (npr. 0-2g. besplatno, 2-12g. -50%)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-pink-50 p-2">
                    <Baby className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {policy.label || `Kategorija ${index + 1}`}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatAge(policy.age_from)} - {formatAge(policy.age_to)} godina • {getDiscountLabel(policy)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    policy.discount_type === 'FREE' && 'bg-green-100 text-green-700',
                    policy.discount_type === 'PERCENT' && 'bg-blue-100 text-blue-700',
                    policy.discount_type === 'FIXED' && 'bg-amber-100 text-amber-700',
                  )}>
                    {getDiscountLabel(policy)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePolicy(index)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {expandedIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {expandedIndex === index && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Naziv kategorije
                    </label>
                    <input
                      type="text"
                      value={policy.label || ''}
                      onChange={(e) => updatePolicy(index, { label: e.target.value })}
                      placeholder="npr. Bebe, Deca"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Uzrast od (godine)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={18}
                        step={0.01}
                        value={policy.age_from}
                        onChange={(e) => updatePolicy(index, { age_from: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Uzrast do (godine)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={18}
                        step={0.01}
                        value={policy.age_to}
                        onChange={(e) => updatePolicy(index, { age_to: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Koristite .99 za precizne granice (npr. 11.99)
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tip popusta
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updatePolicy(index, { 
                            discount_type: type,
                            discount_value: type === 'FREE' ? undefined : policy.discount_value
                          })}
                          className={cn(
                            'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                            policy.discount_type === type
                              ? 'border-teal-500 bg-teal-50 text-teal-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          )}
                        >
                          {DISCOUNT_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {policy.discount_type !== 'FREE' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {policy.discount_type === 'PERCENT' ? 'Procenat popusta (%)' : 'Fiksna cena po noćenju (€)'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={policy.discount_type === 'PERCENT' ? 100 : 1000}
                        step={policy.discount_type === 'PERCENT' ? 1 : 0.01}
                        value={policy.discount_value || ''}
                        onChange={(e) => updatePolicy(index, { discount_value: parseFloat(e.target.value) || undefined })}
                        placeholder={policy.discount_type === 'PERCENT' ? 'npr. 50' : 'npr. 25'}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <p className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Deca od 12 godina obično plaćaju punu cenu kao odrasli
          </p>
        </div>
      )}
    </div>
  )
}

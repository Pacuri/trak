'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Check,
} from 'lucide-react'
import type { BedType } from '@/types/import'

export interface ChildrenPolicyRuleFormData {
  rule_name?: string
  min_adults?: number
  max_adults?: number
  child_position?: number
  room_type_codes?: string[]
  bed_type?: BedType
  age_from: number
  age_to: number
  discount_type: 'FREE' | 'PERCENT' | 'FIXED'
  discount_value?: number
  source_text: string
}

interface ChildrenPolicyRulesEditorProps {
  rules: ChildrenPolicyRuleFormData[]
  onChange: (rules: ChildrenPolicyRuleFormData[]) => void
  roomTypeCodes?: string[]
  readOnly?: boolean
}

export function ChildrenPolicyRulesEditor({
  rules,
  onChange,
  roomTypeCodes = [],
  readOnly = false,
}: ChildrenPolicyRulesEditorProps) {
  const [expandedRule, setExpandedRule] = useState<number | null>(rules.length > 0 ? 0 : null)
  const [editingRule, setEditingRule] = useState<number | null>(null)

  const addRule = () => {
    const newRule: ChildrenPolicyRuleFormData = {
      rule_name: `Pravilo ${rules.length + 1}`,
      age_from: 0,
      age_to: 11.99,
      discount_type: 'PERCENT',
      discount_value: 50,
      source_text: '',
    }
    onChange([...rules, newRule])
    setExpandedRule(rules.length)
    setEditingRule(rules.length)
  }

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index)
    onChange(newRules)
    if (expandedRule === index) {
      setExpandedRule(null)
    }
  }

  const updateRule = (index: number, updates: Partial<ChildrenPolicyRuleFormData>) => {
    const newRules = rules.map((rule, i) => 
      i === index ? { ...rule, ...updates } : rule
    )
    onChange(newRules)
  }

  const moveRule = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= rules.length) return
    const newRules = [...rules]
    const [removed] = newRules.splice(fromIndex, 1)
    newRules.splice(toIndex, 0, removed)
    onChange(newRules)
    setExpandedRule(toIndex)
  }

  const getDiscountLabel = (rule: ChildrenPolicyRuleFormData): string => {
    if (rule.discount_type === 'FREE') return 'Besplatno (GRATIS)'
    if (rule.discount_type === 'PERCENT') return `-${rule.discount_value || 0}%`
    return `${rule.discount_value || 0}€ fiksno`
  }

  const getConditionsLabel = (rule: ChildrenPolicyRuleFormData): string => {
    const parts: string[] = []
    
    if (rule.min_adults !== undefined && rule.max_adults !== undefined) {
      if (rule.min_adults === rule.max_adults) {
        parts.push(`${rule.min_adults} odrasla`)
      } else {
        parts.push(`${rule.min_adults}-${rule.max_adults} odraslih`)
      }
    }
    
    if (rule.child_position) {
      parts.push(`${rule.child_position}. dete`)
    }
    
    if (rule.room_type_codes && rule.room_type_codes.length > 0) {
      parts.push(`sobe: ${rule.room_type_codes.join(', ')}`)
    }
    
    if (rule.bed_type && rule.bed_type !== 'any') {
      const bedLabels: Record<BedType, string> = {
        any: 'bilo koji',
        separate: 'zasebni ležaj',
        shared: 'zajednički ležaj',
        extra: 'pomoćni ležaj',
      }
      parts.push(bedLabels[rule.bed_type])
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Bez uslova'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Politika za decu</h3>
          <p className="text-sm text-gray-500">
            Pravila se primenjuju po prioritetu (od vrha ka dnu)
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Dodaj pravilo
          </button>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
          <p>Nema definisanih pravila za decu</p>
          {!readOnly && (
            <button
              type="button"
              onClick={addRule}
              className="mt-2 text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              + Dodaj prvo pravilo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div
              key={index}
              className={cn(
                'rounded-xl border transition-all',
                expandedRule === index ? 'border-teal-500 bg-teal-50/30' : 'border-gray-200 bg-white'
              )}
            >
              {/* Rule header */}
              <div className="p-4 flex items-center gap-3">
                {!readOnly && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveRule(index, index - 1)}
                      disabled={index === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRule(index, index + 1)}
                      disabled={index === rules.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                    <span className="font-medium text-gray-900 truncate">
                      {rule.rule_name || `Pravilo ${index + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                    <span>{rule.age_from ?? 0}-{rule.age_to ?? 18} god</span>
                    <span className={cn(
                      'font-medium',
                      rule.discount_type === 'FREE' ? 'text-green-600' : 'text-blue-600'
                    )}>
                      {getDiscountLabel(rule)}
                    </span>
                    <span className="text-gray-400 truncate">
                      {getConditionsLabel(rule)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeRule(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedRule(expandedRule === index ? null : index)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    {expandedRule === index ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded editor */}
              {expandedRule === index && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                  {/* Source text (if from import) */}
                  {rule.source_text && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-700 mb-1">Originalni tekst iz dokumenta:</p>
                      <p className="text-sm text-amber-900 italic">"{rule.source_text}"</p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Rule name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Naziv pravila
                      </label>
                      <input
                        type="text"
                        value={rule.rule_name || ''}
                        onChange={(e) => updateRule(index, { rule_name: e.target.value })}
                        disabled={readOnly}
                        placeholder="npr. Bebe besplatno"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                      />
                    </div>

                    {/* Age range */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Od (godine)
                        </label>
                        <input
                          type="number"
                          value={rule.age_from ?? 0}
                          onChange={(e) => updateRule(index, { age_from: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          min="0"
                          max="17"
                          step="0.01"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Do (godine)
                        </label>
                        <input
                          type="number"
                          value={rule.age_to ?? 18}
                          onChange={(e) => updateRule(index, { age_to: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          min="0"
                          max="17.99"
                          step="0.01"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tip popusta
                      </label>
                      <select
                        value={rule.discount_type}
                        onChange={(e) => updateRule(index, { 
                          discount_type: e.target.value as 'FREE' | 'PERCENT' | 'FIXED',
                          discount_value: e.target.value === 'FREE' ? undefined : rule.discount_value,
                        })}
                        disabled={readOnly}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                      >
                        <option value="FREE">Besplatno (GRATIS)</option>
                        <option value="PERCENT">Procenat (%)</option>
                        <option value="FIXED">Fiksna cena (€)</option>
                      </select>
                    </div>

                    {rule.discount_type !== 'FREE' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {rule.discount_type === 'PERCENT' ? 'Popust (%)' : 'Cena (€)'}
                        </label>
                        <input
                          type="number"
                          value={rule.discount_value || ''}
                          onChange={(e) => updateRule(index, { discount_value: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          min="0"
                          max={rule.discount_type === 'PERCENT' ? 100 : undefined}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Conditions */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Uslovi primene (opciono)</h4>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Adults in room */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min. odraslih</label>
                        <input
                          type="number"
                          value={rule.min_adults ?? ''}
                          onChange={(e) => updateRule(index, { 
                            min_adults: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          disabled={readOnly}
                          min="1"
                          max="4"
                          placeholder="Bilo koji"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max. odraslih</label>
                        <input
                          type="number"
                          value={rule.max_adults ?? ''}
                          onChange={(e) => updateRule(index, { 
                            max_adults: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          disabled={readOnly}
                          min="1"
                          max="4"
                          placeholder="Bilo koji"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                        />
                      </div>

                      {/* Child position */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Pozicija deteta</label>
                        <select
                          value={rule.child_position ?? ''}
                          onChange={(e) => updateRule(index, { 
                            child_position: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          disabled={readOnly}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                        >
                          <option value="">Bilo koje</option>
                        <option value="1">1. dete</option>
                        <option value="2">2. dete</option>
                          <option value="3">3. dete</option>
                          <option value="4">4. dete</option>
                        </select>
                      </div>

                      {/* Bed type */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tip ležaja</label>
                        <select
                          value={rule.bed_type ?? 'any'}
                          onChange={(e) => updateRule(index, { 
                            bed_type: e.target.value as BedType 
                          })}
                          disabled={readOnly}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50"
                        >
                          <option value="any">Bilo koji</option>
                          <option value="separate">Zasebni ležaj</option>
                          <option value="shared">Zajednički ležaj</option>
                          <option value="extra">Pomoćni ležaj</option>
                        </select>
                      </div>
                    </div>

                    {/* Room types */}
                    {roomTypeCodes.length > 0 && (
                      <div className="mt-3">
                        <label className="block text-xs text-gray-500 mb-1">Samo za tipove soba</label>
                        <div className="flex flex-wrap gap-2">
                          {roomTypeCodes.map((code) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => {
                                const current = rule.room_type_codes || []
                                const updated = current.includes(code)
                                  ? current.filter(c => c !== code)
                                  : [...current, code]
                                updateRule(index, { 
                                  room_type_codes: updated.length > 0 ? updated : undefined 
                                })
                              }}
                              disabled={readOnly}
                              className={cn(
                                'px-2.5 py-1 rounded-md text-sm transition-colors',
                                rule.room_type_codes?.includes(code)
                                  ? 'bg-teal-100 text-teal-700 border border-teal-300'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                              )}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Ako ništa nije izabrano, pravilo važi za sve tipove soba
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

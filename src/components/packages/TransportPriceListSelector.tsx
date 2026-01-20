'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  Bus, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  MapPin,
  Check,
} from 'lucide-react'
import type { TransportPriceList, TransportPrice } from '@/types/import'

interface TransportPriceListSelectorProps {
  selectedListId?: string
  onSelect: (listId: string | undefined) => void
  organizationId: string
  // For inline creation from import
  importedTransport?: {
    name: string
    supplier_name?: string
    transport_type?: string
    prices: {
      city: string
      location?: string
      price: number
      child_price?: number
    }[]
  }
  onCreateFromImport?: (listId: string) => void
}

export function TransportPriceListSelector({
  selectedListId,
  onSelect,
  organizationId,
  importedTransport,
  onCreateFromImport,
}: TransportPriceListSelectorProps) {
  const [lists, setLists] = useState<TransportPriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedList, setSelectedList] = useState<TransportPriceList | null>(null)

  // Fetch existing transport price lists
  useEffect(() => {
    async function fetchLists() {
      try {
        const response = await fetch('/api/transport-price-lists')
        if (response.ok) {
          const data = await response.json()
          setLists(data.lists || [])
        }
      } catch (error) {
        console.error('Error fetching transport lists:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLists()
  }, [])

  // Fetch selected list details
  useEffect(() => {
    if (selectedListId && lists.length > 0) {
      const list = lists.find(l => l.id === selectedListId)
      if (list) {
        setSelectedList(list)
      }
    }
  }, [selectedListId, lists])

  const handleSelect = (listId: string | undefined) => {
    onSelect(listId)
    setExpanded(false)
    if (listId) {
      const list = lists.find(l => l.id === listId)
      setSelectedList(list || null)
    } else {
      setSelectedList(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Transport</h3>
        </div>
      </div>

      {/* Imported transport preview */}
      {importedTransport && !selectedListId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium text-amber-900">Importovani transport</p>
              <p className="text-sm text-amber-700">
                {importedTransport.supplier_name || 'Nepoznat dobavljač'} • {importedTransport.prices.length} gradova
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                // Create transport list from import
                try {
                  const response = await fetch('/api/transport-price-lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: importedTransport.name,
                      supplier_name: importedTransport.supplier_name,
                      transport_type: importedTransport.transport_type,
                      prices: importedTransport.prices,
                    }),
                  })
                  if (response.ok) {
                    const data = await response.json()
                    setLists([data.list, ...lists])
                    handleSelect(data.list.id)
                    onCreateFromImport?.(data.list.id)
                  }
                } catch (error) {
                  console.error('Error creating transport list:', error)
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
            >
              Koristi ovaj
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {importedTransport.prices.slice(0, 6).map((p, i) => (
              <span key={i} className="px-2 py-1 bg-amber-100 rounded text-xs text-amber-800">
                {p.city}: €{p.price}
              </span>
            ))}
            {importedTransport.prices.length > 6 && (
              <span className="px-2 py-1 text-xs text-amber-600">
                +{importedTransport.prices.length - 6} više
              </span>
            )}
          </div>
        </div>
      )}

      {/* Selector dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full rounded-lg border px-4 py-3 text-left flex items-center justify-between transition-colors',
            selectedListId
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center gap-3">
            <Bus className={cn(
              'h-5 w-5',
              selectedListId ? 'text-teal-600' : 'text-gray-400'
            )} />
            <div>
              {selectedList ? (
                <>
                  <p className="font-medium text-gray-900">{selectedList.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedList.supplier_name || 'Bez dobavljača'} • {selectedList.prices?.length || 0} gradova
                  </p>
                </>
              ) : (
                <p className="text-gray-500">Izaberi cenovnik transporta (opciono)</p>
              )}
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {/* Dropdown */}
        {expanded && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-auto">
            {/* No transport option */}
            <button
              type="button"
              onClick={() => handleSelect(undefined)}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3',
                !selectedListId && 'bg-gray-50'
              )}
            >
              <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center">
                {!selectedListId && <Check className="h-3.5 w-3.5 text-teal-600" />}
              </div>
              <span className="text-gray-600">Bez transporta</span>
            </button>

            {/* Existing lists */}
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => handleSelect(list.id)}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3',
                  selectedListId === list.id && 'bg-teal-50'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center',
                  selectedListId === list.id ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                )}>
                  {selectedListId === list.id && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{list.name}</p>
                  <p className="text-sm text-gray-500">
                    {list.supplier_name || 'Bez dobavljača'}
                  </p>
                </div>
              </button>
            ))}

            {/* Create new */}
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                setShowCreateForm(true)
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-t border-gray-100"
            >
              <Plus className="h-5 w-5 text-teal-600" />
              <span className="text-teal-600 font-medium">Kreiraj novi cenovnik</span>
            </button>
          </div>
        )}
      </div>

      {/* Selected list preview */}
      {selectedList && selectedList.prices && selectedList.prices.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Cene po gradovima</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectedList.prices.map((price, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <MapPin className="h-3.5 w-3.5" />
                  {price.departure_city}
                </span>
                <span className="font-medium text-gray-900">€{price.price_per_person}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create form modal would go here */}
      {showCreateForm && (
        <TransportPriceListCreateForm
          onClose={() => setShowCreateForm(false)}
          onCreated={(list) => {
            setLists([list, ...lists])
            handleSelect(list.id)
            setShowCreateForm(false)
          }}
        />
      )}
    </div>
  )
}

// Simple inline create form
function TransportPriceListCreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (list: TransportPriceList) => void
}) {
  const [name, setName] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [prices, setPrices] = useState<{ city: string; price: string }[]>([
    { city: '', price: '' }
  ])
  const [saving, setSaving] = useState(false)

  const addCity = () => {
    setPrices([...prices, { city: '', price: '' }])
  }

  const removeCity = (index: number) => {
    setPrices(prices.filter((_, i) => i !== index))
  }

  const updateCity = (index: number, field: 'city' | 'price', value: string) => {
    const newPrices = [...prices]
    newPrices[index][field] = value
    setPrices(newPrices)
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/transport-price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          supplier_name: supplierName || undefined,
          prices: prices
            .filter(p => p.city && p.price)
            .map(p => ({
              city: p.city,
              price: parseFloat(p.price),
            })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        onCreated(data.list)
      }
    } catch (error) {
      console.error('Error creating transport list:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Novi cenovnik transporta</h3>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Naziv cenovnika *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Transturist Albanija 2026"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Dobavljač
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="npr. Transturist"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cene po gradovima
            </label>
            <div className="space-y-2">
              {prices.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={p.city}
                    onChange={(e) => updateCity(i, 'city', e.target.value)}
                    placeholder="Grad"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <input
                    type="number"
                    value={p.price}
                    onChange={(e) => updateCity(i, 'price', e.target.value)}
                    placeholder="€"
                    className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  {prices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCity(i)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCity}
              className="mt-2 text-sm text-teal-600 hover:text-teal-700"
            >
              + Dodaj grad
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Otkaži
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Čuvam...' : 'Sačuvaj'}
          </button>
        </div>
      </div>
    </div>
  )
}

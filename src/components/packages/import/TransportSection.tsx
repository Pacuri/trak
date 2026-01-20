'use client'

import { Bus, Plane, Ship, Car, MapPin, Users, Baby } from 'lucide-react'
import type { ParsedTransport, ParsedTransportRoute, ParsedTransportPrice } from '@/types/import'

interface TransportSectionProps {
  transport: ParsedTransport | null | undefined
}

export function TransportSection({ transport }: TransportSectionProps) {
  // Handle both routes (new format) and prices (old format)
  const routes = transport?.routes || []
  const prices = transport?.prices || []
  
  if (!transport || (routes.length === 0 && prices.length === 0)) return null

  const getIcon = () => {
    const type = transport.type || transport.transport_type
    switch (type) {
      case 'plane': return Plane
      case 'ferry': return Ship
      case 'own': return Car
      default: return Bus
    }
  }
  
  const Icon = getIcon()
  const totalCities = routes.length || prices.length
  const operator = transport.operator || transport.supplier

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-600" />
          Transport ({totalCities} {totalCities === 1 ? 'grad' : totalCities < 5 ? 'grada' : 'gradova'})
        </h4>
        {!transport.included_in_package_price && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Nije uključeno u cijenu
          </span>
        )}
      </div>

      {/* Routes (new format) */}
      {routes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {routes.slice(0, 12).map((route, i) => (
            <TransportRouteCard key={i} route={route} />
          ))}
        </div>
      )}

      {/* Prices (old format) */}
      {prices.length > 0 && routes.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {prices.slice(0, 12).map((price, i) => (
            <TransportPriceCard key={i} price={price} />
          ))}
        </div>
      )}

      {/* Show more indicator */}
      {(routes.length > 12 || prices.length > 12) && (
        <div className="text-center mt-3 text-sm text-gray-500">
          +{Math.max(routes.length, prices.length) - 12} više gradova
        </div>
      )}

      {/* Operator info */}
      {operator && (
        <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
          Prevoznik: <span className="font-medium">{operator}</span>
        </div>
      )}
    </div>
  )
}

function TransportRouteCard({ route }: { route: ParsedTransportRoute }) {
  return (
    <div className="bg-white rounded-lg p-3 border shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-medium text-sm truncate" title={route.departure_city}>
          {route.departure_city}
        </span>
      </div>
      
      <div className="space-y-1">
        {/* Adult price */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-gray-600">
            <Users className="w-3 h-3" />
            Odrasli
          </span>
          <span className="font-semibold text-teal-700">
            {route.adult_price} {route.currency || 'EUR'}
          </span>
        </div>
        
        {/* Child price */}
        {route.child_price !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Baby className="w-3 h-3" />
              Djeca
              {route.child_age_from !== undefined && route.child_age_to !== undefined && (
                <span className="text-xs text-gray-400">
                  ({route.child_age_from}-{route.child_age_to})
                </span>
              )}
            </span>
            <span className="font-medium text-teal-600">
              {route.child_price === 0 ? 'GRATIS' : `${route.child_price} ${route.currency || 'EUR'}`}
            </span>
          </div>
        )}
        
        {/* Infant price */}
        {route.infant_price !== undefined && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Bebe (0-{route.infant_age_to || 3.99})
            </span>
            <span className={route.infant_price === 0 ? 'text-green-600 font-medium' : ''}>
              {route.infant_price === 0 ? 'GRATIS' : `${route.infant_price} ${route.currency || 'EUR'}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function TransportPriceCard({ price }: { price: ParsedTransportPrice }) {
  return (
    <div className="bg-white rounded px-3 py-2 border">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm truncate" title={price.city}>
          {price.city}
        </span>
        <span className="font-semibold text-teal-700 text-sm">
          {price.price} €
        </span>
      </div>
      {price.child_price !== undefined && (
        <div className="text-xs text-gray-500 mt-0.5">
          Djeca: {price.child_price === 0 ? 'GRATIS' : `${price.child_price} €`}
        </div>
      )}
    </div>
  )
}

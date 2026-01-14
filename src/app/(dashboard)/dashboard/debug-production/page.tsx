'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Database } from 'lucide-react'

interface DebugResult {
  timestamp: string
  checks: {
    qwetixSettings: {
      exists: boolean
      error: string | null
      data: any
    }
    qwetixOffers: {
      totalOffers: number
      futureOffers: number
      activeOffers: number
      sampleOffers: any[]
      error: string | null
    } | null
    allOrganizations: {
      count: number
      organizations: any[]
      error: string | null
    }
    allAgencySettings: {
      count: number
      settings: any[]
      error: string | null
    }
  }
  diagnosis: {
    hasQwetixSlug: boolean
    isActive: boolean
    hasOffers: boolean
    issue: string
  }
}

export default function DebugProductionPage() {
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runCheck = async () => {
    setLoading(true)
    setError(null)
    setSyncResult(null)

    try {
      const response = await fetch('/api/debug/production-check')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run check')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const syncProduction = async (organizationId: string, slug: string) => {
    setSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/debug/sync-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, slug }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync')
      }

      setSyncResult(data)
      // Re-run check after sync
      setTimeout(() => runCheck(), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Production Debug Tools</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Check and fix production database issues
        </p>
      </div>

      {/* Check Button */}
      <div className="rounded-[14px] bg-white p-6 border border-[#E2E8F0] shadow-sm">
        <button
          onClick={runCheck}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-medium transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Run Production Check
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-[14px] bg-red-50 border border-red-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="rounded-[14px] bg-green-50 border border-green-200 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">
                {syncResult.action === 'created' ? 'Created' : 'Updated'} Successfully
              </h3>
              <p className="text-green-700 text-sm mt-1">{syncResult.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Diagnosis */}
          <div className={`rounded-[14px] border p-6 ${
            result.diagnosis.hasQwetixSlug && result.diagnosis.isActive && result.diagnosis.hasOffers
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <h3 className="font-semibold text-lg mb-3">Diagnosis</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {result.diagnosis.hasQwetixSlug ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm">
                  Slug 'qwetix' exists: {result.diagnosis.hasQwetixSlug ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.diagnosis.isActive ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm">
                  Is active: {result.diagnosis.isActive ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.diagnosis.hasOffers ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm">
                  Has active offers: {result.diagnosis.hasOffers ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <p className="text-sm font-medium">{result.diagnosis.issue}</p>
              </div>
            </div>
          </div>

          {/* Quick Fix */}
          {result.checks.allOrganizations.organizations.length > 0 && !result.diagnosis.hasQwetixSlug && (
            <div className="rounded-[14px] bg-blue-50 border border-blue-200 p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Quick Fix: Create agency_booking_settings
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Select an organization to create the 'qwetix' slug:
              </p>
              <div className="space-y-2">
                {result.checks.allOrganizations.organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => syncProduction(org.id, 'qwetix')}
                    disabled={syncing}
                    className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50"
                  >
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-gray-500">ID: {org.id}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Results */}
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] p-6">
            <h3 className="font-semibold text-lg mb-4">Detailed Results</h3>
            
            {/* Settings Check */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Agency Booking Settings (qwetix)</h4>
              <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(result.checks.qwetixSettings, null, 2)}
              </pre>
            </div>

            {/* Offers Check */}
            {result.checks.qwetixOffers && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">Offers for qwetix Organization</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500">Total Offers</div>
                      <div className="text-2xl font-bold">{result.checks.qwetixOffers.totalOffers}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Future Offers</div>
                      <div className="text-2xl font-bold">{result.checks.qwetixOffers.futureOffers}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Active & Available</div>
                      <div className="text-2xl font-bold text-green-600">
                        {result.checks.qwetixOffers.activeOffers}
                      </div>
                    </div>
                  </div>
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(result.checks.qwetixOffers.sampleOffers, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* All Organizations */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">All Organizations ({result.checks.allOrganizations.count})</h4>
              <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-48">
                {JSON.stringify(result.checks.allOrganizations.organizations, null, 2)}
              </pre>
            </div>

            {/* All Settings */}
            <div>
              <h4 className="font-medium mb-2">All Agency Settings ({result.checks.allAgencySettings.count})</h4>
              <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-48">
                {JSON.stringify(result.checks.allAgencySettings.settings, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

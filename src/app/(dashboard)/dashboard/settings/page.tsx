'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const { organization, teamMembers, loading, refresh } = useOrganization()
  const [name, setName] = useState(organization?.name || '')
  const [industry, setIndustry] = useState(organization?.industry || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const supabase = createClient()

  // Update form when organization loads
  useEffect(() => {
    if (organization) {
      setName(organization.name)
      setIndustry(organization.industry || '')
    }
  }, [organization])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name, industry: industry || null })
        .eq('id', organization.id)

      if (error) {
        setSaveError(error.message)
        return
      }

      setSaveSuccess(true)
      await refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const industries = [
    { value: 'travel', label: 'Travel' },
    { value: 'realestate', label: 'Real Estate' },
    { value: 'salon', label: 'Salon' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Settings</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Manage your organization settings.</p>
      </div>

      {loading ? (
        <div className="rounded-lg bg-white p-12 text-center border border-gray-200 shadow-sm">
          <p className="text-[#6B7280]">Loading settings...</p>
        </div>
      ) : (
        <>
          {/* Organization Settings */}
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-[#111827] mb-4">Organization</h2>

              <form onSubmit={handleSave} className="space-y-4">
                {saveError && (
                  <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                    <p className="text-sm font-medium text-red-800">{saveError}</p>
                  </div>
                )}

                {saveSuccess && (
                  <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                    <p className="text-sm font-medium text-green-800">Settings saved successfully!</p>
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#374151] bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-0"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-[#374151] mb-1.5">
                    Industry
                  </label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#374151] bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-0"
                  >
                    <option value="">Select industry</option>
                    {industries.map((ind) => (
                      <option key={ind.value} value={ind.value}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Team Members */}
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#111827]">Team Members</h2>
                {/* Placeholder for invite button */}
              </div>

              {teamMembers.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No team members yet.</p>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#111827]">
                          {member.full_name || member.email}
                        </p>
                        <p className="text-xs text-[#6B7280]">{member.email}</p>
                      </div>
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  disabled
                  className="text-sm text-[#9CA3AF] cursor-not-allowed"
                  title="Team invites coming soon"
                >
                  + Invite Team Member (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

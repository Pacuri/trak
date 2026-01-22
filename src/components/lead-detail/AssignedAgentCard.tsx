'use client'

import { ArrowLeftRight } from 'lucide-react'
import type { User } from '@/types'
import { getInitials, getAvatarGradient } from '@/lib/avatar-utils'

interface AssignedAgentCardProps {
  agent?: User | null
  onChangeAgent?: () => void
}

export default function AssignedAgentCard({
  agent,
  onChangeAgent
}: AssignedAgentCardProps) {
  if (!agent) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Zadužen agent</h3>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-lg">?</span>
          </div>
          <p className="text-sm text-gray-500 mb-3">Nije dodeljen agent</p>
          {onChangeAgent && (
            <button
              onClick={onChangeAgent}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              Dodeli agenta
            </button>
          )}
        </div>
      </div>
    )
  }

  const name = agent.full_name || agent.email
  const initials = getInitials(name)
  const gradient = getAvatarGradient(name)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Zadužen agent</h3>

      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${gradient}`}>
          {initials}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{agent.full_name || 'Bez imena'}</p>
          <p className="text-sm text-gray-500 capitalize">{agent.role}</p>
        </div>
        {onChangeAgent && (
          <button
            onClick={onChangeAgent}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Promeni agenta"
          >
            <ArrowLeftRight className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  )
}

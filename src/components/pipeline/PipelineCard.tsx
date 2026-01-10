'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, MapPin, Calendar } from 'lucide-react'
import type { Lead, User } from '@/types'
import { differenceInDays } from 'date-fns'
import { getInitials, getAvatarGradient } from '@/lib/avatar-utils'

interface PipelineCardProps {
  lead: Lead
  onClick: () => void
  teamMembers?: User[]
  onAssign?: (leadId: string, userId: string | null) => void
  allUserIds?: string[] // Optional: for consistent avatar colors
}

export default function PipelineCard({ lead, onClick, teamMembers = [], onAssign, allUserIds = [] }: PipelineCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownAlignRight, setDropdownAlignRight] = useState(true)
  const [isAvatarHovered, setIsAvatarHovered] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const daysAgo = differenceInDays(new Date(), new Date(lead.created_at))
  const lastContactDays = lead.last_contact_at
    ? differenceInDays(new Date(), new Date(lead.last_contact_at))
    : daysAgo
  const needsAttention = lastContactDays >= 3

  const formatDaysAgo = (days: number) => {
    if (days === 0) return 'Danas'
    if (days === 1) return 'Juče'
    return `pre ${days} ${days === 1 ? 'dan' : 'dana'}`
  }

  const assignee = lead.assignee || lead.assigned_user
  const assigneeIndex = assignee?.id && allUserIds.length > 0 
    ? allUserIds.indexOf(assignee.id) 
    : 0

  // Handle click outside to close dropdown and position dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      
      // Calculate dropdown position using fixed positioning
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const dropdownWidth = 224 // w-56 = 224px
        const spaceOnRight = window.innerWidth - rect.right
        const spaceOnLeft = rect.left
        
        // If not enough space on right but more on left, align left
        if (spaceOnRight < dropdownWidth && spaceOnLeft > spaceOnRight) {
          setDropdownAlignRight(false)
          setDropdownPosition({
            top: rect.bottom + 8, // 8px = top-8 equivalent
            left: rect.left,
            right: 0
          })
        } else {
          setDropdownAlignRight(true)
          setDropdownPosition({
            top: rect.bottom + 8,
            left: 0,
            right: window.innerWidth - rect.right
          })
        }
      }
      
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    if (teamMembers.length > 0 && onAssign) {
      setDropdownOpen(!dropdownOpen)
    }
  }

  const handleAssign = (userId: string | null) => {
    if (onAssign) {
      onAssign(lead.id, userId)
      setDropdownOpen(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[10px] border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md hover:border-[#3B82F6]/30 transition-all cursor-pointer group relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`font-semibold text-[#1E293B] text-sm transition-colors flex-1 ${!isAvatarHovered ? 'group-hover:text-[#3B82F6]' : ''}`}>
          {lead.name}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {needsAttention && (
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-[#FEF2F2] flex-shrink-0">
              <AlertTriangle className="h-3 w-3 text-[#EF4444]" />
            </div>
          )}
          {/* Assignee Avatar with Dropdown */}
          <div 
            className="relative" 
            ref={dropdownRef}
            onMouseEnter={() => setIsAvatarHovered(true)}
            onMouseLeave={() => setIsAvatarHovered(false)}
          >
            <button
              ref={buttonRef}
              type="button"
              onClick={handleAvatarClick}
              className={`relative flex items-center justify-center h-9 w-9 rounded-full flex-shrink-0 transition-all duration-200 ease-in-out ${
                teamMembers.length > 0 && onAssign 
                  ? 'hover:ring-2 hover:ring-[#3B82F6] hover:scale-125 hover:shadow-lg cursor-pointer' 
                  : 'cursor-default'
              }`}
              style={{
                background: assignee ? getAvatarGradient(assigneeIndex) : '#E2E8F0',
              }}
              title={assignee?.full_name || assignee?.email || 'Nije dodeljeno'}
            >
              <span className="text-xs font-semibold text-white">
                {assignee ? getInitials(assignee.full_name || assignee.email) : '?'}
              </span>
              {/* Dropdown indicator */}
              {teamMembers.length > 0 && onAssign && (
                <div className="absolute w-3.5 h-3.5 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center" style={{ bottom: '-2px', right: '-2px' }}>
                  <svg 
                    width="6" 
                    height="6" 
                    viewBox="0 0 12 12" 
                    fill="none"
                  >
                    <path 
                      d="M3 4.5L6 7.5L9 4.5" 
                      stroke="#64748B" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && teamMembers.length > 0 && (
              <div 
                className="fixed w-56 rounded-[10px] bg-white py-2 shadow-lg ring-1 ring-black/5 border border-[#E2E8F0]" 
                style={{ 
                  zIndex: 9999,
                  top: `${dropdownPosition.top}px`,
                  ...(dropdownAlignRight ? { right: `${dropdownPosition.right}px` } : { left: `${dropdownPosition.left}px` })
                }}
              >
                <div className="px-3 py-2 border-b border-[#E2E8F0]">
                  <p className="text-xs font-medium text-[#64748B]">Zaduži upit</p>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssign(null)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
                  >
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[#E2E8F0] flex-shrink-0">
                      <span className="text-[10px] font-semibold text-[#64748B]">?</span>
                    </div>
                    <span>Nije dodeljeno</span>
                  </button>
                  {teamMembers.map((member, index) => {
                    const memberIndex = allUserIds.length > 0 ? allUserIds.indexOf(member.id) : index
                    const isAssigned = assignee?.id === member.id
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAssign(member.id)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[#F1F5F9] transition-colors ${
                          isAssigned ? 'bg-[#EFF6FF]' : ''
                        }`}
                      >
                        <div
                          className="flex items-center justify-center h-7 w-7 rounded-full flex-shrink-0"
                          style={{
                            background: getAvatarGradient(memberIndex),
                          }}
                        >
                          <span className="text-[10px] font-semibold text-white">
                            {getInitials(member.full_name || member.email)}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-[#1E293B]">
                            {member.full_name || member.email.split('@')[0]}
                          </p>
                          {member.email && member.full_name && (
                            <p className="text-xs text-[#94A3B8]">{member.email}</p>
                          )}
                        </div>
                        {isAssigned && (
                          <span className="text-xs text-[#3B82F6] font-medium">✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Destination */}
      {lead.destination && (
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="h-3.5 w-3.5 text-[#94A3B8]" />
          <p className="text-xs text-[#64748B] truncate">{lead.destination}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
        {lead.value ? (
          <span className="text-sm font-bold text-[#10B981]">
            €{lead.value.toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-[#94A3B8]">Bez vrednosti</span>
        )}

        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-[#94A3B8]" />
          <span className={`text-xs font-medium ${
            lastContactDays >= 4
              ? 'text-[#EF4444]'
              : lastContactDays >= 3
                ? 'text-[#F59E0B]'
                : 'text-[#64748B]'
          }`}>
            {formatDaysAgo(lastContactDays)}
          </span>
        </div>
      </div>
    </div>
  )
}

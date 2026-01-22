'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MessageCircle,
  Instagram,
  Mail,
  Globe,
  Phone,
  Clock,
  MessageSquare,
  ExternalLink,
  MapPin
} from 'lucide-react'
import type { User } from '@/types'
import type { PipelineCardLead } from '@/hooks/use-pipeline'
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'
import { getInitials, getAvatarGradient } from '@/lib/avatar-utils'

interface PipelineCardV2Props {
  lead: PipelineCardLead
  stageName?: string
  onClick: () => void
  onReply?: (leadId: string) => void
  teamMembers?: User[]
  onAssign?: (leadId: string, userId: string | null) => void
  allUserIds?: string[]
}

// Channel configuration
const CHANNEL_CONFIG = {
  messenger: {
    icon: MessageCircle,
    bgColor: '#e7f3ff',
    iconColor: '#0084ff',
    label: 'Messenger'
  },
  instagram: {
    icon: Instagram,
    bgColor: '#fce7f3',
    iconColor: '#e1306c',
    label: 'Instagram'
  },
  whatsapp: {
    icon: MessageCircle,
    bgColor: '#dcfce7',
    iconColor: '#25d366',
    label: 'WhatsApp'
  },
  email: {
    icon: Mail,
    bgColor: '#fee2e2',
    iconColor: '#ef4444',
    label: 'Email'
  },
  web: {
    icon: Globe,
    bgColor: '#f3e8ff',
    iconColor: '#8b5cf6',
    label: 'Web'
  },
  trak: {
    icon: Globe,
    bgColor: '#dbeafe',
    iconColor: '#3b82f6',
    label: 'Trak'
  },
  phone: {
    icon: Phone,
    bgColor: '#fef3c7',
    iconColor: '#d97706',
    label: 'Telefon'
  }
}

// Waiting time urgency thresholds
const WAITING_THRESHOLDS = {
  critical: 4 * 60, // 4 hours in minutes
  urgent: 2 * 60,   // 2 hours in minutes
  normal: 0
}

// Get destination emoji based on destination name
function getDestinationEmoji(destination: string): string {
  const dest = destination.toLowerCase()
  if (dest.includes('maldiv')) return '🏝️'
  if (dest.includes('tursk') || dest.includes('turkey')) return '🏖️'
  if (dest.includes('egipat') || dest.includes('egypt')) return '🏜️'
  if (dest.includes('grčk') || dest.includes('greece')) return '🏛️'
  if (dest.includes('italij') || dest.includes('italy')) return '🍝'
  if (dest.includes('špan') || dest.includes('spain')) return '🌞'
  if (dest.includes('portugal')) return '🇵🇹'
  if (dest.includes('švajcar') || dest.includes('swiss')) return '🏔️'
  if (dest.includes('austrij') || dest.includes('austria')) return '⛷️'
  if (dest.includes('francusk') || dest.includes('france')) return '🗼'
  if (dest.includes('dubai') || dest.includes('uae')) return '🌆'
  if (dest.includes('tayland') || dest.includes('thailand')) return '🛕'
  if (dest.includes('bali') || dest.includes('indonezij')) return '🌴'
  if (dest.includes('dominikan')) return '🌊'
  if (dest.includes('kub') || dest.includes('cuba')) return '🏖️'
  if (dest.includes('meksik') || dest.includes('mexico')) return '🌮'
  if (dest.includes('zanzibar')) return '🏝️'
  return '✈️'
}

// Format meal plan
function formatMealPlan(mealPlan: string): string {
  const plan = mealPlan.toLowerCase()
  if (plan.includes('all') || plan === 'ai' || plan === 'all_inclusive') return 'AI'
  if (plan.includes('ultra')) return 'Ultra AI'
  if (plan.includes('half') || plan === 'hb') return 'Polupansion'
  if (plan.includes('full') || plan === 'fb') return 'Pun pansion'
  if (plan.includes('breakfast') || plan === 'bb') return 'Doručak'
  if (plan.includes('room') || plan === 'ro') return 'Samo smeštaj'
  return mealPlan
}

export default function PipelineCardV2({
  lead,
  onClick,
  onReply,
  teamMembers = [],
  onAssign,
  allUserIds = []
}: PipelineCardV2Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownAlignRight, setDropdownAlignRight] = useState(true)
  const [isAvatarHovered, setIsAvatarHovered] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Calculate waiting time
  const getWaitingTime = () => {
    if (!lead.last_message_at) return null

    const lastMessageDate = new Date(lead.last_message_at)
    const now = new Date()
    const minutesWaiting = differenceInMinutes(now, lastMessageDate)

    // If lead has been responded to recently (agent's message is newer), don't show waiting
    // This is approximated by checking if has_unread_messages is false
    if (!lead.has_unread_messages && minutesWaiting > 60) {
      return null
    }

    return minutesWaiting
  }

  const waitingMinutes = getWaitingTime()

  const formatWaitingTime = (minutes: number | null) => {
    if (minutes === null) return null

    if (minutes < 60) {
      return `${minutes}m`
    }

    const hours = Math.floor(minutes / 60)
    if (hours < 24) {
      return `${hours}h`
    }

    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  const getWaitingUrgency = (minutes: number | null): 'critical' | 'urgent' | 'normal' | null => {
    if (minutes === null) return null
    if (minutes >= WAITING_THRESHOLDS.critical) return 'critical'
    if (minutes >= WAITING_THRESHOLDS.urgent) return 'urgent'
    return 'normal'
  }

  const waitingUrgency = getWaitingUrgency(waitingMinutes)
  const waitingTimeFormatted = formatWaitingTime(waitingMinutes)

  // Get channel config
  const channel = lead.channel_source || 'web'
  const channelConfig = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.web
  const ChannelIcon = channelConfig.icon

  const assignee = lead.assignee || lead.assigned_user
  const assigneeIndex = assignee?.id && allUserIds.length > 0
    ? allUserIds.indexOf(assignee.id)
    : 0

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)

      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const dropdownWidth = 224
        const spaceOnRight = window.innerWidth - rect.right
        const spaceOnLeft = rect.left

        if (spaceOnRight < dropdownWidth && spaceOnLeft > spaceOnRight) {
          setDropdownAlignRight(false)
          setDropdownPosition({
            top: rect.bottom + 8,
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
    e.stopPropagation()
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

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onReply) {
      onReply(lead.id)
    }
  }

  const waitingBadgeStyles = {
    critical: 'bg-[#fef2f2] text-[#dc2626]',
    urgent: 'bg-[#fff7ed] text-[#ea580c]',
    normal: 'bg-[#f0fdf4] text-[#16a34a]'
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[10px] border border-[#E2E8F0] p-3 shadow-sm hover:shadow-md hover:border-[#cbd5e1] transition-all cursor-pointer group relative"
    >
      {/* Card Header */}
      <div className="flex items-center gap-2.5 mb-2" style={{ paddingRight: '32px' }}>
        {/* Channel Icon with Unread Dot */}
        <div
          className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: channelConfig.bgColor }}
          title={channelConfig.label}
        >
          <ChannelIcon
            className="w-[18px] h-[18px]"
            style={{ color: channelConfig.iconColor }}
          />
          {lead.has_unread_messages && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#3b82f6] rounded-full border-2 border-white" />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-[#1e293b] text-sm truncate transition-colors ${!isAvatarHovered ? 'group-hover:text-[#3b82f6]' : ''}`}>
            {lead.name}
          </h3>
        </div>

        {/* Waiting Badge - with margin-right for avatar space */}
        {waitingUrgency && waitingTimeFormatted && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
              waitingBadgeStyles[waitingUrgency]
            } ${waitingUrgency === 'critical' ? 'animate-pulse' : ''}`}
          >
            <Clock className="w-3.5 h-3.5" />
            {waitingTimeFormatted}
          </div>
        )}
      </div>

      {/* Message Preview */}
      {lead.last_message_preview && (
        <p className="text-[13px] text-[#64748b] leading-[1.45] line-clamp-2 mb-2">
          {lead.last_message_preview}
        </p>
      )}

      {/* Sent Offer Card */}
      {lead.sent_offer && (
        <div className="mb-2 p-2.5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">
              {getDestinationEmoji(lead.sent_offer.destination || lead.sent_offer.package_name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {lead.sent_offer.package_name || lead.sent_offer.destination}
              </p>
              <p className="text-xs text-gray-500">
                {lead.sent_offer.duration_nights && `${lead.sent_offer.duration_nights} noći`}
                {lead.sent_offer.meal_plan && ` • ${formatMealPlan(lead.sent_offer.meal_plan)}`}
              </p>
            </div>
            {lead.sent_offer.price_total && (
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-purple-600">€{lead.sent_offer.price_total.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded Actions (visible on hover) */}
      <div className="max-h-0 overflow-hidden group-hover:max-h-20 group-hover:mt-3 group-hover:pt-3 group-hover:border-t group-hover:border-[#f1f5f9] transition-all duration-200">
        <div className="flex gap-2">
          <button
            onClick={handleReplyClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#3b82f6] text-white rounded-lg text-[13px] font-medium hover:bg-[#2563eb] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Odgovori
          </button>
          <button
            onClick={onClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#f1f5f9] text-[#475569] rounded-lg text-[13px] font-medium hover:bg-[#e2e8f0] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Otvori
          </button>
        </div>
      </div>

      {/* Assignee Avatar (absolute positioned top-right) */}
      <div
        className="absolute top-3 right-3"
        ref={dropdownRef}
        onMouseEnter={() => setIsAvatarHovered(true)}
        onMouseLeave={() => setIsAvatarHovered(false)}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={handleAvatarClick}
          className={`relative flex items-center justify-center h-7 w-7 rounded-full flex-shrink-0 transition-all duration-200 ${
            teamMembers.length > 0 && onAssign
              ? 'hover:ring-2 hover:ring-[#3B82F6] hover:scale-110 hover:shadow-md cursor-pointer'
              : 'cursor-default'
          }`}
          style={{
            background: assignee ? getAvatarGradient(assigneeIndex) : '#E2E8F0',
          }}
          title={assignee?.full_name || assignee?.email || 'Nije dodeljeno'}
        >
          <span className="text-[10px] font-semibold text-white">
            {assignee ? getInitials(assignee.full_name || assignee.email) : '?'}
          </span>
          {teamMembers.length > 0 && onAssign && (
            <div className="absolute w-3 h-3 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center" style={{ bottom: '-1px', right: '-1px' }}>
              <svg width="5" height="5" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                      style={{ background: getAvatarGradient(memberIndex) }}
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
  )
}

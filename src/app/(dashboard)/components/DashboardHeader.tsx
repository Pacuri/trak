'use client'

import { useState, useEffect, useRef } from 'react'
import { User, LogOut, Search, Bell, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface DashboardHeaderProps {
  user: SupabaseUser
  title?: string
  subtitle?: string
}

export default function DashboardHeader({ user, title, subtitle }: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white">
      <div className="flex h-full items-center justify-between px-8">
        {/* Left side - Empty per spec */}
        <div></div>

        {/* Right side - Search, Notifications, User */}
        <div className="flex items-center gap-4">
          {/* Search Box */}
          <div className="relative hidden md:flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[10px] px-4 h-10 w-[280px]">
            <Search className="h-[18px] w-[18px] text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pretraži upite..."
              className="flex-1 bg-transparent border-0 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none"
            />
          </div>

          {/* Notification Bell */}
          <button className="relative w-10 h-10 rounded-[10px] border border-[#E2E8F0] bg-transparent flex items-center justify-center hover:bg-[#F1F5F9] transition-colors">
            <Bell className="h-5 w-5 text-[#64748B]" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#EF4444]"></span>
          </button>

          {/* User Avatar */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-sm font-semibold text-white cursor-pointer"
            >
              {getInitials(user.email || '')}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-[14px] bg-white py-2 shadow-lg ring-1 ring-black/5 border border-[#E2E8F0] z-50">
                <div className="px-4 py-3 border-b border-[#E2E8F0]">
                  <p className="text-sm font-medium text-[#1E293B]">
                    {user.email?.split('@')[0] || 'Korisnik'}
                  </p>
                  <p className="text-xs text-[#94A3B8] truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push('/dashboard/settings')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
                  >
                    <User className="h-4 w-4 text-[#64748B]" />
                    Moj profil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Odjavi se
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

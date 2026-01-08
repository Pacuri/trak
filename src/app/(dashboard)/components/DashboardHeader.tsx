'use client'

import { useState, useEffect, useRef } from 'react'
import { User, LogOut, Search, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface DashboardHeaderProps {
  user: SupabaseUser
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
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
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Spacer for mobile menu button - will be hidden on larger screens */}
          <div className="w-10 lg:hidden" />

          {/* Search Box */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-64 rounded-[10px] border-0 bg-gray-100 pl-10 pr-4 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button className="relative rounded-[10px] p-2 text-[#64748B] hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EF4444]"></span>
          </button>

          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 rounded-[10px] px-2 py-1.5 hover:bg-gray-100 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-semibold text-white">
                {getInitials(user.email || '')}
              </div>
              <span className="hidden text-sm text-[#1E293B] md:block">{user.email}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-[10px] bg-white py-1 shadow-md ring-1 ring-black ring-opacity-5 border border-[#E2E8F0]">
                <div className="px-4 py-2 text-sm text-[#94A3B8] border-b border-[#E2E8F0]">
                  {user.email}
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    // Profile functionality can be added later
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-[#1E293B] hover:bg-gray-50"
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-[#1E293B] hover:bg-gray-50"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GitBranch,
  BarChart3,
  Settings,
  X,
  Menu,
  Plug,
} from 'lucide-react'

const mainNavigation = [
  { name: 'Početna', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upiti', href: '/dashboard/leads', icon: Users, badge: true },
  { name: 'Pipeline', href: '/dashboard/pipeline', icon: GitBranch },
  { name: 'Izveštaji', href: '/dashboard/analytics', icon: BarChart3 },
]

const settingsNavigation = [
  { name: 'Podešavanja', href: '/dashboard/settings', icon: Settings },
  { name: 'Integracije', href: '/dashboard/integrations', icon: Plug },
]

interface DashboardSidebarProps {
  leadsCount?: number
}

export default function DashboardSidebar({ leadsCount = 0 }: DashboardSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const NavItem = ({ item }: { item: typeof mainNavigation[0] }) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    const Icon = item.icon
    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-[#3B82F6] text-white shadow-md'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center">
          <Icon className="mr-3 h-5 w-5" />
          {item.name}
        </div>
        {item.badge && leadsCount > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F97316] px-1.5 text-xs font-semibold text-white">
            {leadsCount > 99 ? '99+' : leadsCount}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#1E293B] shadow-lg transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]">
                <span className="text-lg font-bold text-white">T</span>
              </div>
              <h1 className="text-xl font-bold text-white">Trak</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/70 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {/* Main Section */}
            <div className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Glavni meni
              </p>
              <div className="space-y-1">
                {mainNavigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Podešavanja
              </p>
              <div className="space-y-1">
                {settingsNavigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 p-4">
            <p className="text-xs text-white/40 text-center">
              Trak CRM v1.0
            </p>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-[10px] bg-white p-2 text-[#64748B] shadow-md hover:bg-gray-50 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  X,
  Menu,
  Plug,
  CalendarCheck,
  PlaneTakeoff,
  Package,
  Inbox,
  GitPullRequestDraft,
} from 'lucide-react'

// Navigation item type
interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
  primary?: boolean
  badge?: boolean
}

// Primary navigation (standalone items)
const primaryNavigation: NavItem[] = [
  { name: 'Početna', href: '/dashboard', icon: LayoutDashboard, primary: true },
  { name: 'Paketi', href: '/dashboard/packages', icon: Package },
]

// Prodaja (Sales) Section
const prodajaNavigation: NavItem[] = [
  { name: 'Novi upiti', href: '/dashboard/inquiries', icon: Inbox },
  { name: 'U obradi', href: '/dashboard/pipeline', icon: GitPullRequestDraft, badge: true },
  { name: 'Klijenti', href: '/dashboard/leads', icon: Users },
]

// Booking Section
const bookingNavigation = [
  { name: 'Rezervacije', href: '/dashboard/reservations', icon: CalendarCheck },
  { name: 'Polasci', href: '/dashboard/trips', icon: PlaneTakeoff },
]

// Uvid (Insights) Section
const uvidNavigation = [
  { name: 'Analitika', href: '/dashboard/analytics', icon: BarChart3 },
]

// Settings Section
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

  const NavItemComponent = ({ item, prominent = false }: { item: NavItem; prominent?: boolean }) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    const Icon = item.icon

    // Prominent style (Početna) - larger, white text, blue outline when active
    if (prominent) {
      return (
        <Link
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center px-3 py-2.5 rounded-[10px] transition-all text-[15px] font-semibold ${
            isActive
              ? 'bg-[#3B82F6] text-white shadow-md'
              : 'text-white/90 hover:text-white hover:bg-white/5'
          }`}
        >
          <Icon className="mr-3 h-5 w-5" />
          {item.name}
        </Link>
      )
    }

    // Regular nav items
    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-[#3B82F6] text-white shadow-md'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
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
              <img
                src="/trak-logo.png"
                alt="trak"
                width={36}
                height={36}
                className="rounded-[8px]"
              />
              <h1 className="text-xl font-bold text-white">trak</h1>
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
            {/* Primary Items (Početna, Paketi) */}
            <div className="mb-6 space-y-1">
              {primaryNavigation.map((item) => (
                <NavItemComponent key={item.name} item={item} prominent={item.primary} />
              ))}
            </div>

            {/* Prodaja Section */}
            <div className="mb-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Prodaja
              </p>
              <div className="space-y-1">
                {prodajaNavigation.map((item) => (
                  <NavItemComponent key={item.name} item={item} />
                ))}
              </div>
            </div>

            {/* Booking Section */}
            <div className="mb-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Booking
              </p>
              <div className="space-y-1">
                {bookingNavigation.map((item) => (
                  <NavItemComponent key={item.name} item={item} />
                ))}
              </div>
            </div>

            {/* Uvid Section */}
            <div className="mb-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Uvid
              </p>
              <div className="space-y-1">
                {uvidNavigation.map((item) => (
                  <NavItemComponent key={item.name} item={item} />
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
                  <NavItemComponent key={item.name} item={item} />
                ))}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 p-4">
            <p className="text-xs text-white/40 text-center">
              trak CRM v1.0
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

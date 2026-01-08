import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from './components/DashboardSidebar'
import DashboardHeader from './components/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        <DashboardHeader user={user} />
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from './components/DashboardSidebar'
import DashboardHeader from './components/DashboardHeader'
import { DashboardProviders } from '@/components/providers/DashboardProviders'

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

  // Get user's organization to fetch leads count
  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  let leadsCount = 0
  if (userRecord?.organization_id) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userRecord.organization_id)
    leadsCount = count || 0
  }

  return (
    <DashboardProviders>
      <div className="flex h-screen bg-[#FAFAFA]">
        <DashboardSidebar leadsCount={leadsCount} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader user={user} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#FAFAFA] p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardProviders>
  )
}

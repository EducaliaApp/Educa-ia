import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/supabase/profiles'
import type { Profile } from '@/lib/supabase/types'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import { getRoadmapCategoryFlags } from '@/flags'

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

  let profile: Profile | null = null

  try {
    profile = await ensureProfileForUser(user)
  } catch (error) {
    console.error('Failed to load profile for dashboard layout', error)
    await supabase.auth.signOut()
    redirect('/onboarding?status=profile-error')
  }

  if (!profile) {
    await supabase.auth.signOut()
    redirect('/onboarding?status=profile-error')
  }

  const resolvedProfile = profile as Profile
  const roadmapFlags = await getRoadmapCategoryFlags()

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 lg:w-72">
          <Sidebar profile={resolvedProfile} flags={roadmapFlags} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}

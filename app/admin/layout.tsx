import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUserAdmin } from '@/lib/supabase/admin'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { Breadcrumbs } from '@/components/admin/Breadcrumbs'

export const metadata = {
  title: 'Panel Admin - ProfeFlow',
  description: 'Panel de administración de ProfeFlow',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin using service role to bypass RLS
  try {
    const userIsAdmin = await isUserAdmin(user.id)
    
    if (!userIsAdmin) {
      console.warn('[ADMIN LAYOUT] Access denied - insufficient permissions')
      redirect('/dashboard')
    }
  } catch (error) {
    console.error('[ADMIN LAYOUT] Error checking admin role:', error)
    redirect('/dashboard')
  }

  // Get profile information for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, email')
    .eq('id', user.id)
    .single()

  const userName = profile?.nombre || 'Usuario'
  const userEmail = profile?.email || user.email || ''

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUserAdmin } from '@/lib/supabase/admin'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { Breadcrumbs } from '@/components/admin/Breadcrumbs'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'

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
    <AdminLayoutClient userName={userName} userEmail={userEmail}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 bg-slate-900 border-r border-slate-800 min-h-screen flex-shrink-0">
        <AdminSidebar userName={userName} userEmail={userEmail} />
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </AdminLayoutClient>
  )
}

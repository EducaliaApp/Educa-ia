import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nombre, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <AdminSidebar userName={profile.nombre} userEmail={profile.email} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  )
}

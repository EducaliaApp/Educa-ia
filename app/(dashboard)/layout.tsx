import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'

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

  // Obtener perfil del usuario
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    await supabase.auth.signOut()
    redirect('/onboarding?status=profile-error')
  }

  if (!profile) {
    const primaryEmail =
      typeof user.email === 'string' && user.email.length > 0 ? user.email : null
    const metadataEmail =
      typeof user.user_metadata?.email === 'string'
        ? user.user_metadata.email
        : null

    const metadata = user.user_metadata ?? {}
    const nombre = typeof metadata.nombre === 'string' ? metadata.nombre : null
    const asignatura = typeof metadata.asignatura === 'string' ? metadata.asignatura : null
    const nivel = typeof metadata.nivel === 'string' ? metadata.nivel : null

    const profilePayload = {
      id: user.id,
      email: primaryEmail ?? metadataEmail,
      nombre: nombre ?? undefined,
      asignatura: asignatura ?? undefined,
      nivel: nivel ?? undefined,
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert([profilePayload], { onConflict: 'id' })

    if (upsertError) {
      await supabase.auth.signOut()
      redirect('/onboarding?status=profile-error')
    }

    await supabase.auth.signOut()
    redirect('/onboarding?status=profile-created')
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 lg:w-72">
          <Sidebar profile={profile} />
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

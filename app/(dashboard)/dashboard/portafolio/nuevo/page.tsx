// app/(dashboard)/dashboard/portafolio/nuevo/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortafolioForm } from '@/components/portafolio/PortafolioForm'

export const dynamic = 'force-dynamic'

export default async function NuevoPortafolioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Portafolio</h1>
        <p className="text-gray-600 mt-2">
          Completa la información para crear tu portafolio docente {new Date().getFullYear()}
        </p>
      </div>

      <PortafolioForm />
    </div>
  )
}

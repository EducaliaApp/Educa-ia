// app/(dashboard)/dashboard/portafolio/nuevo/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'

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
          Completa la información para crear tu portafolio docente
        </p>
      </div>

      <Card>
        <div className="p-6">
          <p className="text-gray-600">
            El formulario de creación de portafolio será implementado en la siguiente fase.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Este formulario permitirá seleccionar:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
            <li>Año de evaluación</li>
            <li>Asignatura</li>
            <li>Nivel educativo</li>
            <li>Modalidad</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

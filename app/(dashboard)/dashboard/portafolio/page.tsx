// app/(dashboard)/dashboard/portafolio/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { PortafolioCard } from '@/components/portafolio/PortafolioCard'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PortafoliosPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener portafolios del usuario
  const { data: portafolios, error } = await supabase
    .from('portafolios')
    .select('*')
    .eq('profesor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error al cargar portafolios:', error)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Portafolios</h1>
          <p className="text-gray-600 mt-2">
            Gestiona tus portafolios docentes para la evaluación
          </p>
        </div>
        <Link href="/dashboard/portafolio/nuevo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Portafolio
          </Button>
        </Link>
      </div>

      {/* Portafolios Grid */}
      {!portafolios || portafolios.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes portafolios aún
            </h3>
            <p className="text-gray-600 mb-4">
              Crea tu primer portafolio docente para comenzar tu evaluación
            </p>
            <Link href="/dashboard/portafolio/nuevo">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Primer Portafolio
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portafolios.map((portafolio) => (
            <PortafolioCard
              key={portafolio.id}
              id={portafolio.id}
              año_evaluacion={portafolio.año_evaluacion}
              asignatura={portafolio.asignatura}
              nivel_educativo={portafolio.nivel_educativo}
              estado={portafolio.estado}
              progreso_porcentaje={portafolio.progreso_porcentaje}
              puntaje_estimado_ia={portafolio.puntaje_estimado_ia}
              categoria_logro={portafolio.categoria_logro}
              created_at={portafolio.created_at}
            />
          ))}
        </div>
      )}
    </div>
  )
}

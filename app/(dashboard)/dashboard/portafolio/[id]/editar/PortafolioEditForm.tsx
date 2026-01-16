// app/(dashboard)/dashboard/portafolio/[id]/editar/PortafolioEditForm.tsx
'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { PortafolioForm } from '@/components/portafolio/PortafolioForm'
import { ArrowLeft } from 'lucide-react'

interface PortafolioEditFormProps {
  portafolio: {
    id: string
    año_evaluacion: number
    asignatura: string
    nivel_educativo: string
    modalidad: string
    curso_aplicacion?: string
    numero_estudiantes?: number
  }
}

export function PortafolioEditForm({ portafolio }: PortafolioEditFormProps) {
  const router = useRouter()

  const handleSuccess = (portafolioId: string) => {
    router.push(`/dashboard/portafolio/${portafolioId}`)
    router.refresh()
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/dashboard/portafolio/${portafolio.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Portafolio
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Portafolio</CardTitle>
        </CardHeader>
        <CardContent>
          <PortafolioForm
            initialValues={{
              año_evaluacion: portafolio.año_evaluacion,
              asignatura: portafolio.asignatura,
              nivel_educativo: portafolio.nivel_educativo,
              modalidad: portafolio.modalidad,
              curso_aplicacion: portafolio.curso_aplicacion,
              numero_estudiantes: portafolio.numero_estudiantes,
            }}
            portafolioId={portafolio.id}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  )
}

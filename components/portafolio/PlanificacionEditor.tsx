// components/portafolio/PlanificacionEditor.tsx
// TODO: Implementar componente completo en FASE 3

'use client'

import { Card } from '@/components/ui/Card'

interface PlanificacionEditorProps {
  tareaId: string
  contenidoInicial?: any
  onSave?: (data: any) => Promise<void>
}

export function PlanificacionEditor({ tareaId, contenidoInicial, onSave }: PlanificacionEditorProps) {
  return (
    <div className="p-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Planificación de Unidad Pedagógica</h2>
          <p className="text-gray-600 mb-4">
            Este componente está en desarrollo y será completado en la siguiente fase.
          </p>
          <p className="text-sm text-gray-500">
            Tarea ID: {tareaId}
          </p>
        </div>
      </Card>
    </div>
  )
}

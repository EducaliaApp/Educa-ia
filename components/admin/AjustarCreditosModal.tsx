'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface AjustarCreditosModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  currentCreditos: {
    planificaciones: number
    evaluaciones: number
    usados_planificaciones: number
    usados_evaluaciones: number
  }
  onSuccess: () => void
}

export function AjustarCreditosModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentCreditos,
  onSuccess,
}: AjustarCreditosModalProps) {
  const [creditosPlanificaciones, setCreditosPlanificaciones] = useState(
    currentCreditos.planificaciones.toString()
  )
  const [creditosEvaluaciones, setCreditosEvaluaciones] = useState(
    currentCreditos.evaluaciones.toString()
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const newCreditosPlan = parseInt(creditosPlanificaciones)
      const newCreditosEval = parseInt(creditosEvaluaciones)

      if (isNaN(newCreditosPlan) || isNaN(newCreditosEval)) {
        setError('Los créditos deben ser números válidos')
        setIsSubmitting(false)
        return
      }

      if (newCreditosPlan < 0 || newCreditosEval < 0) {
        setError('Los créditos no pueden ser negativos')
        setIsSubmitting(false)
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          creditos_planificaciones: newCreditosPlan,
          creditos_evaluaciones: newCreditosEval,
        })
        .eq('id', userId)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error updating credits:', err)
      setError('Error al actualizar los créditos. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustar Créditos" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-slate-600 mb-4">
            Ajustar créditos para: <strong className="text-slate-900">{userName}</strong>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Current Credits Display */}
          <div className="col-span-2 bg-slate-100 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm">Créditos Actuales</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Planificaciones</p>
                <p className="font-medium text-slate-900">
                  {currentCreditos.usados_planificaciones}/{currentCreditos.planificaciones}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Evaluaciones</p>
                <p className="font-medium text-slate-900">
                  {currentCreditos.usados_evaluaciones}/{currentCreditos.evaluaciones}
                </p>
              </div>
            </div>
          </div>

          {/* New Credits Input */}
          <div>
            <label htmlFor="creditosPlanificaciones" className="block text-sm font-medium text-slate-700 mb-1">
              Nuevos Créditos Planificaciones
            </label>
            <Input
              id="creditosPlanificaciones"
              type="number"
              min="0"
              value={creditosPlanificaciones}
              onChange={(e) => setCreditosPlanificaciones(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="creditosEvaluaciones" className="block text-sm font-medium text-slate-700 mb-1">
              Nuevos Créditos Evaluaciones
            </label>
            <Input
              id="creditosEvaluaciones"
              type="number"
              min="0"
              value={creditosEvaluaciones}
              onChange={(e) => setCreditosEvaluaciones(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            <strong>Nota:</strong> Esta acción ajustará el límite de créditos del usuario. Los créditos usados no se modificarán.
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

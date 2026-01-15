'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UNLIMITED_CREDITS, formatCredits } from '@/lib/constants/plans'
import type { Plan, PlanLimite } from '@/lib/supabase/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface PlanConLimites extends Plan {
  limites?: PlanLimite
}

export default function PlanesPage() {
  const [planes, setPlanes] = useState<PlanConLimites[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanConLimites | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    precio_mensual_clp: 0,
    activo: true,
    caracteristicas: [] as string[],
    creditos_planificaciones: 0,
    creditos_evaluaciones: 0,
    analisis_portafolio: false,
    exportar_pdf: false,
    soporte_prioritario: false,
  })
  const [nuevaCaracteristica, setNuevaCaracteristica] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchPlanes()
  }, [])

  const fetchPlanes = async () => {
    setIsLoading(true)
    try {
      const { data: planesData, error: planesError } = await supabase
        .from('planes')
        .select('*')
        .order('codigo', { ascending: true })

      if (planesError) throw planesError

      const { data: limitesData, error: limitesError } = await supabase
        .from('planes_limites')
        .select('*')

      if (limitesError) throw limitesError

      const planesConLimites = planesData?.map(plan => ({
        ...plan,
        limites: limitesData?.find(l => l.plan_id === plan.id),
      })) || []

      setPlanes(planesConLimites)
    } catch (error) {
      console.error('Error fetching planes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (plan?: PlanConLimites) => {
    if (plan) {
      setEditingPlan(plan)
      setFormData({
        nombre: plan.nombre,
        codigo: plan.codigo,
        descripcion: plan.descripcion || '',
        precio_mensual_clp: plan.precio_mensual_clp,
        activo: plan.activo,
        caracteristicas: Array.isArray(plan.caracteristicas) ? plan.caracteristicas as string[] : [],
        creditos_planificaciones: plan.limites?.creditos_planificaciones || 0,
        creditos_evaluaciones: plan.limites?.creditos_evaluaciones || 0,
        analisis_portafolio: plan.limites?.analisis_portafolio || false,
        exportar_pdf: plan.limites?.exportar_pdf || false,
        soporte_prioritario: plan.limites?.soporte_prioritario || false,
      })
    } else {
      setEditingPlan(null)
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        precio_mensual_clp: 0,
        activo: true,
        caracteristicas: [],
        creditos_planificaciones: 0,
        creditos_evaluaciones: 0,
        analisis_portafolio: false,
        exportar_pdf: false,
        soporte_prioritario: false,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPlan(null)
    setNuevaCaracteristica('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingPlan) {
        // Actualizar plan existente
        const { error: planError } = await supabase
          .from('planes')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio_mensual_clp: formData.precio_mensual_clp,
            activo: formData.activo,
            caracteristicas: formData.caracteristicas,
          })
          .eq('id', editingPlan.id)

        if (planError) throw planError

        // Actualizar límites
        if (editingPlan.limites) {
          const { error: limitesError } = await supabase
            .from('planes_limites')
            .update({
              creditos_planificaciones: formData.creditos_planificaciones,
              creditos_evaluaciones: formData.creditos_evaluaciones,
              analisis_portafolio: formData.analisis_portafolio,
              exportar_pdf: formData.exportar_pdf,
              soporte_prioritario: formData.soporte_prioritario,
            })
            .eq('plan_id', editingPlan.id)

          if (limitesError) throw limitesError
        }
      } else {
        // Crear nuevo plan
        const { data: newPlan, error: planError } = await supabase
          .from('planes')
          .insert({
            nombre: formData.nombre,
            codigo: formData.codigo,
            descripcion: formData.descripcion,
            precio_mensual_clp: formData.precio_mensual_clp,
            activo: formData.activo,
            caracteristicas: formData.caracteristicas,
          })
          .select()
          .single()

        if (planError) throw planError

        // Crear límites para el nuevo plan
        const { error: limitesError } = await supabase
          .from('planes_limites')
          .insert({
            plan_id: newPlan.id,
            creditos_planificaciones: formData.creditos_planificaciones,
            creditos_evaluaciones: formData.creditos_evaluaciones,
            analisis_portafolio: formData.analisis_portafolio,
            exportar_pdf: formData.exportar_pdf,
            soporte_prioritario: formData.soporte_prioritario,
          })

        if (limitesError) throw limitesError
      }

      await fetchPlanes()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving plan:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Error al guardar el plan: ${errorMessage}`)
    }
  }

  const handleDelete = async (planId: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return

    try {
      const { error } = await supabase
        .from('planes')
        .delete()
        .eq('id', planId)

      if (error) throw error

      await fetchPlanes()
    } catch (error) {
      console.error('Error deleting plan:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Error al eliminar el plan: ${errorMessage}`)
    }
  }

  const toggleActivo = async (plan: PlanConLimites) => {
    try {
      const { error } = await supabase
        .from('planes')
        .update({ activo: !plan.activo })
        .eq('id', plan.id)

      if (error) throw error

      await fetchPlanes()
    } catch (error) {
      console.error('Error toggling plan:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Error al cambiar estado del plan: ${errorMessage}`)
    }
  }

  const agregarCaracteristica = () => {
    if (nuevaCaracteristica.trim()) {
      setFormData({
        ...formData,
        caracteristicas: [...formData.caracteristicas, nuevaCaracteristica.trim()],
      })
      setNuevaCaracteristica('')
    }
  }

  const eliminarCaracteristica = (index: number) => {
    setFormData({
      ...formData,
      caracteristicas: formData.caracteristicas.filter((_, i) => i !== index),
    })
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/4"></div>
            <div className="h-64 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Planes</h1>
            <p className="text-slate-400">Administra los planes y precios del sistema</p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Plan
          </Button>
        </div>

        {/* Planes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planes.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'bg-slate-800 rounded-lg border p-6',
                plan.activo ? 'border-slate-700' : 'border-slate-600 opacity-60'
              )}
            >
              {/* Plan Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.nombre}</h3>
                  <p className="text-sm text-slate-400">{plan.codigo}</p>
                </div>
                <div className="flex gap-2">
                  {plan.activo ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* Precio */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-blue-400">
                  {plan.precio_mensual_clp === 0
                    ? 'Gratis'
                    : `$${plan.precio_mensual_clp.toLocaleString('es-CL')}`}
                </div>
                <p className="text-sm text-slate-400">por mes</p>
              </div>

              {/* Descripción */}
              {plan.descripcion && (
                <p className="text-sm text-slate-300 mb-4">{plan.descripcion}</p>
              )}

              {/* Límites */}
              {plan.limites && (
                <div className="mb-4 p-3 bg-slate-900 rounded-lg">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">LÍMITES</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>Planificaciones:</span>
                      <span className="font-semibold">
                        {formatCredits(plan.limites.creditos_planificaciones)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Evaluaciones:</span>
                      <span className="font-semibold">
                        {formatCredits(plan.limites.creditos_evaluaciones)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Características */}
              {Array.isArray(plan.caracteristicas) && plan.caracteristicas.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">CARACTERÍSTICAS</h4>
                  <ul className="space-y-1">
                    {(plan.caracteristicas as string[]).slice(0, 3).map((caracteristica, index) => (
                      <li key={index} className="text-sm text-slate-300 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{caracteristica}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleOpenModal(plan)}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => toggleActivo(plan)}
                  className={cn(
                    'px-3 py-2 rounded-lg transition-colors text-sm',
                    plan.activo
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                >
                  {plan.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Información básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nombre del Plan
                      </label>
                      <Input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Código
                      </label>
                      <Input
                        type="text"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        disabled={!!editingPlan}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Precio Mensual (CLP)
                      </label>
                      <Input
                        type="number"
                        value={formData.precio_mensual_clp}
                        onChange={(e) =>
                          setFormData({ ...formData, precio_mensual_clp: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                        required
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.activo}
                          onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                          className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-300">Plan Activo</span>
                      </label>
                    </div>
                  </div>

                  {/* Límites */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Límites y Permisos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Créditos Planificaciones
                        </label>
                        <Input
                          type="number"
                          value={formData.creditos_planificaciones}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              creditos_planificaciones: parseInt(e.target.value) || 0,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Créditos Evaluaciones
                        </label>
                        <Input
                          type="number"
                          value={formData.creditos_evaluaciones}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              creditos_evaluaciones: parseInt(e.target.value) || 0,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.analisis_portafolio}
                          onChange={(e) =>
                            setFormData({ ...formData, analisis_portafolio: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-300">Análisis de Portafolio</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.exportar_pdf}
                          onChange={(e) =>
                            setFormData({ ...formData, exportar_pdf: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-300">Exportar PDF sin marca</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.soporte_prioritario}
                          onChange={(e) =>
                            setFormData({ ...formData, soporte_prioritario: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-300">Soporte Prioritario</span>
                      </label>
                    </div>
                  </div>

                  {/* Características */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Características</h3>
                    <div className="flex gap-2 mb-3">
                      <Input
                        type="text"
                        value={nuevaCaracteristica}
                        onChange={(e) => setNuevaCaracteristica(e.target.value)}
                        placeholder="Nueva característica..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            agregarCaracteristica()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={agregarCaracteristica}
                        className="whitespace-nowrap"
                      >
                        Agregar
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {formData.caracteristicas.map((caracteristica, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between bg-slate-900 p-2 rounded"
                        >
                          <span className="text-sm text-slate-300">{caracteristica}</span>
                          <button
                            type="button"
                            onClick={() => eliminarCaracteristica(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={handleCloseModal}
                      className="bg-slate-700 hover:bg-slate-600"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

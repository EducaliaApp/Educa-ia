'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { X } from 'lucide-react'
import type { Plan, Role } from '@/lib/supabase/types'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentData: {
    nombre: string
    email: string
    plan: string
    role: string
    asignatura?: string
    nivel?: string
  }
  onSuccess: () => void
}

export function EditUserModal({
  isOpen,
  onClose,
  userId,
  currentData,
  onSuccess,
}: EditUserModalProps) {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: currentData.nombre,
    email: currentData.email,
    plan: currentData.plan,
    role: currentData.role,
    asignatura: currentData.asignatura || '',
    nivel: currentData.nivel || '',
  })

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchPlanesYRoles()
      setFormData({
        nombre: currentData.nombre,
        email: currentData.email,
        plan: currentData.plan,
        role: currentData.role,
        asignatura: currentData.asignatura || '',
        nivel: currentData.nivel || '',
      })
    }
  }, [isOpen, currentData])

  const fetchPlanesYRoles = async () => {
    try {
      const { data: planesData } = await supabase
        .from('planes')
        .select('*')
        .eq('activo', true)
        .order('precio_mensual_clp', { ascending: true })

      const { data: rolesData } = await supabase
        .from('roles')
        .select('*')
        .eq('activo', true)
        .order('codigo', { ascending: true })

      setPlanes(planesData || [])
      setRoles(rolesData || [])
    } catch (error) {
      console.error('Error fetching planes y roles:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Si cambió el plan, usar la función que actualiza créditos automáticamente
      if (formData.plan !== currentData.plan) {
        const { error: planError } = await supabase.rpc('actualizar_plan_usuario', {
          usuario_id: userId,
          nuevo_plan_codigo: formData.plan,
        })

        if (planError) throw planError
      }

      // Actualizar otros campos del perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nombre: formData.nombre,
          email: formData.email,
          role: formData.role,
          asignatura: formData.asignatura,
          nivel: formData.nivel,
        })
        .eq('id', userId)

      if (profileError) throw profileError

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Error al actualizar usuario: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Editar Usuario</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información básica */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre
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
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Plan y Role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Plan
                </label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {planes.map((plan) => (
                    <option key={plan.id} value={plan.codigo}>
                      {plan.nombre} - ${plan.precio_mensual_clp.toLocaleString('es-CL')}
                    </option>
                  ))}
                </select>
                {formData.plan !== currentData.plan && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Los créditos se ajustarán automáticamente según el nuevo plan
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.codigo}>
                      {role.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asignatura y Nivel */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Asignatura
                </label>
                <Input
                  type="text"
                  value={formData.asignatura}
                  onChange={(e) => setFormData({ ...formData, asignatura: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nivel
                </label>
                <Input
                  type="text"
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                className="bg-slate-700 hover:bg-slate-600"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

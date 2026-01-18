'use client'

import { useState, useEffect, useCallback } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { X } from 'lucide-react'
import type { Plan, Role } from '@/lib/supabase/types'

interface EditUserModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly userId: string
  readonly currentData: {
    readonly nombre: string
    readonly email: string
    readonly plan: string
    readonly role: string
    readonly asignatura?: string
    readonly nivel?: string
  }
  readonly onSuccess: () => void
}

export function EditUserModal({
  isOpen,
  onClose,
  userId,
  currentData,
  onSuccess,
}: Readonly<EditUserModalProps>) {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: currentData.nombre,
    email: currentData.email,
    plan: currentData.plan,
    roleId: '', // Will be populated after roles are loaded based on currentData.role
    asignatura: currentData.asignatura || '',
    nivel: currentData.nivel || '',
  })

  const fetchPlanesYRoles = useCallback(async () => {
    try {
      const [planesRes, rolesRes] = await Promise.all([
        fetch('/api/admin/planes'),
        fetch('/api/admin/roles'),
      ])

      if (planesRes.ok) {
        const planesData = await planesRes.json()
        setPlanes((planesData.planes || []).filter((p: Plan) => p.activo))
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        const activeRoles = (rolesData.roles || []).filter((r: Role) => r.activo)
        setRoles(activeRoles)
        // Find and set current role
        const currentRole = activeRoles.find((r: Role) => r.codigo === currentData.role)
        if (currentRole) {
          setFormData(prev => ({ ...prev, roleId: currentRole.id }))
        }
      }
    } catch (error) {
      console.error('Error fetching planes y roles:', error)
    }
  }, [currentData.role])

  useEffect(() => {
    if (isOpen) {
      fetchPlanesYRoles()
      setFormData({
        nombre: currentData.nombre,
        email: currentData.email,
        plan: currentData.plan,
        roleId: '', // Will be set in fetchPlanesYRoles after roles are loaded
        asignatura: currentData.asignatura || '',
        nivel: currentData.nivel || '',
      })
    }
  }, [isOpen, currentData, fetchPlanesYRoles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: {
            nombre: formData.nombre,
            email: formData.email,
            roleId: formData.roleId,
            asignatura: formData.asignatura,
            nivel: formData.nivel,
            ...(formData.plan !== currentData.plan && { plan: formData.plan }),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar usuario')
      }

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
                <label htmlFor="edit-user-nombre" className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre
                </label>
                <Input
                  id="edit-user-nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-user-email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <Input
                  id="edit-user-email"
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
                <label htmlFor="edit-user-plan" className="block text-sm font-medium text-slate-300 mb-2">
                  Plan
                </label>
                <select
                  id="edit-user-plan"
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
                <label htmlFor="edit-user-role" className="block text-sm font-medium text-slate-300 mb-2">
                  Rol
                </label>
                <select
                  id="edit-user-role"
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asignatura y Nivel */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-user-asignatura" className="block text-sm font-medium text-slate-300 mb-2">
                  Asignatura
                </label>
                <Input
                  id="edit-user-asignatura"
                  type="text"
                  value={formData.asignatura}
                  onChange={(e) => setFormData({ ...formData, asignatura: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="edit-user-nivel" className="block text-sm font-medium text-slate-300 mb-2">
                  Nivel
                </label>
                <Input
                  id="edit-user-nivel"
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

'use client'

import { useState, useEffect } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { X } from 'lucide-react'
import type { Plan, Role } from '@/lib/supabase/types'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
}: Readonly<CreateUserModalProps>) {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    asignatura: '',
    nivel: '',
    plan: 'free',
    roleId: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchPlanesYRoles()
      // Reset form
      setFormData({
        email: '',
        password: '',
        nombre: '',
        asignatura: '',
        nivel: '',
        plan: 'free',
        roleId: '',
      })
      setError(null)
    }
  }, [isOpen])

  const fetchPlanesYRoles = async () => {
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
        // Set default role to 'user' if available
        const userRole = activeRoles.find((r: Role) => r.codigo === 'user')
        if (userRole) {
          setFormData(prev => ({ ...prev, roleId: userRole.id }))
        }
      }
    } catch (error) {
      console.error('Error fetching planes y roles:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
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
            <h2 className="text-2xl font-bold text-white">Crear Nuevo Usuario</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email y Password */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email *
                </label>
                <Input
                  id="user-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="usuario@ejemplo.cl"
                />
              </div>
              <div>
                <label htmlFor="user-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Contraseña *
                </label>
                <Input
                  id="user-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label htmlFor="user-nombre" className="block text-sm font-medium text-slate-300 mb-2">
                Nombre Completo
              </label>
              <Input
                id="user-nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del usuario"
              />
            </div>

            {/* Plan y Role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-plan" className="block text-sm font-medium text-slate-300 mb-2">
                  Plan *
                </label>
                <select
                  id="user-plan"
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
              </div>
              <div>
                <label htmlFor="user-role" className="block text-sm font-medium text-slate-300 mb-2">
                  Rol *
                </label>
                <select
                  id="user-role"
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
                <label htmlFor="user-asignatura" className="block text-sm font-medium text-slate-300 mb-2">
                  Asignatura
                </label>
                <Input
                  id="user-asignatura"
                  type="text"
                  value={formData.asignatura}
                  onChange={(e) => setFormData({ ...formData, asignatura: e.target.value })}
                  placeholder="Ej: Matemáticas"
                />
              </div>
              <div>
                <label htmlFor="user-nivel" className="block text-sm font-medium text-slate-300 mb-2">
                  Nivel
                </label>
                <Input
                  id="user-nivel"
                  type="text"
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                  placeholder="Ej: 8° Básico"
                />
              </div>
            </div>

            <div className="text-sm text-slate-400 bg-slate-900 p-3 rounded-lg">
              <strong>Nota:</strong> Se creará automáticamente un perfil asociado al usuario con el rol y plan seleccionados.
              Los créditos se asignarán según el plan elegido.
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
                {isLoading ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

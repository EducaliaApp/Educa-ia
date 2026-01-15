'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/supabase/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    permisos: [] as string[],
    activo: true,
  })
  const [nuevoPermiso, setNuevoPermiso] = useState('')

  const supabase = createClient()

  // Permisos predefinidos disponibles
  const permisosDisponibles = [
    'planificaciones.crear',
    'planificaciones.ver_propias',
    'planificaciones.ver_todas',
    'planificaciones.editar_propias',
    'planificaciones.editar_todas',
    'planificaciones.eliminar_propias',
    'planificaciones.eliminar_todas',
    'evaluaciones.crear',
    'evaluaciones.ver_propias',
    'evaluaciones.ver_todas',
    'evaluaciones.eliminar_propias',
    'evaluaciones.eliminar_todas',
    'portafolios.crear',
    'portafolios.ver_propios',
    'portafolios.ver_todos',
    'usuarios.ver_todos',
    'usuarios.editar',
    'usuarios.eliminar',
    'planes.ver',
    'planes.crear',
    'planes.editar',
    'planes.eliminar',
    'roles.ver',
    'roles.crear',
    'roles.editar',
    'roles.eliminar',
    'metricas.ver',
    'sistema.configurar',
  ]

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('codigo', { ascending: true })

      if (error) throw error

      setRoles(data || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        nombre: role.nombre,
        codigo: role.codigo,
        descripcion: role.descripcion || '',
        permisos: Array.isArray(role.permisos) ? role.permisos as string[] : [],
        activo: role.activo,
      })
    } else {
      setEditingRole(null)
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        permisos: [],
        activo: true,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRole(null)
    setNuevoPermiso('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingRole) {
        // Actualizar rol existente
        const { error } = await supabase
          .from('roles')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            permisos: formData.permisos,
            activo: formData.activo,
          })
          .eq('id', editingRole.id)

        if (error) throw error
      } else {
        // Crear nuevo rol
        const { error } = await supabase
          .from('roles')
          .insert({
            nombre: formData.nombre,
            codigo: formData.codigo,
            descripcion: formData.descripcion,
            permisos: formData.permisos,
            activo: formData.activo,
          })

        if (error) throw error
      }

      await fetchRoles()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving role:', error)
      alert('Error al guardar el rol')
    }
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      await fetchRoles()
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Error al eliminar el rol')
    }
  }

  const toggleActivo = async (role: Role) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update({ activo: !role.activo })
        .eq('id', role.id)

      if (error) throw error

      await fetchRoles()
    } catch (error) {
      console.error('Error toggling role:', error)
      alert('Error al cambiar estado del rol')
    }
  }

  const agregarPermiso = (permiso: string) => {
    if (permiso && !formData.permisos.includes(permiso)) {
      setFormData({
        ...formData,
        permisos: [...formData.permisos, permiso],
      })
    }
  }

  const eliminarPermiso = (permiso: string) => {
    setFormData({
      ...formData,
      permisos: formData.permisos.filter((p) => p !== permiso),
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
            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Roles</h1>
            <p className="text-slate-400">Administra los roles y permisos del sistema</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Rol
          </Button>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className={cn(
                'bg-slate-800 rounded-lg border p-6',
                role.activo ? 'border-slate-700' : 'border-slate-600 opacity-60'
              )}
            >
              {/* Role Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{role.nombre}</h3>
                    <p className="text-sm text-slate-400">{role.codigo}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {role.activo ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* Descripción */}
              {role.descripcion && (
                <p className="text-sm text-slate-300 mb-4">{role.descripcion}</p>
              )}

              {/* Permisos */}
              {Array.isArray(role.permisos) && role.permisos.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">
                    PERMISOS ({role.permisos.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {(role.permisos as string[]).slice(0, 4).map((permiso, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded"
                      >
                        {permiso}
                      </span>
                    ))}
                    {role.permisos.length > 4 && (
                      <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
                        +{role.permisos.length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleOpenModal(role)}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => toggleActivo(role)}
                  className={cn(
                    'px-3 py-2 rounded-lg transition-colors text-sm',
                    role.activo
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                >
                  {role.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
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
                  {editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Información básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nombre del Rol
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
                        disabled={!!editingRole}
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

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-300">Rol Activo</span>
                    </label>
                  </div>

                  {/* Permisos */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Permisos</h3>
                    
                    {/* Selector de permisos predefinidos */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Agregar Permiso
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            agregarPermiso(e.target.value)
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar permiso...</option>
                        {permisosDisponibles
                          .filter((p) => !formData.permisos.includes(p))
                          .map((permiso) => (
                            <option key={permiso} value={permiso}>
                              {permiso}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Permiso personalizado */}
                    <div className="flex gap-2 mb-4">
                      <Input
                        type="text"
                        value={nuevoPermiso}
                        onChange={(e) => setNuevoPermiso(e.target.value)}
                        placeholder="O escribe un permiso personalizado..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            agregarPermiso(nuevoPermiso)
                            setNuevoPermiso('')
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          agregarPermiso(nuevoPermiso)
                          setNuevoPermiso('')
                        }}
                        className="whitespace-nowrap"
                      >
                        Agregar
                      </Button>
                    </div>

                    {/* Lista de permisos asignados */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-400">
                        Permisos Asignados ({formData.permisos.length})
                      </h4>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {formData.permisos.map((permiso) => (
                          <div
                            key={permiso}
                            className="flex items-center justify-between bg-slate-900 p-2 rounded"
                          >
                            <span className="text-sm text-slate-300">{permiso}</span>
                            <button
                              type="button"
                              onClick={() => eliminarPermiso(permiso)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
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
                      {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
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

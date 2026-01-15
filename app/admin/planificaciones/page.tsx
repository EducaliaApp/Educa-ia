'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Search, FileText, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Planificacion {
  id: string
  user_id: string
  asignatura: string
  nivel: string
  unidad: string
  duracion_clases: number
  contenido: any
  created_at: string
  user_nombre?: string
  user_email?: string
}

export default function PlanificacionesPage() {
  const [planificaciones, setPlanificaciones] = useState<Planificacion[]>([])
  const [filteredPlanificaciones, setFilteredPlanificaciones] = useState<Planificacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [asignaturaFilter, setAsignaturaFilter] = useState('all')
  const [selectedPlanificacion, setSelectedPlanificacion] = useState<Planificacion | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchPlanificaciones()
  }, [])

  useEffect(() => {
    filterPlanificaciones()
  }, [searchTerm, asignaturaFilter, planificaciones])

  const fetchPlanificaciones = async () => {
    setIsLoading(true)
    try {
      // Get all planificaciones with user info
      const { data } = await supabase
        .from('planificaciones')
        .select(`
          id,
          user_id,
          asignatura,
          nivel,
          unidad,
          duracion_clases,
          contenido,
          created_at,
          profiles!user_id(nombre, email)
        `)
        .order('created_at', { ascending: false })

      if (data) {
        const planificacionesWithUser = data.map((p: any) => ({
          ...p,
          user_nombre: p.profiles?.nombre || 'Usuario desconocido',
          user_email: p.profiles?.email || '',
        }))

        setPlanificaciones(planificacionesWithUser)
        setFilteredPlanificaciones(planificacionesWithUser)
      }
    } catch (error) {
      console.error('Error fetching planificaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterPlanificaciones = () => {
    let filtered = planificaciones

    // Filter by search term (user name or unidad)
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.user_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.unidad.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by asignatura
    if (asignaturaFilter !== 'all') {
      filtered = filtered.filter((p) => p.asignatura === asignaturaFilter)
    }

    setFilteredPlanificaciones(filtered)
  }

  const handleViewPlanificacion = (planificacion: Planificacion) => {
    setSelectedPlanificacion(planificacion)
    setIsModalOpen(true)
  }

  // Get unique asignaturas for filter
  const uniqueAsignaturas = Array.from(new Set(planificaciones.map((p) => p.asignatura)))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando planificaciones...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Planificaciones</h1>
        <p className="text-slate-400">Vista de todas las planificaciones generadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Planificaciones</p>
              <h3 className="text-white text-3xl font-bold">{planificaciones.length}</h3>
            </div>
            <div className="p-3 bg-blue-600/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Esta Semana</p>
              <h3 className="text-white text-3xl font-bold">
                {
                  planificaciones.filter(
                    (p) =>
                      new Date(p.created_at) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length
                }
              </h3>
            </div>
            <div className="p-3 bg-green-600/10 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Asignaturas</p>
              <h3 className="text-white text-3xl font-bold">{uniqueAsignaturas.length}</h3>
            </div>
            <div className="p-3 bg-purple-600/10 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar por usuario o unidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={asignaturaFilter}
            onChange={(e) => setAsignaturaFilter(e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
              'bg-slate-800 border-slate-700 text-white'
            )}
          >
            <option value="all">Todas las asignaturas</option>
            {uniqueAsignaturas.map((asignatura) => (
              <option key={asignatura} value={asignatura}>
                {asignatura}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Planificaciones Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Usuario
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Asignatura
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Nivel
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Unidad
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Clases
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Fecha
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPlanificaciones.length > 0 ? (
                filteredPlanificaciones.map((planificacion) => (
                  <tr
                    key={planificacion.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{planificacion.user_nombre}</p>
                        <p className="text-slate-400 text-xs">{planificacion.user_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default">{planificacion.asignatura}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {planificacion.nivel}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">
                      {planificacion.unidad}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {planificacion.duracion_clases}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(planificacion.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewPlanificacion(planificacion)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 rounded-lg transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No hay planificaciones que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      <div className="text-center">
        <p className="text-slate-400 text-sm">
          Mostrando {filteredPlanificaciones.length} de {planificaciones.length} planificaciones
        </p>
      </div>

      {/* Modal for viewing planificacion */}
      {selectedPlanificacion && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Planificación: ${selectedPlanificacion.unidad}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-sm text-slate-600">Usuario</p>
                <p className="font-medium">{selectedPlanificacion.user_nombre}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Asignatura</p>
                <p className="font-medium">{selectedPlanificacion.asignatura}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Nivel</p>
                <p className="font-medium">{selectedPlanificacion.nivel}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Duración</p>
                <p className="font-medium">{selectedPlanificacion.duracion_clases} clases</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Contenido de la Planificación</h4>
              <div className="bg-slate-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                {selectedPlanificacion.contenido?.clases?.map((clase: any, index: number) => (
                  <div key={index} className="mb-4 pb-4 border-b border-slate-200 last:border-0">
                    <h5 className="font-semibold text-blue-600 mb-2">
                      Clase {index + 1}: {clase.titulo || `Clase ${index + 1}`}
                    </h5>
                    <div className="space-y-2 text-sm">
                      {clase.objetivo && (
                        <div>
                          <span className="font-medium">Objetivo:</span> {clase.objetivo}
                        </div>
                      )}
                      {clase.actividades && (
                        <div>
                          <span className="font-medium">Actividades:</span>
                          <ul className="list-disc list-inside ml-4 mt-1">
                            {Array.isArray(clase.actividades) ? (
                              clase.actividades.map((act: string, i: number) => (
                                <li key={i}>{act}</li>
                              ))
                            ) : (
                              <li>{clase.actividades}</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

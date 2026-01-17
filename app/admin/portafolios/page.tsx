'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Search, Briefcase, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Portafolio {
  id: string
  profesor_id: string
  año_evaluacion: number
  asignatura: string
  nivel_educativo: string
  modalidad: string
  estado: string
  progreso_porcentaje: number
  puntaje_estimado_ia: number | null
  nivel_desempeño_estimado: string | null
  created_at: string
  profesor_nombre?: string
  profesor_email?: string
  total_modulos?: number
  modulos_completados?: number
}

export default function PortafoliosAdminPage() {
  const [portafolios, setPortafolios] = useState<Portafolio[]>([])
  const [filteredPortafolios, setFilteredPortafolios] = useState<Portafolio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('all')
  const [añoFilter, setAñoFilter] = useState('all')
  const [selectedPortafolio, setSelectedPortafolio] = useState<Portafolio | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createClient()

  const fetchPortafolios = async () => {
    setIsLoading(true)
    try {
      // Get all portafolios with profesor info
      const { data } = await supabase
        .from('portafolios')
        .select(`
          id,
          profesor_id,
          año_evaluacion,
          asignatura,
          nivel_educativo,
          modalidad,
          estado,
          progreso_porcentaje,
          puntaje_estimado_ia,
          nivel_desempeño_estimado,
          created_at,
          profiles!profesor_id(nombre, email)
        `)
        .order('created_at', { ascending: false })

      if (data) {
        // Get modulos count for each portafolio
        const portafoliosWithModulos = await Promise.all(
          data.map(async (p: any) => {
            const { data: modulos } = await supabase
              .from('modulos_portafolio')
              .select('id, completado')
              .eq('portafolio_id', p.id)

            const total_modulos = modulos?.length || 0
            const modulos_completados = modulos?.filter((m) => m.completado).length || 0

            return {
              ...p,
              profesor_nombre: p.profiles?.nombre || 'Usuario desconocido',
              profesor_email: p.profiles?.email || '',
              total_modulos,
              modulos_completados,
            }
          })
        )

        setPortafolios(portafoliosWithModulos)
        setFilteredPortafolios(portafoliosWithModulos)
      }
    } catch (error) {
      console.error('Error fetching portafolios:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterPortafolios = useCallback(() => {
    let filtered = portafolios

    // Filter by search term (profesor name or asignatura)
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.profesor_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.asignatura.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by estado
    if (estadoFilter !== 'all') {
      filtered = filtered.filter((p) => p.estado === estadoFilter)
    }

    // Filter by año
    if (añoFilter !== 'all') {
      filtered = filtered.filter((p) => p.año_evaluacion.toString() === añoFilter)
    }

    setFilteredPortafolios(filtered)
  }, [portafolios, searchTerm, estadoFilter, añoFilter])

  useEffect(() => {
    fetchPortafolios()
  }, [])

  useEffect(() => {
    filterPortafolios()
  }, [filterPortafolios])

  const handleViewPortafolio = (portafolio: Portafolio) => {
    setSelectedPortafolio(portafolio)
    setIsModalOpen(true)
  }

  // Get unique años and estados for filters
  const uniqueAños = Array.from(new Set(portafolios.map((p) => p.año_evaluacion)))
  const estados = ['borrador', 'en_progreso', 'completado', 'enviado']

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'completado':
      case 'enviado':
        return 'success'
      case 'en_progreso':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return 'Borrador'
      case 'en_progreso':
        return 'En Progreso'
      case 'completado':
        return 'Completado'
      case 'enviado':
        return 'Enviado'
      default:
        return estado
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando portafolios...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Portafolios Docentes</h1>
        <p className="text-slate-400">
          Gestión de portafolios de evaluación docente según Marco para la Buena Enseñanza
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Portafolios</p>
              <h3 className="text-white text-3xl font-bold">{portafolios.length}</h3>
            </div>
            <div className="p-3 bg-blue-600/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">En Progreso</p>
              <h3 className="text-white text-3xl font-bold">
                {portafolios.filter((p) => p.estado === 'en_progreso').length}
              </h3>
            </div>
            <div className="p-3 bg-yellow-600/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Completados</p>
              <h3 className="text-white text-3xl font-bold">
                {portafolios.filter((p) => p.estado === 'completado').length}
              </h3>
            </div>
            <div className="p-3 bg-green-600/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Promedio Progreso</p>
              <h3 className="text-white text-3xl font-bold">
                {portafolios.length > 0
                  ? Math.round(
                      portafolios.reduce((acc, p) => acc + p.progreso_porcentaje, 0) /
                        portafolios.length
                    )
                  : 0}
                %
              </h3>
            </div>
            <div className="p-3 bg-purple-600/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar por profesor o asignatura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
              'bg-slate-800 border-slate-700 text-white'
            )}
          >
            <option value="all">Todos los estados</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {getEstadoLabel(estado)}
              </option>
            ))}
          </select>

          <select
            value={añoFilter}
            onChange={(e) => setAñoFilter(e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
              'bg-slate-800 border-slate-700 text-white'
            )}
          >
            <option value="all">Todos los años</option>
            {uniqueAños.map((año) => (
              <option key={año} value={año.toString()}>
                {año}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portafolios Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Profesor
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Asignatura
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Nivel
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Año
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Estado
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Progreso
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Módulos
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Puntaje IA
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPortafolios.length > 0 ? (
                filteredPortafolios.map((portafolio) => (
                  <tr
                    key={portafolio.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{portafolio.profesor_nombre}</p>
                        <p className="text-slate-400 text-xs">{portafolio.profesor_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default">{portafolio.asignatura}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {portafolio.nivel_educativo}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {portafolio.año_evaluacion}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getEstadoBadgeVariant(portafolio.estado)}>
                        {getEstadoLabel(portafolio.estado)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${portafolio.progreso_porcentaje}%` }}
                          ></div>
                        </div>
                        <span className="text-slate-400 text-sm">
                          {portafolio.progreso_porcentaje}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {portafolio.modulos_completados}/{portafolio.total_modulos}
                    </td>
                    <td className="px-6 py-4">
                      {portafolio.puntaje_estimado_ia ? (
                        <span className="text-white font-semibold">
                          {portafolio.puntaje_estimado_ia.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewPortafolio(portafolio)}
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
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No hay portafolios que coincidan con los filtros
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
          Mostrando {filteredPortafolios.length} de {portafolios.length} portafolios
        </p>
      </div>

      {/* Modal for viewing portafolio */}
      {selectedPortafolio && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Detalles del Portafolio"
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-700">
              <div>
                <p className="text-sm text-slate-400">Profesor</p>
                <p className="font-medium text-white">{selectedPortafolio.profesor_nombre}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="font-medium text-white">{selectedPortafolio.profesor_email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Asignatura</p>
                <p className="font-medium text-white">{selectedPortafolio.asignatura}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Nivel Educativo</p>
                <p className="font-medium text-white">{selectedPortafolio.nivel_educativo}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Año Evaluación</p>
                <p className="font-medium text-white">{selectedPortafolio.año_evaluacion}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Modalidad</p>
                <p className="font-medium text-white">{selectedPortafolio.modalidad}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Estado</p>
                <Badge variant={getEstadoBadgeVariant(selectedPortafolio.estado)}>
                  {getEstadoLabel(selectedPortafolio.estado)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-400">Progreso</p>
                <p className="font-medium text-white">{selectedPortafolio.progreso_porcentaje}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-700">
              <div>
                <p className="text-sm text-slate-400">Módulos Completados</p>
                <p className="font-medium text-white">
                  {selectedPortafolio.modulos_completados} / {selectedPortafolio.total_modulos}
                </p>
              </div>
              {selectedPortafolio.puntaje_estimado_ia && (
                <>
                  <div>
                    <p className="text-sm text-slate-400">Puntaje Estimado IA</p>
                    <p className="font-medium text-lg text-white">
                      {selectedPortafolio.puntaje_estimado_ia.toFixed(1)} / 4.0
                    </p>
                  </div>
                  {selectedPortafolio.nivel_desempeño_estimado && (
                    <div>
                      <p className="text-sm text-slate-400">Nivel de Desempeño</p>
                      <Badge variant="success">{selectedPortafolio.nivel_desempeño_estimado}</Badge>
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <p className="text-sm text-slate-400">Fecha de Creación</p>
              <p className="font-medium text-white">{formatDate(selectedPortafolio.created_at)}</p>
            </div>

            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-blue-100 mb-2">
                Marco para la Buena Enseñanza (MBE)
              </h4>
              <p className="text-sm text-blue-200">
                Este portafolio está diseñado siguiendo los estándares del Marco para la Buena
                Enseñanza del MINEDUC Chile, evaluando competencias docentes en preparación,
                creación de ambiente propicio, enseñanza y profesionalismo.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

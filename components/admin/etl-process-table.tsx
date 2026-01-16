'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import {
  Eye,
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface ProcesoETL {
  id: string
  nombre: string
  tipo_proceso: string
  descripcion: string
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'error' | 'cancelado'
  fecha_inicio: string | null
  fecha_fin: string | null
  duracion_ms: number | null
  total_registros: number
  registros_exitosos: number
  registros_fallidos: number
  tasa_exito_porcentaje: number
  num_logs: number
  num_errores: number
  num_archivos: number
  created_at: string
  updated_at: string
}

interface ETLProcessTableProps {
  procesos: ProcesoETL[]
  onViewDetails: (proceso: ProcesoETL) => void
  onViewLogs: (proceso: ProcesoETL) => void
  onRefresh: () => void
}

export function ETLProcessTable({
  procesos,
  onViewDetails,
  onViewLogs,
  onRefresh,
}: ETLProcessTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filtrar procesos
  const procesosFiltrados = procesos.filter((proceso) => {
    const matchesSearch =
      searchTerm === '' ||
      proceso.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proceso.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEstado = estadoFilter === 'all' || proceso.estado === estadoFilter
    const matchesTipo = tipoFilter === 'all' || proceso.tipo_proceso === tipoFilter

    return matchesSearch && matchesEstado && matchesTipo
  })

  // Paginación
  const totalPages = Math.ceil(procesosFiltrados.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const procesosPaginados = procesosFiltrados.slice(startIndex, endIndex)

  // Resetear página cuando cambian los filtros
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completado':
        return <Badge variant="success">Completado</Badge>
      case 'en_progreso':
        return <Badge variant="warning">En Progreso</Badge>
      case 'error':
        return <Badge variant="danger">Error</Badge>
      case 'pendiente':
        return <Badge variant="default">Pendiente</Badge>
      case 'cancelado':
        return <Badge variant="default">Cancelado</Badge>
      default:
        return <Badge variant="default">{estado}</Badge>
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completado':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'en_progreso':
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'pendiente':
        return <Clock className="w-5 h-5 text-gray-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setEstadoFilter('all')
    setTipoFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== '' || estadoFilter !== 'all' || tipoFilter !== 'all'

  // Obtener valores únicos para filtros
  const tiposUnicos = Array.from(new Set(procesos.map(p => p.tipo_proceso)))

  return (
    <Card className="p-6">
      {/* Header con título y botón de refrescar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Historial de Ejecuciones</h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                handleFilterChange()
              }}
              className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filtro por Estado */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value)
                handleFilterChange()
              }}
              className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="completado">Completado</option>
              <option value="en_progreso">En Progreso</option>
              <option value="error">Error</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Filtro por Tipo */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={tipoFilter}
              onChange={(e) => {
                setTipoFilter(e.target.value)
                handleFilterChange()
              }}
              className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Todos los tipos</option>
              {tiposUnicos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón para limpiar filtros */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Información de resultados */}
      <div className="mb-3 text-sm text-slate-400">
        Mostrando {procesosPaginados.length} de {procesosFiltrados.length} procesos
        {procesosFiltrados.length !== procesos.length && ` (${procesos.length} total)`}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Estado</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Proceso</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Tipo</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Registros</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Tasa Éxito</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Duración</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Fecha Inicio</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {procesosPaginados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No se encontraron procesos
                </td>
              </tr>
            ) : (
              procesosPaginados.map((proceso) => (
                <tr
                  key={proceso.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getEstadoIcon(proceso.estado)}
                      {getEstadoBadge(proceso.estado)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{proceso.nombre}</p>
                      {proceso.descripcion && (
                        <p className="text-slate-400 text-sm truncate max-w-xs">
                          {proceso.descripcion}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="default">{proceso.tipo_proceso}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-white">
                      <p className="font-medium">{proceso.total_registros.toLocaleString('es-CL')}</p>
                      <p className="text-sm text-slate-400">
                        {proceso.registros_exitosos.toLocaleString('es-CL')} exitosos
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            proceso.tasa_exito_porcentaje >= 90
                              ? 'bg-green-500'
                              : proceso.tasa_exito_porcentaje >= 70
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${proceso.tasa_exito_porcentaje}%` }}
                        />
                      </div>
                      <span className="text-white text-sm font-medium">
                        {proceso.tasa_exito_porcentaje}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">
                    {formatDuration(proceso.duracion_ms)}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-sm">
                    {proceso.fecha_inicio ? formatDate(proceso.fecha_inicio) : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewLogs(proceso)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded transition-colors"
                        title="Ver Logs"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onViewDetails(proceso)}
                        className="p-2 text-purple-400 hover:text-purple-300 hover:bg-slate-700 rounded transition-colors"
                        title="Ver Detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {proceso.num_archivos > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                          <Download className="w-3 h-3" />
                          {proceso.num_archivos}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white px-3">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

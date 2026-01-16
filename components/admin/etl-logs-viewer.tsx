'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  X,
  Download,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  FileText,
  Copy,
  Check,
} from 'lucide-react'

interface LogEntry {
  timestamp: string
  mensaje: string
  nivel?: 'info' | 'warning' | 'error' | 'success'
}

interface ProcesoETL {
  id: string
  nombre: string
  tipo_proceso: string
  estado: string
  fecha_inicio: string | null
  fecha_fin: string | null
  duracion_ms: number | null
  total_registros: number
  registros_exitosos: number
  registros_fallidos: number
  logs: string[]
  errores: any[]
  created_at: string
}

interface ETLLogsViewerProps {
  proceso: ProcesoETL
  onClose: () => void
}

export function ETLLogsViewer({ proceso, onClose }: ETLLogsViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [nivelFilter, setNivelFilter] = useState<string>('all')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Parsear logs a formato estructurado
  const logsParseados = useMemo<LogEntry[]>(() => {
    if (!proceso.logs || proceso.logs.length === 0) return []

    return proceso.logs.map((log) => {
      // Formato esperado: "[2025-01-16T10:30:45.123Z] Mensaje"
      const timestampMatch = log.match(/^\[([^\]]+)\]/)
      const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString()
      const mensaje = timestampMatch ? log.substring(timestampMatch[0].length).trim() : log

      // Detectar nivel basado en palabras clave
      let nivel: LogEntry['nivel'] = 'info'
      const mensajeLower = mensaje.toLowerCase()
      if (mensajeLower.includes('error') || mensajeLower.includes('falló') || mensajeLower.includes('fallido')) {
        nivel = 'error'
      } else if (mensajeLower.includes('advertencia') || mensajeLower.includes('warning') || mensajeLower.includes('⚠️')) {
        nivel = 'warning'
      } else if (mensajeLower.includes('completado') || mensajeLower.includes('éxito') || mensajeLower.includes('✓')) {
        nivel = 'success'
      }

      return { timestamp, mensaje, nivel }
    })
  }, [proceso.logs])

  // Filtrar logs
  const logsFiltrados = useMemo(() => {
    return logsParseados.filter((log) => {
      const matchesSearch = searchTerm === '' || log.mensaje.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesNivel = nivelFilter === 'all' || log.nivel === nivelFilter
      return matchesSearch && matchesNivel
    })
  }, [logsParseados, searchTerm, nivelFilter])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getLogIcon = (nivel?: string) => {
    switch (nivel) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getLogColor = (nivel?: string) => {
    switch (nivel) {
      case 'error':
        return 'text-red-400 bg-red-950/20 border-red-900'
      case 'warning':
        return 'text-yellow-400 bg-yellow-950/20 border-yellow-900'
      case 'success':
        return 'text-green-400 bg-green-950/20 border-green-900'
      default:
        return 'text-slate-300 bg-slate-900/50 border-slate-800'
    }
  }

  const downloadLogs = () => {
    const logContent = logsParseados
      .map((log) => `[${log.timestamp}] ${log.mensaje}`)
      .join('\n')

    const blob = new Blob([logContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs_${proceso.nombre}_${proceso.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyLog = (log: LogEntry, index: number) => {
    const logText = `[${log.timestamp}] ${log.mensaje}`
    navigator.clipboard.writeText(logText)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAllLogs = () => {
    const logContent = logsParseados
      .map((log) => `[${log.timestamp}] ${log.mensaje}`)
      .join('\n')
    navigator.clipboard.writeText(logContent)
  }

  // Contar logs por nivel
  const logCounts = useMemo(() => {
    return {
      total: logsParseados.length,
      error: logsParseados.filter((l) => l.nivel === 'error').length,
      warning: logsParseados.filter((l) => l.nivel === 'warning').length,
      success: logsParseados.filter((l) => l.nivel === 'success').length,
      info: logsParseados.filter((l) => l.nivel === 'info').length,
    }
  }, [logsParseados])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">Logs de Ejecución</h2>
            <p className="text-slate-400 text-sm">{proceso.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Información del Proceso */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400 mb-1">Estado</p>
              <Badge
                variant={
                  proceso.estado === 'completado'
                    ? 'success'
                    : proceso.estado === 'error'
                    ? 'danger'
                    : proceso.estado === 'en_progreso'
                    ? 'warning'
                    : 'default'
                }
              >
                {proceso.estado}
              </Badge>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Duración</p>
              <p className="text-white font-medium">{formatDuration(proceso.duracion_ms)}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Registros Procesados</p>
              <p className="text-white font-medium">{proceso.total_registros.toLocaleString('es-CL')}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Tasa de Éxito</p>
              <p className="text-white font-medium">
                {proceso.total_registros > 0
                  ? Math.round((proceso.registros_exitosos / proceso.total_registros) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>

          {/* Contador de logs por nivel */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm">{logCounts.total} logs totales</span>
            </div>
            {logCounts.error > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-400 text-sm">{logCounts.error} errores</span>
              </div>
            )}
            {logCounts.warning > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-400 text-sm">{logCounts.warning} advertencias</span>
              </div>
            )}
            {logCounts.success > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-400 text-sm">{logCounts.success} exitosos</span>
              </div>
            )}
          </div>
        </div>

        {/* Filtros y Acciones */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar en logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Filtro por Nivel */}
            <select
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none text-sm"
            >
              <option value="all">Todos los niveles</option>
              <option value="error">Errores</option>
              <option value="warning">Advertencias</option>
              <option value="success">Éxitos</option>
              <option value="info">Info</option>
            </select>

            {/* Botones de Acción */}
            <div className="flex gap-2">
              <button
                onClick={copyAllLogs}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button
                onClick={downloadLogs}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4">
          {logsFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                {logsParseados.length === 0 ? 'No hay logs disponibles' : 'No se encontraron logs'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-sm">
              {logsFiltrados.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getLogColor(log.nivel)} group`}
                >
                  <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.nivel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-slate-500 text-xs mb-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDate(log.timestamp)}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{log.mensaje}</p>
                      </div>
                      <button
                        onClick={() => copyLog(log, index)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-800 rounded transition-all"
                        title="Copiar log"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Errores (si existen) */}
        {proceso.errores && proceso.errores.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-red-950/10">
            <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Errores Registrados ({proceso.errores.length})
            </h3>
            <div className="space-y-2">
              {proceso.errores.map((error: any, index: number) => (
                <div key={index} className="p-3 bg-red-950/20 border border-red-900 rounded-lg">
                  <p className="text-red-400 font-medium">{error.mensaje}</p>
                  {error.detalle && (
                    <p className="text-red-500 text-xs mt-1 font-mono whitespace-pre-wrap">
                      {error.detalle}
                    </p>
                  )}
                  {error.timestamp && (
                    <p className="text-slate-500 text-xs mt-2">{formatDate(error.timestamp)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Mostrando {logsFiltrados.length} de {logsParseados.length} logs
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

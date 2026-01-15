'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { 
  Database, 
  Download, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  AlertCircle,
  RefreshCw,
  Eye
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
  archivos_generados: any[]
  logs: string[]
  errores: any[]
  created_at: string
  updated_at: string
}

interface DocumentoTransformado {
  id: string
  proceso_etl_id: string
  nombre_archivo: string
  tipo_documento: string
  formato: string
  storage_bucket: string
  storage_path: string
  tamaño_bytes: number
  url_descarga: string
  num_registros: number
  columnas: string[]
  resumen_contenido: any
  version: string
  created_at: string
}

export default function ETLPage() {
  const [procesos, setProcesos] = useState<ProcesoETL[]>([])
  const [documentos, setDocumentos] = useState<DocumentoTransformado[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProceso, setSelectedProceso] = useState<ProcesoETL | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionMessage, setExecutionMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Obtener procesos ETL
      const { data: procesosData, error: procesosError } = await supabase
        .from('procesos_etl')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (procesosError) {
        console.error('Error fetching procesos:', procesosError)
      } else {
        setProcesos(procesosData || [])
      }

      // Obtener documentos transformados
      const { data: documentosData, error: documentosError } = await supabase
        .from('documentos_transformados')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (documentosError) {
        console.error('Error fetching documentos:', documentosError)
      } else {
        setDocumentos(documentosData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const ejecutarExtraccionBasesCurriculares = async () => {
    setIsExecuting(true)
    setExecutionMessage('')

    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (!session?.session?.access_token) {
        throw new Error('No hay sesión activa')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extraer-bases-curriculares`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ force: false }),
        }
      )

      const result = await response.json()

      if (response.ok) {
        setExecutionMessage('✅ Extracción completada exitosamente')
        await fetchData() // Recargar datos
      } else {
        setExecutionMessage(`❌ Error: ${result.error || 'Error desconocido'}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setExecutionMessage(`❌ Error ejecutando extracción: ${errorMessage}`)
      console.error('Error:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completado':
        return <Badge variant="success">Completado</Badge>
      case 'en_progreso':
        return <Badge variant="warning">En Progreso</Badge>
      case 'error':
        return <Badge variant="error">Error</Badge>
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
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando procesos ETL...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Procesos ETL</h1>
        <p className="text-slate-400">
          Extracción y transformación de datos desde fuentes oficiales MINEDUC
        </p>
      </div>

      {/* Botón para ejecutar extracción */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Extraer Bases Curriculares
            </h2>
            <p className="text-slate-400">
              Extrae objetivos de aprendizaje de 1° a 6° básico desde curriculumnacional.cl
            </p>
          </div>
          <button
            onClick={ejecutarExtraccionBasesCurriculares}
            disabled={isExecuting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              isExecuting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Ejecutar Extracción
              </>
            )}
          </button>
        </div>
        {executionMessage && (
          <div className="mt-4 p-4 bg-slate-800 rounded-lg">
            <p className="text-white">{executionMessage}</p>
          </div>
        )}
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{procesos.length}</h3>
              <p className="text-slate-400">Total Procesos</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                {procesos.filter((p) => p.estado === 'completado').length}
              </h3>
              <p className="text-slate-400">Completados</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <RefreshCw className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                {procesos.filter((p) => p.estado === 'en_progreso').length}
              </h3>
              <p className="text-slate-400">En Progreso</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{documentos.length}</h3>
              <p className="text-slate-400">Documentos Generados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Procesos */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-4">Procesos Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Estado</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Proceso</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Tipo</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Registros</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Duración</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {procesos.map((proceso) => (
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
                        <p className="text-slate-400 text-sm">{proceso.descripcion}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="default">{proceso.tipo_proceso}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-white">
                      <p className="font-medium">{proceso.total_registros}</p>
                      <p className="text-sm text-slate-400">
                        {proceso.registros_exitosos} exitosos
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">
                    {formatDuration(proceso.duracion_ms)}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-sm">
                    {formatDate(proceso.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedProceso(proceso)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Documentos Transformados */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-4">Documentos Generados</h2>
        <div className="space-y-3">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{doc.nombre_archivo}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-slate-400 text-sm">
                      {doc.num_registros} registros
                    </span>
                    <span className="text-slate-400 text-sm">
                      {formatBytes(doc.tamaño_bytes)}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={doc.url_descarga}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </a>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal de detalles de proceso */}
      {selectedProceso && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedProceso(null)}
        >
          <div
            className="bg-slate-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              Detalles del Proceso
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-sm">Nombre</p>
                <p className="text-white font-medium">{selectedProceso.nombre}</p>
              </div>

              <div>
                <p className="text-slate-400 text-sm">Estado</p>
                <div className="mt-1">{getEstadoBadge(selectedProceso.estado)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Total Registros</p>
                  <p className="text-white font-medium">
                    {selectedProceso.total_registros}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Registros Exitosos</p>
                  <p className="text-green-400 font-medium">
                    {selectedProceso.registros_exitosos}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Registros Fallidos</p>
                  <p className="text-red-400 font-medium">
                    {selectedProceso.registros_fallidos}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Duración</p>
                  <p className="text-white font-medium">
                    {formatDuration(selectedProceso.duracion_ms)}
                  </p>
                </div>
              </div>

              {/* Logs */}
              {selectedProceso.logs && selectedProceso.logs.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Logs</p>
                  <div className="bg-slate-950 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {selectedProceso.logs.map((log, index) => (
                      <p key={index} className="text-slate-300 text-sm font-mono">
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Errores */}
              {selectedProceso.errores && selectedProceso.errores.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Errores</p>
                  <div className="bg-red-950/20 border border-red-900 rounded-lg p-4">
                    {selectedProceso.errores.map((error: any, index: number) => (
                      <div key={index} className="text-red-400 text-sm">
                        <p className="font-medium">{error.mensaje}</p>
                        {error.detalle && (
                          <p className="text-red-500 text-xs mt-1 font-mono">
                            {error.detalle}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archivos generados */}
              {selectedProceso.archivos_generados &&
                selectedProceso.archivos_generados.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Archivos Generados</p>
                    <div className="space-y-2">
                      {selectedProceso.archivos_generados.map((archivo: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                        >
                          <div>
                            <p className="text-white font-medium">{archivo.nombre}</p>
                            <p className="text-slate-400 text-sm">
                              {formatBytes(archivo.size)}
                            </p>
                          </div>
                          <a
                            href={archivo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <button
              onClick={() => setSelectedProceso(null)}
              className="mt-6 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

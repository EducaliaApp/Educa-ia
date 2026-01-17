'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Search, ClipboardCheck, Eye } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

interface Evaluacion {
  id: string
  user_id: string
  tipo: string | null
  instrucciones: string | null
  archivo_url: string | null
  feedback: any
  created_at: string
  user_nombre?: string
  user_email?: string
}

export default function EvaluacionesAdminPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [filteredEvaluaciones, setFilteredEvaluaciones] = useState<Evaluacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState('all')
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<Evaluacion | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createClient()

  const fetchEvaluaciones = useCallback(async () => {
    setIsLoading(true)
    try {
      // Get all evaluaciones with user info
      const { data } = await supabase
        .from('evaluaciones')
        .select(`
          id,
          user_id,
          tipo,
          instrucciones,
          archivo_url,
          feedback,
          created_at,
          profiles!user_id(nombre, email)
        `)
        .order('created_at', { ascending: false })

      if (data) {
        const evaluacionesWithUser = data.map((e: any) => ({
          ...e,
          user_nombre: e.profiles?.nombre || 'Usuario desconocido',
          user_email: e.profiles?.email || '',
        }))

        setEvaluaciones(evaluacionesWithUser)
        setFilteredEvaluaciones(evaluacionesWithUser)
      }
    } catch (error) {
      console.error('Error fetching evaluaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const filterEvaluaciones = useCallback(() => {
    let filtered = evaluaciones

    // Filter by search term (user name or tipo)
    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.user_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by tipo
    if (tipoFilter !== 'all') {
      filtered = filtered.filter((e) => e.tipo === tipoFilter)
    }

    setFilteredEvaluaciones(filtered)
  }, [searchTerm, tipoFilter, evaluaciones])

  useEffect(() => {
    fetchEvaluaciones()
  }, [fetchEvaluaciones])

  useEffect(() => {
    filterEvaluaciones()
  }, [filterEvaluaciones])

  const handleViewEvaluacion = (evaluacion: Evaluacion) => {
    setSelectedEvaluacion(evaluacion)
    setIsModalOpen(true)
  }

  // Get unique tipos for filter
  const uniqueTipos = Array.from(new Set(evaluaciones.map((e) => e.tipo).filter(Boolean)))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando evaluaciones...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Evaluaciones</h1>
        <p className="text-slate-400">Vista de todas las evaluaciones generadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Evaluaciones</p>
              <h3 className="text-white text-3xl font-bold">{evaluaciones.length}</h3>
            </div>
            <div className="p-3 bg-green-600/10 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Esta Semana</p>
              <h3 className="text-white text-3xl font-bold">
                {
                  evaluaciones.filter(
                    (e) =>
                      new Date(e.created_at) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length
                }
              </h3>
            </div>
            <div className="p-3 bg-blue-600/10 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Tipos Diferentes</p>
              <h3 className="text-white text-3xl font-bold">{uniqueTipos.length}</h3>
            </div>
            <div className="p-3 bg-purple-600/10 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-purple-600" />
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
              placeholder="Buscar por usuario o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
              'bg-slate-800 border-slate-700 text-white'
            )}
          >
            <option value="all">Todos los tipos</option>
            {uniqueTipos.map((tipo) => (
              <option key={tipo} value={tipo || ''}>
                {tipo || 'Sin tipo'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Evaluaciones Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Usuario
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Tipo
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Instrucciones
                </th>
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Feedback
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
              {filteredEvaluaciones.length > 0 ? (
                filteredEvaluaciones.map((evaluacion) => (
                  <tr
                    key={evaluacion.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{evaluacion.user_nombre}</p>
                        <p className="text-slate-400 text-xs">{evaluacion.user_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default">{evaluacion.tipo || 'Sin tipo'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">
                      {evaluacion.instrucciones || 'Sin instrucciones'}
                    </td>
                    <td className="px-6 py-4">
                      {evaluacion.feedback ? (
                        <Badge variant="success">Sí</Badge>
                      ) : (
                        <Badge variant="warning">No</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(evaluacion.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewEvaluacion(evaluacion)}
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
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No hay evaluaciones que coincidan con los filtros
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
          Mostrando {filteredEvaluaciones.length} de {evaluaciones.length} evaluaciones
        </p>
      </div>

      {/* Modal for viewing evaluacion */}
      {selectedEvaluacion && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Detalles de Evaluación"
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-700">
              <div>
                <p className="text-sm text-slate-400">Usuario</p>
                <p className="font-medium text-white">{selectedEvaluacion.user_nombre}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="font-medium text-white">{selectedEvaluacion.user_email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Tipo</p>
                <p className="font-medium text-white">{selectedEvaluacion.tipo || 'Sin tipo'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Fecha</p>
                <p className="font-medium text-white">{formatDate(selectedEvaluacion.created_at)}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-white">Instrucciones</h4>
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap text-slate-300">
                  {selectedEvaluacion.instrucciones || 'Sin instrucciones'}
                </p>
              </div>
            </div>

            {selectedEvaluacion.feedback && (
              <div>
                <h4 className="font-semibold mb-2 text-white">Feedback Generado</h4>
                <div className="bg-slate-800 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap text-slate-300">
                    {typeof selectedEvaluacion.feedback === 'string'
                      ? selectedEvaluacion.feedback
                      : JSON.stringify(selectedEvaluacion.feedback, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedEvaluacion.archivo_url && (
              <div>
                <h4 className="font-semibold mb-2">Archivo</h4>
                <a
                  href={selectedEvaluacion.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Ver archivo adjunto
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

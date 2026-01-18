'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminSurface } from '@/components/admin/AdminSurface'
import { Badge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type TipoObjetivo = 'contenido' | 'habilidad' | 'actitud'

interface ObjetivoAprendizaje {
  id: string
  codigo: string
  tipo_objetivo: TipoObjetivo
  categoria: string
  asignatura: string
  eje: string | null
  nivel: string
  curso: string
  objetivo: string
  priorizado: boolean
  actividades: { titulo: string; url: string }[]
  url_fuente: string | null
  version: string | null
  created_at: string
  updated_at: string
}

interface Filtros {
  categorias: string[]
  asignaturas: string[]
  niveles: string[]
  tipos: string[]
}

export default function ObjetivosAprendizajePage() {
  const [objetivos, setObjetivos] = useState<ObjetivoAprendizaje[]>([])
  const [filtros, setFiltros] = useState<Filtros>({
    categorias: [],
    asignaturas: [],
    niveles: [],
    tipos: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedObjetivo, setSelectedObjetivo] = useState<ObjetivoAprendizaje | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Filtros aplicados
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [asignaturaFilter, setAsignaturaFilter] = useState('')
  const [nivelFilter, setNivelFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [priorizadoFilter, setPriorizadoFilter] = useState('')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // Form data
  const [formData, setFormData] = useState({
    codigo: '',
    tipo_objetivo: 'contenido' as TipoObjetivo,
    categoria: '',
    asignatura: '',
    eje: '',
    nivel: '',
    curso: '',
    objetivo: '',
    priorizado: false,
    actividades: [] as { titulo: string; url: string }[],
    url_fuente: '',
    version: new Date().getFullYear().toString(),
  })

  const supabase = createClient()

  useEffect(() => {
    fetchFiltros()
  }, [])

  useEffect(() => {
    fetchObjetivos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    searchTerm,
    categoriaFilter,
    asignaturaFilter,
    nivelFilter,
    tipoFilter,
    priorizadoFilter,
  ])

  const fetchFiltros = async () => {
    try {
      const response = await fetch('/api/admin/objetivos-aprendizaje/filtros')
      const data = await response.json()

      if (response.ok) {
        setFiltros(data)
      }
    } catch (error) {
      console.error('Error fetching filtros:', error)
    }
  }

  const fetchObjetivos = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      })

      if (searchTerm) params.append('search', searchTerm)
      if (categoriaFilter) params.append('categoria', categoriaFilter)
      if (asignaturaFilter) params.append('asignatura', asignaturaFilter)
      if (nivelFilter) params.append('nivel', nivelFilter)
      if (tipoFilter) params.append('tipo_objetivo', tipoFilter)
      if (priorizadoFilter) params.append('priorizado', priorizadoFilter)

      const response = await fetch(`/api/admin/objetivos-aprendizaje?${params}`)
      const result = await response.json()

      if (response.ok) {
        setObjetivos(result.data)
        setTotalPages(result.pagination.totalPages)
        setTotal(result.pagination.total)
      } else {
        console.error('Error fetching objetivos:', result.error)
      }
    } catch (error) {
      console.error('Error fetching objetivos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setIsCreating(true)
    setSelectedObjetivo(null)
    setFormData({
      codigo: '',
      tipo_objetivo: 'contenido',
      categoria: '',
      asignatura: '',
      eje: '',
      nivel: '',
      curso: '',
      objetivo: '',
      priorizado: false,
      actividades: [],
      url_fuente: '',
      version: new Date().getFullYear().toString(),
    })
    setIsModalOpen(true)
  }

  const handleEdit = (objetivo: ObjetivoAprendizaje) => {
    setIsCreating(false)
    setSelectedObjetivo(objetivo)
    setFormData({
      codigo: objetivo.codigo,
      tipo_objetivo: objetivo.tipo_objetivo,
      categoria: objetivo.categoria,
      asignatura: objetivo.asignatura,
      eje: objetivo.eje || '',
      nivel: objetivo.nivel,
      curso: objetivo.curso,
      objetivo: objetivo.objetivo,
      priorizado: objetivo.priorizado,
      actividades: objetivo.actividades || [],
      url_fuente: objetivo.url_fuente || '',
      version: objetivo.version || new Date().getFullYear().toString(),
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const method = isCreating ? 'POST' : 'PATCH'
      const body = isCreating
        ? formData
        : {
            id: selectedObjetivo?.id,
            ...formData,
          }

      const response = await fetch('/api/admin/objetivos-aprendizaje', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchObjetivos()
        fetchFiltros() // Refrescar filtros por si se agregó nueva categoría/asignatura/etc
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving objetivo:', error)
      alert('Error guardando objetivo')
    }
  }

  const handleDelete = async () => {
    if (!selectedObjetivo) return

    try {
      const response = await fetch(
        `/api/admin/objetivos-aprendizaje?id=${selectedObjetivo.id}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setIsDeleteModalOpen(false)
        setSelectedObjetivo(null)
        fetchObjetivos()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting objetivo:', error)
      alert('Error eliminando objetivo')
    }
  }

  const handleExportCSV = () => {
    // Construir CSV
    const headers = [
      'Código',
      'Tipo',
      'Categoría',
      'Asignatura',
      'Eje',
      'Nivel',
      'Curso',
      'Objetivo',
      'Priorizado',
    ]

    const rows = objetivos.map((obj) => [
      obj.codigo,
      obj.tipo_objetivo,
      obj.categoria,
      obj.asignatura,
      obj.eje || '',
      obj.nivel,
      obj.curso,
      `"${obj.objetivo.replace(/"/g, '""')}"`,
      obj.priorizado ? 'Sí' : 'No',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `objetivos_aprendizaje_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCategoriaFilter('')
    setAsignaturaFilter('')
    setNivelFilter('')
    setTipoFilter('')
    setPriorizadoFilter('')
    setCurrentPage(1)
  }

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'contenido':
        return 'default'
      case 'habilidad':
        return 'warning'
      case 'actitud':
        return 'success'
      default:
        return 'default'
    }
  }

  if (isLoading && objetivos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando objetivos de aprendizaje...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Objetivos de Aprendizaje</h1>
          <p className="text-slate-400">
            Gestión y mantenimiento de objetivos de aprendizaje del currículum nacional de Chile
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear Objetivo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminSurface padding="sm" interactive>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{total}</h3>
              <p className="text-slate-400 text-sm">Total Objetivos</p>
            </div>
          </div>
        </AdminSurface>

        <AdminSurface padding="sm" interactive>
          <div>
            <h3 className="text-2xl font-bold text-white">
              {objetivos.filter((o) => o.tipo_objetivo === 'contenido').length}
            </h3>
            <p className="text-slate-400 text-sm">Contenido</p>
          </div>
        </AdminSurface>

        <AdminSurface padding="sm" interactive>
          <div>
            <h3 className="text-2xl font-bold text-white">
              {objetivos.filter((o) => o.tipo_objetivo === 'habilidad').length}
            </h3>
            <p className="text-slate-400 text-sm">Habilidades</p>
          </div>
        </AdminSurface>

        <AdminSurface padding="sm" interactive>
          <div>
            <h3 className="text-2xl font-bold text-white">
              {objetivos.filter((o) => o.priorizado).length}
            </h3>
            <p className="text-slate-400 text-sm">Priorizados</p>
          </div>
        </AdminSurface>
      </div>

      {/* Filtros */}
      <AdminSurface className="space-y-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <label className="block text-slate-400 text-sm mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Código, asignatura, objetivo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Categoría</label>
            <select
              value={categoriaFilter}
              onChange={(e) => {
                setCategoriaFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas</option>
              {filtros.categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Asignatura */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Asignatura</label>
            <select
              value={asignaturaFilter}
              onChange={(e) => {
                setAsignaturaFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas</option>
              {filtros.asignaturas.map((asig) => (
                <option key={asig} value={asig}>
                  {asig}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Nivel</label>
            <select
              value={nivelFilter}
              onChange={(e) => {
                setNivelFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos</option>
              {filtros.niveles.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Tipo</label>
            <select
              value={tipoFilter}
              onChange={(e) => {
                setTipoFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos</option>
              {filtros.tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros adicionales y botón limpiar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="priorizado-filter"
              checked={priorizadoFilter === 'true'}
              onChange={(e) => {
                setPriorizadoFilter(e.target.checked ? 'true' : '')
                setCurrentPage(1)
              }}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="priorizado-filter" className="text-slate-300 text-sm">
              Solo priorizados
            </label>
          </div>

          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>

          <button
            onClick={fetchObjetivos}
            className="flex items-center gap-2 px-3 py-1 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refrescar
          </button>
        </div>
      </AdminSurface>

      {/* Tabla */}
      <AdminSurface className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Código</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Tipo</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Asignatura</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Nivel</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Objetivo</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Estado</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {objetivos.map((objetivo) => (
                <tr
                  key={objetivo.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-white font-mono text-sm">{objetivo.codigo}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={getTipoBadgeVariant(objetivo.tipo_objetivo)}>
                      {objetivo.tipo_objetivo}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-white text-sm">{objetivo.asignatura}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-400 text-sm">{objetivo.nivel}</span>
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <p className="text-white text-sm line-clamp-2">{objetivo.objetivo}</p>
                  </td>
                  <td className="py-3 px-4">
                    {objetivo.priorizado && (
                      <Badge variant="success">Priorizado</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(objetivo)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedObjetivo(objetivo)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            Mostrando {(currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, total)} de {total} resultados
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-white px-4 py-2">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </AdminSurface>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isCreating ? 'Crear Objetivo de Aprendizaje' : 'Editar Objetivo de Aprendizaje'}
        size="2xl"
      >
        <div className="space-y-4">
              {/* Código */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">
                  Código <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ej: MA04 OA 01"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Tipo y Priorizado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Tipo <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.tipo_objetivo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_objetivo: e.target.value as TipoObjetivo,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="contenido">Contenido</option>
                    <option value="habilidad">Habilidad</option>
                    <option value="actitud">Actitud</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.priorizado}
                      onChange={(e) =>
                        setFormData({ ...formData, priorizado: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Objetivo Priorizado</span>
                  </label>
                </div>
              </div>

              {/* Categoría y Asignatura */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Categoría <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ej: Educación Básica 1° a 6°"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Asignatura <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.asignatura}
                    onChange={(e) => setFormData({ ...formData, asignatura: e.target.value })}
                    placeholder="Ej: Matemática"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Nivel y Curso */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Nivel <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nivel}
                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                    placeholder="Ej: 4° Básico"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Curso <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.curso}
                    onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                    placeholder="Ej: 4° Básico"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Eje */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Eje Curricular</label>
                <input
                  type="text"
                  value={formData.eje}
                  onChange={(e) => setFormData({ ...formData, eje: e.target.value })}
                  placeholder="Ej: Números y operaciones"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Objetivo */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">
                  Objetivo <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder="Descripción completa del objetivo de aprendizaje..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* URL Fuente y Versión */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">URL Fuente</label>
                  <input
                    type="text"
                    value={formData.url_fuente}
                    onChange={(e) => setFormData({ ...formData, url_fuente: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Versión</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="2025"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isCreating ? 'Crear' : 'Guardar Cambios'}
          </button>
        </div>
      </Modal>

      {/* Modal Eliminar */}
      <Modal
        isOpen={isDeleteModalOpen && !!selectedObjetivo}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar Objetivo"
        size="sm"
        variant="danger"
      >
        <p className="text-slate-300 mb-6">
          ¿Estás seguro de que deseas eliminar el objetivo{' '}
          <strong>{selectedObjetivo?.codigo}</strong>? Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}

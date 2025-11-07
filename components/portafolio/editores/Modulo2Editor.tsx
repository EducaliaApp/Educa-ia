// components/portafolio/editores/Modulo2Editor.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import {
  Upload,
  Video,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  PlayCircle,
  Clock,
  FileVideo,
} from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator'
import { createBrowserClient } from '@supabase/ssr'

// Schema de validación para la ficha descriptiva
const fichaDescriptivaSchema = z.object({
  curso_nivel: z.string().min(3, 'Indica el curso o nivel'),
  cantidad_estudiantes: z.number().min(1).max(50),
  objetivo_aprendizaje: z.string().min(50, 'Describe el objetivo con al menos 50 caracteres'),
  objetivo_propuesto_lograr: z.string().min(50, 'Explica qué propones lograr'),
  que_trabajo_antes: z.string().min(50, 'Describe qué se trabajó antes de esta clase'),
  que_trabajo_despues: z.string().min(50, 'Describe qué se trabajará después'),
  contribucion_desnaturalizar_genero: z.string().min(50, 'Explica cómo contribuyes a desnaturalizar estereotipos de género'),
  situaciones_interferentes: z.string().optional(),
  // Segmentos clave del video
  segmento_inicio: z.string().min(3, 'Ej: 0:00 - 5:30'),
  descripcion_inicio: z.string().min(30, 'Describe el momento de inicio'),
  segmento_desarrollo: z.string().min(3, 'Ej: 5:30 - 35:00'),
  descripcion_desarrollo: z.string().min(30, 'Describe el desarrollo'),
  segmento_cierre: z.string().min(3, 'Ej: 35:00 - 42:00'),
  descripcion_cierre: z.string().min(30, 'Describe el cierre'),
})

type FichaDescriptivaFormValues = z.infer<typeof fichaDescriptivaSchema>

interface Modulo2EditorProps {
  tareaId: string
  portafolioId: string
  initialData?: {
    video?: {
      url: string
      storage_path?: string
      duracion_segundos?: number
      nombre_archivo?: string
    }
    ficha?: Partial<FichaDescriptivaFormValues>
  }
  onSave: (data: any) => Promise<void>
  readOnly?: boolean
}

export function Modulo2Editor({
  tareaId,
  portafolioId,
  initialData,
  onSave,
  readOnly = false,
}: Modulo2EditorProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(initialData?.video?.url || null)
  const [videoStoragePath, setVideoStoragePath] = useState<string | null>(
    initialData?.video?.storage_path || null
  )
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(
    initialData?.video?.duracion_segundos || null
  )

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const form = useForm<FichaDescriptivaFormValues>({
    resolver: zodResolver(fichaDescriptivaSchema),
    defaultValues: initialData?.ficha || {
      curso_nivel: '',
      cantidad_estudiantes: 30,
      objetivo_aprendizaje: '',
      objetivo_propuesto_lograr: '',
      que_trabajo_antes: '',
      que_trabajo_despues: '',
      contribucion_desnaturalizar_genero: '',
      situaciones_interferentes: '',
      segmento_inicio: '',
      descripcion_inicio: '',
      segmento_desarrollo: '',
      descripcion_desarrollo: '',
      segmento_cierre: '',
      descripcion_cierre: '',
    },
  })

  // Guardado automático solo de la ficha
  const { isSaving, lastSaved, error: saveError } = useAutoSave({
    data: form.watch(),
    onSave: async (data) => {
      await onSave({
        video: {
          url: videoUrl,
          storage_path: videoStoragePath,
          duracion_segundos: videoDuration,
        },
        ficha: data,
      })
    },
    delay: 30000,
    enabled: !readOnly,
  })

  // Validar archivo de video
  const validateVideoFile = (file: File): string | null => {
    const validFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo'] // MP4, MOV, AVI
    if (!validFormats.includes(file.type)) {
      return 'Formato no válido. Usa MP4, MOV o AVI'
    }

    const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (file.size > maxSize) {
      return 'El archivo supera 2GB. Considera subirlo a Google Drive o YouTube'
    }

    return null
  }

  // Obtener duración del video
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        const duration = Math.floor(video.duration)
        resolve(duration)
      }

      video.onerror = () => {
        reject(new Error('No se pudo leer el archivo de video'))
      }

      video.src = URL.createObjectURL(file)
    })
  }

  // Manejar selección de archivo
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateVideoFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    try {
      const duration = await getVideoDuration(file)
      const durationMinutes = Math.floor(duration / 60)

      // Validar duración (40-45 minutos)
      if (durationMinutes < 40 || durationMinutes > 45) {
        setUploadError(
          `La clase debe durar entre 40 y 45 minutos. Tu video dura ${durationMinutes} minutos.`
        )
        return
      }

      setVideoFile(file)
      setVideoDuration(duration)
      setUploadError(null)
    } catch (error) {
      setUploadError('Error al procesar el video')
    }
  }

  // Subir video a Supabase Storage
  const handleUploadVideo = async () => {
    if (!videoFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      const fileName = `${portafolioId}/${Date.now()}_${videoFile.name}`
      const filePath = `videos-clase/${fileName}`

      // Subir archivo
      const { data, error } = await supabase.storage
        .from('portafolios')
        .upload(filePath, videoFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from('portafolios').getPublicUrl(filePath)

      setVideoUrl(publicUrl)
      setVideoStoragePath(filePath)
      setUploadProgress(100)

      // Guardar inmediatamente después de subir
      await onSave({
        video: {
          url: publicUrl,
          storage_path: filePath,
          duracion_segundos: videoDuration,
          nombre_archivo: videoFile.name,
        },
        ficha: form.getValues(),
      })
    } catch (error: any) {
      console.error('Error al subir video:', error)
      setUploadError(error.message || 'Error al subir el video')
    } finally {
      setIsUploading(false)
    }
  }

  // Eliminar video
  const handleRemoveVideo = async () => {
    if (!videoStoragePath) return

    try {
      const { error } = await supabase.storage.from('portafolios').remove([videoStoragePath])

      if (error) throw error

      setVideoUrl(null)
      setVideoStoragePath(null)
      setVideoFile(null)
      setVideoDuration(null)
      setUploadProgress(0)
    } catch (error: any) {
      console.error('Error al eliminar video:', error)
      setUploadError('Error al eliminar el video')
    }
  }

  const watchedValues = form.watch()
  const completitud = calculateCompletitud(watchedValues, !!videoUrl)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Módulo 2: Clase Grabada</h2>
          <p className="text-sm text-gray-600 mt-1">
            Sube tu video de clase (40-45 min) y completa la ficha descriptiva
          </p>
        </div>
        <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} error={saveError} />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${completitud}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700">{completitud}%</span>
        {completitud === 100 && <CheckCircle className="h-5 w-5 text-green-500" />}
      </div>

      {/* Alerta informativa */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Requisitos del video:</strong> Clase continua de 40-45 minutos, calidad mínima
          720p (HD), audio claro. Formato: MP4, MOV o AVI. Máximo 2GB.
        </AlertDescription>
      </Alert>

      {/* Sección de video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video de la Clase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!videoUrl ? (
            <>
              {/* Selector de archivo */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-blue-100 p-4 rounded-full">
                    <Upload className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-2">Selecciona el video de tu clase</p>
                    <p className="text-sm text-gray-600 mb-4">
                      MP4, MOV o AVI - Máximo 2GB - 40-45 minutos
                    </p>
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <Button asChild variant="outline" disabled={readOnly}>
                        <span>
                          <FileVideo className="mr-2 h-4 w-4" />
                          Seleccionar Archivo
                        </span>
                      </Button>
                    </label>
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </div>

              {/* Archivo seleccionado */}
              {videoFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileVideo className="h-6 w-6 text-blue-600 mt-1" />
                      <div>
                        <p className="font-semibold text-blue-900">{videoFile.name}</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Tamaño: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        {videoDuration && (
                          <p className="text-sm text-blue-700 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            Duración: {Math.floor(videoDuration / 60)} min{' '}
                            {videoDuration % 60} seg
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVideoFile(null)}
                      disabled={isUploading || readOnly}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {uploadError && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}

                  {!uploadError && (
                    <Button
                      onClick={handleUploadVideo}
                      disabled={isUploading || readOnly}
                      className="mt-4 w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Subiendo... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Subir Video
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Opción de enlace externo */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>¿Tu video supera 2GB?</strong> Súbelo a Google Drive o YouTube (no
                  listado) y pega el enlace aquí:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://drive.google.com/... o https://youtu.be/..."
                    disabled={readOnly}
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        setVideoUrl(e.target.value.trim())
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (videoUrl) {
                        onSave({
                          video: { url: videoUrl, duracion_segundos: 40 * 60 },
                          ficha: form.getValues(),
                        })
                      }
                    }}
                    disabled={!videoUrl || readOnly}
                  >
                    Guardar Enlace
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Video subido exitosamente */
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <p className="font-semibold text-green-900">Video subido correctamente</p>
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 underline inline-flex items-center gap-1 mt-1"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Ver video
                    </a>
                    {videoDuration && (
                      <p className="text-sm text-green-700 mt-1">
                        Duración: {Math.floor(videoDuration / 60)} minutos
                      </p>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveVideo}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ficha Descriptiva */}
      <Card>
        <CardHeader>
          <CardTitle>Ficha Descriptiva de la Clase</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="space-y-6">
              {/* Contexto de la clase */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="curso_nivel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Curso o Nivel <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: 5° Básico A" disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cantidad_estudiantes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cantidad de Estudiantes <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Objetivos */}
              <FormField
                control={form.control}
                name="objetivo_aprendizaje"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Objetivo(s) de Aprendizaje <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Describe los objetivos de aprendizaje trabajados en la clase grabada..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0} / 500 caracteres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objetivo_propuesto_lograr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Qué te propusiste lograr en esta clase?{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Explica qué te propusiste lograr específicamente con esta clase..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0} / 500 caracteres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contexto temporal */}
              <FormField
                control={form.control}
                name="que_trabajo_antes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Qué se trabajó antes de esta clase?{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Describe qué contenidos o habilidades se trabajaron antes de esta clase..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0} / 400 caracteres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="que_trabajo_despues"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Qué se trabajará después de esta clase?{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Describe qué contenidos o habilidades se trabajarán después..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0} / 400 caracteres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Género */}
              <FormField
                control={form.control}
                name="contribucion_desnaturalizar_genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Cómo contribuyes a desnaturalizar estereotipos de género?{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Describe estrategias o momentos donde trabajas la igualdad de género y desnaturalizas estereotipos..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0} / 500 caracteres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Situaciones interferentes (opcional) */}
              <FormField
                control={form.control}
                name="situaciones_interferentes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situaciones Interferentes (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Si hubo situaciones que interfirieron con el desarrollo normal de la clase, descríbelas aquí..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe situaciones imprevistas que afectaron la clase
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Segmentos clave del video */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Segmentos Clave del Video</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Indica los tiempos y describe los momentos más relevantes de tu clase
                </p>

                <div className="space-y-6">
                  {/* Inicio */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Inicio de la Clase</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="segmento_inicio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiempo</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="0:00 - 5:30"
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="descripcion_inicio"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={2}
                                placeholder="Describe lo que sucede en el inicio..."
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Desarrollo */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3">Desarrollo de la Clase</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="segmento_desarrollo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiempo</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="5:30 - 35:00"
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="descripcion_desarrollo"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={2}
                                placeholder="Describe lo que sucede en el desarrollo..."
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Cierre */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-3">Cierre de la Clase</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="segmento_cierre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiempo</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="35:00 - 42:00"
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="descripcion_cierre"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={2}
                                placeholder="Describe lo que sucede en el cierre..."
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

// Función para calcular completitud
function calculateCompletitud(
  values: Partial<FichaDescriptivaFormValues>,
  hasVideo: boolean
): number {
  const checks = [
    hasVideo,
    (values.curso_nivel?.length || 0) >= 3,
    (values.cantidad_estudiantes || 0) >= 1,
    (values.objetivo_aprendizaje?.length || 0) >= 50,
    (values.objetivo_propuesto_lograr?.length || 0) >= 50,
    (values.que_trabajo_antes?.length || 0) >= 50,
    (values.que_trabajo_despues?.length || 0) >= 50,
    (values.contribucion_desnaturalizar_genero?.length || 0) >= 50,
    (values.segmento_inicio?.length || 0) >= 3,
    (values.descripcion_inicio?.length || 0) >= 30,
    (values.segmento_desarrollo?.length || 0) >= 3,
    (values.descripcion_desarrollo?.length || 0) >= 30,
    (values.segmento_cierre?.length || 0) >= 3,
    (values.descripcion_cierre?.length || 0) >= 30,
  ]

  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}

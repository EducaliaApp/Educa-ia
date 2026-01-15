// components/portafolio/InstruccionesEnvio.tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/Separator'
import {
  Info,
  AlertCircle,
  CheckCircle,
  Calendar,
  ExternalLink,
  Download,
  Video,
  Send,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface InstruccionesEnvioProps {
  portafolio: {
    id: string
    año_evaluacion: number
    asignatura: string
    nivel_educativo: string
    fecha_limite?: string
    estado: 'borrador' | 'en_revision' | 'completado' | 'enviado'
    video_link?: string
  }
  onDescargarPDF?: () => Promise<void>
  onMarcarEnviado?: () => Promise<void>
}

export function InstruccionesEnvio({
  portafolio,
  onDescargarPDF,
  onMarcarEnviado,
}: InstruccionesEnvioProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [marcadoEnviado, setMarcadoEnviado] = useState(portafolio.estado === 'enviado')

  // Calcular días restantes
  const fechaLimite = portafolio.fecha_limite ? new Date(portafolio.fecha_limite) : null
  const hoy = new Date()
  const diasRestantes = fechaLimite ? differenceInDays(fechaLimite, hoy) : null

  // Determinar variante de badge según días restantes
  const getBadgeVariant = (dias: number | null) => {
    if (!dias) return 'default'
    if (dias <= 7) return 'danger'
    if (dias <= 30) return 'warning'
    return 'default'
  }

  const handleMarcarEnviado = async () => {
    setIsLoading(true)
    try {
      await onMarcarEnviado?.()
      setMarcadoEnviado(true)
    } catch (error) {
      console.error('Error al marcar como enviado:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Instrucciones para Envío Oficial al MINEDUC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              ProfeFlow te ayuda a <strong>crear y revisar</strong> tu portafolio, pero el{' '}
              <strong>envío oficial debe hacerse en www.docentemas.cl</strong>, la plataforma oficial del MINEDUC.
            </AlertDescription>
          </Alert>

          {/* Fecha límite */}
          {fechaLimite && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Fecha Límite de Entrega</h4>
                  <p className="text-lg font-bold text-gray-900">
                    {format(fechaLimite, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                  {diasRestantes !== null && (
                    <Badge className="mt-2" variant={getBadgeVariant(diasRestantes)}>
                      {diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Plazo vencido'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pasos para enviar */}
      <Card>
        <CardHeader>
          <CardTitle>Pasos para Enviar tu Portafolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Paso 1 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                1
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Ingresar a DocenteMás</h3>
                <p className="text-gray-600 mb-3">
                  Ingresa a{' '}
                  <a
                    href="https://www.docentemas.cl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline inline-flex items-center gap-1"
                  >
                    www.docentemas.cl
                    <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  e inicia sesión con tu RUT y clave única.
                </p>
                <Alert>
                  <AlertDescription className="text-sm">
                    Si no tienes cuenta, debes registrarte primero en la plataforma DocenteMás.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <Separator />

            {/* Paso 2 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                2
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Ir a tu Portafolio {portafolio.año_evaluacion}</h3>
                <p className="text-gray-600 mb-3">
                  En el menú principal, selecciona la sección{' '}
                  <strong>&ldquo;Portafolio Docente {portafolio.año_evaluacion}&rdquo;</strong>.
                </p>
              </div>
            </div>

            <Separator />

            {/* Paso 3 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                3
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Subir archivo PDF del portafolio</h3>
                <p className="text-gray-600 mb-3">
                  Haz clic en &ldquo;Subir Portafolio&rdquo; y selecciona el archivo PDF que descargaste desde ProfeFlow.
                </p>
                {onDescargarPDF && (
                  <Button variant="outline" size="sm" onClick={onDescargarPDF} className="mb-2">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF nuevamente
                  </Button>
                )}
                <Alert className="mt-3">
                  <FileText className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Archivo requerido:</strong> PDF en formato oficial con todos los módulos completados.
                    El tamaño máximo permitido es de 10 MB.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <Separator />

            {/* Paso 4 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                4
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Subir video de clase (Módulo 2)</h3>
                <p className="text-gray-600 mb-3">
                  Si el video supera 2GB, súbelo primero a tu Google Drive o YouTube (como video no listado)
                  y pega el enlace en DocenteMás.
                </p>
                {portafolio.video_link && (
                  <Alert>
                    <Video className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Tu video está en:{' '}
                      <a
                        href={portafolio.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline inline-flex items-center gap-1"
                      >
                        Ver video
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p>
                    <strong>Requisitos del video:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Duración: 40-45 minutos de clase continua</li>
                    <li>Calidad mínima: 720p (HD)</li>
                    <li>Audio claro y audible</li>
                    <li>Formato: MP4, MOV, AVI</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Paso 5 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                5
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Verificar datos y completitud</h3>
                <p className="text-gray-600 mb-3">
                  Revisa que todos tus datos estén correctos y que todos los módulos estén completos antes de enviar.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Módulo 1: Planificación, Evaluación y Reflexión</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Módulo 2: Clase Grabada con ficha descriptiva</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Módulo 3: Trabajo Colaborativo</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Paso 6 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                6
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Enviar portafolio</h3>
                <p className="text-gray-600 mb-3">
                  Haz clic en <strong>&ldquo;Enviar Portafolio&rdquo;</strong> y confirma el envío.
                </p>
                <Alert className="bg-red-50 border-red-300">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>⚠️ IMPORTANTE:</strong> Una vez enviado, NO podrás hacer cambios. Asegúrate de que
                    todo esté correcto antes de confirmar.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <Separator />

            {/* Paso 7 */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                7
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Guardar comprobante</h3>
                <p className="text-gray-600 mb-3">
                  Descarga y guarda el comprobante de envío con tu número de folio. Este es tu respaldo oficial.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ayuda */}
      <Card>
        <CardHeader>
          <CardTitle>¿Necesitas ayuda?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium">Mesa de ayuda MINEDUC</p>
                <p className="text-gray-600">600 600 2626 (opción Portafolio)</p>
                <p className="text-sm text-gray-500">Lunes a viernes, 9:00 - 18:00 hrs</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium">Correo electrónico</p>
                <a href="mailto:ayuda@docentemas.cl" className="text-blue-600 underline">
                  ayuda@docentemas.cl
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium">Manual oficial</p>
                <a
                  href="https://www.docentemas.cl/portafolio/manuales"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline inline-flex items-center gap-1"
                >
                  Descargar manual de envío
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marcar como enviado */}
      {!marcadoEnviado && portafolio.estado !== 'enviado' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2 text-green-900">
                  ¿Ya enviaste tu portafolio a DocenteMás?
                </h4>
                <p className="text-sm text-green-800 mb-4">
                  Marca tu portafolio como enviado en ProfeFlow para mantener tu registro actualizado.
                  Esto bloqueará la edición para evitar cambios accidentales.
                </p>
                <Button onClick={handleMarcarEnviado} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                  {isLoading ? (
                    <>Marcando...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Marcar como Enviado
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ya enviado */}
      {(marcadoEnviado || portafolio.estado === 'enviado') && (
        <Alert className="bg-blue-50 border-blue-200">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900">Portafolio Enviado</AlertTitle>
          <AlertDescription className="text-blue-800">
            Este portafolio fue marcado como enviado al MINEDUC. La edición ha sido bloqueada.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

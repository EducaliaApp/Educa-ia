// components/portafolio/ExportarPDFOficial.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileCheck,
} from 'lucide-react'
import { generarYDescargarPDFOficial } from '@/lib/pdf/generador-pdf-oficial-mineduc'

interface ExportarPDFOficialProps {
  portafolio: any // Datos completos del portafolio
  disabled?: boolean
  onExportSuccess?: () => void
  onExportError?: (error: Error) => void
}

export function ExportarPDFOficial({
  portafolio,
  disabled = false,
  onExportSuccess,
  onExportError,
}: ExportarPDFOficialProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  // Verificar completitud del portafolio
  const verificarCompletitud = () => {
    const checks = {
      profesor: !!portafolio.profesor?.nombre_completo,
      modulo1: !!portafolio.modulo1?.tarea1 && !!portafolio.modulo1?.tarea2,
      modulo2: !!portafolio.modulo2?.video && !!portafolio.modulo2?.ficha,
      modulo3: !!portafolio.modulo3?.trabajo_colaborativo,
    }

    const faltantes: string[] = []
    if (!checks.profesor) faltantes.push('Datos del profesor')
    if (!checks.modulo1) faltantes.push('Módulo 1 (Tareas 1 y 2 obligatorias)')
    if (!checks.modulo2) faltantes.push('Módulo 2 (Video y ficha)')
    if (!checks.modulo3) faltantes.push('Módulo 3 (Trabajo colaborativo)')

    return {
      completo: faltantes.length === 0,
      faltantes,
    }
  }

  const { completo, faltantes } = verificarCompletitud()

  const handleGenerarPDF = async () => {
    setIsGenerating(true)

    try {
      await generarYDescargarPDFOficial({
        profesor: {
          nombre_completo: portafolio.profesor?.nombre_completo || '',
          rut: portafolio.profesor?.rut || '',
          establecimiento: portafolio.profesor?.establecimiento || '',
          rbd: portafolio.profesor?.rbd || '',
          comuna: portafolio.profesor?.comuna || '',
          region: portafolio.profesor?.region || '',
        },
        portafolio: {
          año_evaluacion: portafolio.año_evaluacion,
          asignatura: portafolio.asignatura,
          nivel_educativo: portafolio.nivel_educativo,
          curso: portafolio.curso || `Curso ${portafolio.año_evaluacion}`,
          numero_estudiantes: portafolio.numero_estudiantes || 30,
          fecha_elaboracion: new Date(),
        },
        modulo1: portafolio.modulo1,
        modulo2: portafolio.modulo2,
        modulo3: portafolio.modulo3,
      })

      setLastGenerated(new Date())
      onExportSuccess?.()
    } catch (error) {
      console.error('Error al generar PDF:', error)
      const err = error instanceof Error ? error : new Error('Error desconocido al generar PDF')
      onExportError?.(err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <FileText className="h-5 w-5" />
          Exportar PDF Oficial MINEDUC
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-green-800 mb-3">
              Descarga tu portafolio en formato oficial para enviar a la plataforma DocenteMás del MINEDUC.
            </p>

            {completo ? (
              <Alert className="bg-green-100 border-green-300">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Portafolio completo</strong> - Todos los módulos obligatorios están listos
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-300">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Portafolio incompleto.</strong> Faltan:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {faltantes.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Características del PDF */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h4 className="font-semibold text-sm text-green-900 mb-3">
            Características del PDF Oficial:
          </h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Formato oficial según Manual MINEDUC 2025</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Portada con todos tus datos profesionales</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Tabla de contenidos automática</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Numeración de páginas profesional</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Estructura por módulos y tareas</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Listo para subir a DocenteMás</span>
            </li>
          </ul>
        </div>

        {/* Botón de descarga */}
        <div className="flex items-center justify-between pt-4 border-t border-green-200">
          <div className="flex items-center gap-2">
            {lastGenerated && (
              <Badge variant="success" className="text-xs">
                <FileCheck className="h-3 w-3 mr-1" />
                Generado hace poco
              </Badge>
            )}
          </div>
          <Button
            onClick={handleGenerarPDF}
            disabled={disabled || isGenerating || !completo}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Descargar PDF Oficial
              </>
            )}
          </Button>
        </div>

        {!completo && (
          <p className="text-xs text-gray-600 text-center">
            Completa todos los módulos obligatorios para habilitar la descarga
          </p>
        )}
      </CardContent>
    </Card>
  )
}

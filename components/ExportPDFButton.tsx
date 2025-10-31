'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import Button from './ui/Button'
import jsPDF from 'jspdf'

interface ExportPDFButtonProps {
  planificacion: any
  isPro: boolean
}

export default function ExportPDFButton({ planificacion, isPro }: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const generatePDF = () => {
    setLoading(true)

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const lineHeight = 7
      let yPosition = margin

      // Función auxiliar para agregar texto con salto de página
      const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')

        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin)
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            doc.addPage()
            yPosition = margin
          }
          doc.text(line, margin, yPosition)
          yPosition += lineHeight
        })
      }

      // Título principal
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('ProfeFlow - Planificación Curricular', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      // Información básica
      addText(`Unidad: ${planificacion.unidad}`, 14, true)
      yPosition += 2
      addText(`Asignatura: ${planificacion.asignatura}`)
      addText(`Nivel: ${planificacion.nivel}`)
      addText(`Duración: ${planificacion.duracion_clases} clases`)
      yPosition += 10

      const contenido = planificacion.contenido

      // Objetivos de Aprendizaje
      if (contenido.objetivosAprendizaje) {
        addText('OBJETIVOS DE APRENDIZAJE', 13, true)
        yPosition += 2
        contenido.objetivosAprendizaje.forEach((objetivo: string, index: number) => {
          addText(`${index + 1}. ${objetivo}`)
        })
        yPosition += 5
      }

      // Clases
      if (contenido.clases) {
        contenido.clases.forEach((clase: any) => {
          addText(`CLASE ${clase.numero}: ${clase.titulo}`, 13, true)
          yPosition += 2

          if (clase.objetivo) {
            addText('Objetivo:', 11, true)
            addText(clase.objetivo)
            yPosition += 2
          }

          addText('Inicio (15 min):', 11, true)
          addText(clase.inicio)
          yPosition += 2

          addText('Desarrollo (60 min):', 11, true)
          addText(clase.desarrollo)
          yPosition += 2

          addText('Cierre (15 min):', 11, true)
          addText(clase.cierre)
          yPosition += 2

          if (clase.materiales && clase.materiales.length > 0) {
            addText('Materiales:', 11, true)
            clase.materiales.forEach((material: string) => {
              addText(`• ${material}`)
            })
            yPosition += 2
          }

          if (clase.indicadores && clase.indicadores.length > 0) {
            addText('Indicadores de Evaluación:', 11, true)
            clase.indicadores.forEach((indicador: string) => {
              addText(`• ${indicador}`)
            })
          }

          yPosition += 5
        })
      }

      // Evaluación
      if (contenido.evaluacion) {
        addText('EVALUACIÓN DE LA UNIDAD', 13, true)
        yPosition += 2
        addText(contenido.evaluacion)
        yPosition += 5
      }

      // Recursos
      if (contenido.recursos && contenido.recursos.length > 0) {
        addText('RECURSOS RECOMENDADOS', 13, true)
        yPosition += 2
        contenido.recursos.forEach((recurso: string) => {
          addText(`• ${recurso}`)
        })
        yPosition += 10
      }

      // Marca de agua si es FREE
      if (!isPro) {
        doc.setFontSize(10)
        doc.setTextColor(150, 150, 150)
        doc.text('Generado con ProfeFlow FREE', pageWidth / 2, pageHeight - 10, { align: 'center' })
        doc.text('Actualiza a PRO para quitar esta marca de agua', pageWidth / 2, pageHeight - 5, { align: 'center' })
      }

      // Descargar PDF
      doc.save(`${planificacion.unidad}.pdf`)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={generatePDF} loading={loading}>
      <Download className="h-4 w-4 mr-2" />
      PDF
    </Button>
  )
}

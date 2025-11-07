// lib/pdf/generador-pdf-oficial-mineduc.ts
import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PortafolioCompleto {
  // Metadatos
  profesor: {
    nombre_completo: string
    rut: string
    establecimiento: string
    rbd: string
    comuna: string
    region: string
  }
  portafolio: {
    año_evaluacion: number
    asignatura: string
    nivel_educativo: string
    curso: string
    numero_estudiantes: number
    fecha_elaboracion: Date
  }
  // Módulos
  modulo1?: {
    tarea1?: any
    tarea2?: any
    tarea3?: any
  }
  modulo2?: {
    video?: {
      url: string
      duracion_minutos: number
    }
    ficha?: any
  }
  modulo3?: {
    trabajo_colaborativo?: any
  }
}

export class GeneradorPDFOficialMINEDUC {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number = 20
  private yPosition: number = 20
  private lineHeight: number = 7
  private readonly PRIMARY_COLOR = [37, 99, 235] // Blue-600
  private readonly SECONDARY_COLOR = [107, 114, 128] // Gray-500

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter', // 8.5" x 11" (estándar MINEDUC)
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
  }

  /**
   * Genera el PDF completo del portafolio
   */
  public async generar(datos: PortafolioCompleto): Promise<jsPDF> {
    // Configurar metadatos del PDF
    this.doc.setProperties({
      title: `Portafolio Docente ${datos.portafolio.año_evaluacion}`,
      author: datos.profesor.nombre_completo,
      subject: 'Sistema de Reconocimiento Profesional Docente',
      keywords: 'portafolio, docente, evaluación, mineduc, chile',
      creator: 'ProfeFlow',
    })

    // Generar secciones
    this.generarPortada(datos)
    this.agregarNuevaPagina()
    this.generarTablaContenidos()
    this.agregarNuevaPagina()

    if (datos.modulo1) {
      this.generarModulo1(datos.modulo1)
      this.agregarNuevaPagina()
    }

    if (datos.modulo2) {
      this.generarModulo2(datos.modulo2)
      this.agregarNuevaPagina()
    }

    if (datos.modulo3) {
      this.generarModulo3(datos.modulo3)
    }

    // Numerar páginas (excepto portada)
    this.numerarPaginas()

    return this.doc
  }

  /**
   * Portada oficial MINEDUC
   */
  private generarPortada(datos: PortafolioCompleto) {
    const centerX = this.pageWidth / 2

    // Logo o espacio para logo
    this.yPosition = 40

    // Título principal
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.PRIMARY_COLOR)
    this.doc.text('PORTAFOLIO DOCENTE', centerX, this.yPosition, { align: 'center' })

    this.yPosition += 12
    this.doc.setFontSize(20)
    this.doc.text(String(datos.portafolio.año_evaluacion), centerX, this.yPosition, { align: 'center' })

    this.yPosition += 15
    this.doc.setFontSize(14)
    this.doc.setTextColor(...this.SECONDARY_COLOR)
    this.doc.text('Sistema de Reconocimiento', centerX, this.yPosition, { align: 'center' })
    this.yPosition += 7
    this.doc.text('Profesional Docente', centerX, this.yPosition, { align: 'center' })

    // Línea decorativa
    this.yPosition += 15
    const lineWidth = 100
    this.doc.setDrawColor(...this.PRIMARY_COLOR)
    this.doc.setLineWidth(0.5)
    this.doc.line(
      centerX - lineWidth / 2,
      this.yPosition,
      centerX + lineWidth / 2,
      this.yPosition
    )

    // Datos del docente
    this.yPosition += 20
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('DATOS DEL DOCENTE', this.margin, this.yPosition)

    this.yPosition += 10
    this.doc.setFont('helvetica', 'normal')
    this.agregarCampo('Nombre', datos.profesor.nombre_completo)
    this.agregarCampo('RUT', datos.profesor.rut)
    this.agregarCampo('Establecimiento', datos.profesor.establecimiento)
    this.agregarCampo('RBD', datos.profesor.rbd)
    this.agregarCampo('Comuna', datos.profesor.comuna)
    this.agregarCampo('Región', datos.profesor.region)

    // Datos del portafolio
    this.yPosition += 10
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('DATOS DEL PORTAFOLIO', this.margin, this.yPosition)

    this.yPosition += 10
    this.doc.setFont('helvetica', 'normal')
    this.agregarCampo('Nivel', this.formatearNivelEducativo(datos.portafolio.nivel_educativo))
    this.agregarCampo('Asignatura', datos.portafolio.asignatura)
    this.agregarCampo('Curso', datos.portafolio.curso)
    this.agregarCampo('N° Estudiantes', String(datos.portafolio.numero_estudiantes))

    // Fecha de elaboración
    this.yPosition = this.pageHeight - 30
    this.doc.setFontSize(10)
    this.doc.setTextColor(...this.SECONDARY_COLOR)
    this.doc.text(
      `Fecha de elaboración: ${format(datos.portafolio.fecha_elaboracion, 'dd/MM/yyyy', {
        locale: es,
      })}`,
      centerX,
      this.yPosition,
      { align: 'center' }
    )

    // Footer
    this.yPosition += 10
    this.doc.setFontSize(9)
    this.doc.text('Generado con ProfeFlow', centerX, this.yPosition, { align: 'center' })
  }

  /**
   * Tabla de contenidos
   */
  private generarTablaContenidos() {
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.PRIMARY_COLOR)
    this.doc.text('TABLA DE CONTENIDOS', this.margin, this.yPosition)

    this.yPosition += 15
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(0, 0, 0)

    const contenidos = [
      { titulo: 'MÓDULO 1: Planificación, Evaluación y Reflexión', pagina: 3 },
      { titulo: '  Tarea 1: Planificación de la Enseñanza', pagina: 3 },
      { titulo: '  Tarea 2: Evaluación para el Aprendizaje', pagina: '...' },
      { titulo: '  Tarea 3: Reflexión Pedagógica (Opcional)', pagina: '...' },
      { titulo: 'MÓDULO 2: Clase Grabada', pagina: '...' },
      { titulo: '  Video de la Clase', pagina: '...' },
      { titulo: '  Ficha Descriptiva', pagina: '...' },
      { titulo: 'MÓDULO 3: Trabajo Colaborativo', pagina: '...' },
      { titulo: '  Parte Obligatoria', pagina: '...' },
      { titulo: '  Parte Voluntaria (si aplica)', pagina: '...' },
    ]

    contenidos.forEach((item) => {
      if (this.yPosition > this.pageHeight - this.margin) {
        this.agregarNuevaPagina()
      }

      const puntosX = this.pageWidth - this.margin - 20
      this.doc.text(item.titulo, this.margin, this.yPosition)
      this.doc.text(String(item.pagina), puntosX, this.yPosition, { align: 'right' })

      // Línea de puntos
      if (item.titulo.startsWith('  ')) {
        const textoWidth = this.doc.getTextWidth(item.titulo)
        const paginaWidth = this.doc.getTextWidth(String(item.pagina))
        const startDots = this.margin + textoWidth + 2
        const endDots = puntosX - paginaWidth - 2

        this.doc.setFontSize(8)
        let x = startDots
        while (x < endDots) {
          this.doc.text('.', x, this.yPosition)
          x += 2
        }
        this.doc.setFontSize(11)
      }

      this.yPosition += this.lineHeight
    })
  }

  /**
   * Módulo 1: Planificación, Evaluación y Reflexión
   */
  private generarModulo1(modulo: any) {
    this.generarTituloModulo('MÓDULO 1', 'Planificación, Evaluación y Reflexión')

    if (modulo.tarea1) {
      this.generarSubtitulo('TAREA 1: PLANIFICACIÓN DE LA ENSEÑANZA')
      // Aquí iría el contenido detallado de la tarea 1
      this.agregarTexto('Contenido de la planificación...')
      // (Implementar según estructura de datos)
    }

    if (modulo.tarea2) {
      this.agregarNuevaPagina()
      this.generarSubtitulo('TAREA 2: EVALUACIÓN PARA EL APRENDIZAJE')
      this.agregarTexto('Contenido de la evaluación...')
    }

    if (modulo.tarea3) {
      this.agregarNuevaPagina()
      this.generarSubtitulo('TAREA 3: REFLEXIÓN PEDAGÓGICA (OPCIONAL)')
      this.agregarTexto('Contenido de la reflexión...')
    }
  }

  /**
   * Módulo 2: Clase Grabada
   */
  private generarModulo2(modulo: any) {
    this.generarTituloModulo('MÓDULO 2', 'Clase Grabada')

    if (modulo.video) {
      this.generarSubtitulo('VIDEO DE LA CLASE')
      this.agregarCampo('Duración', `${modulo.video.duracion_minutos} minutos`)
      this.agregarCampo('Enlace', modulo.video.url)

      // Nota importante
      this.yPosition += 5
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'italic')
      this.doc.setTextColor(...this.SECONDARY_COLOR)
      this.agregarTextoConSalto(
        'Nota: El video debe ser visualizado en la plataforma DocenteMás. ' +
          'Este documento incluye el enlace para acceso de los evaluadores.'
      )
    }

    if (modulo.ficha) {
      this.yPosition += 10
      this.generarSubtitulo('FICHA DESCRIPTIVA DE LA CLASE')
      this.agregarTexto('Contenido de la ficha descriptiva...')
    }
  }

  /**
   * Módulo 3: Trabajo Colaborativo
   */
  private generarModulo3(modulo: any) {
    this.generarTituloModulo('MÓDULO 3', 'Trabajo Colaborativo entre Docentes')

    if (modulo.trabajo_colaborativo) {
      this.generarSubtitulo('PARTE OBLIGATORIA')
      this.agregarTexto('Contenido del trabajo colaborativo...')

      // Parte voluntaria si existe
      if (modulo.trabajo_colaborativo.parte_voluntaria) {
        this.yPosition += 10
        this.generarSubtitulo('PARTE VOLUNTARIA')
        this.agregarTexto('Contenido de la parte voluntaria...')
      }
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  private generarTituloModulo(numero: string, titulo: string) {
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.PRIMARY_COLOR)
    this.doc.text(numero, this.margin, this.yPosition)

    this.yPosition += 8
    this.doc.setFontSize(14)
    this.doc.text(titulo, this.margin, this.yPosition)

    // Línea separadora
    this.yPosition += 5
    this.doc.setDrawColor(...this.PRIMARY_COLOR)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition)

    this.yPosition += 10
    this.doc.setTextColor(0, 0, 0)
  }

  private generarSubtitulo(texto: string) {
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(texto, this.margin, this.yPosition)

    this.yPosition += 8
    this.doc.setFont('helvetica', 'normal')
  }

  private agregarCampo(label: string, valor: string) {
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(`${label}:`, this.margin, this.yPosition)

    this.doc.setFont('helvetica', 'normal')
    const labelWidth = this.doc.getTextWidth(`${label}: `)
    this.doc.text(valor, this.margin + labelWidth, this.yPosition)

    this.yPosition += this.lineHeight
  }

  private agregarTexto(texto: string) {
    this.agregarTextoConSalto(texto)
  }

  private agregarTextoConSalto(texto: string) {
    const maxWidth = this.pageWidth - 2 * this.margin
    const lines = this.doc.splitTextToSize(texto, maxWidth)

    lines.forEach((line: string) => {
      if (this.yPosition > this.pageHeight - this.margin) {
        this.agregarNuevaPagina()
      }
      this.doc.text(line, this.margin, this.yPosition)
      this.yPosition += this.lineHeight
    })
  }

  private agregarNuevaPagina() {
    this.doc.addPage()
    this.yPosition = this.margin
  }

  private numerarPaginas() {
    const totalPages = this.doc.internal.pages.length - 1 // -1 para excluir página vacía interna

    for (let i = 2; i <= totalPages; i++) {
      // Empezar desde página 2 (excluir portada)
      this.doc.setPage(i)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.SECONDARY_COLOR)
      this.doc.text(
        `Página ${i - 1} de ${totalPages - 1}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      )
    }
  }

  private formatearNivelEducativo(nivel: string): string {
    const niveles: Record<string, string> = {
      parvularia: 'Educación Parvularia',
      basica_1_6: 'Educación Básica 1° a 6°',
      basica_7_8_media: 'Educación Básica 7° a 8° y Media',
      media_tp: 'Educación Media Técnico-Profesional',
      epja: 'Educación de Personas Jóvenes y Adultas',
      especial_regular: 'Educación Especial Regular',
      especial_neep: 'Educación Especial NEE Permanentes',
      hospitalaria: 'Educación Hospitalaria',
      encierro: 'Educación en Contextos de Encierro',
      lengua_indigena: 'Lengua Indígena',
    }

    return niveles[nivel] || nivel
  }

  /**
   * Descarga el PDF con el nombre apropiado
   */
  public descargar(nombreArchivo: string) {
    this.doc.save(nombreArchivo)
  }

  /**
   * Retorna el PDF como Blob para subirlo
   */
  public getBlob(): Blob {
    return this.doc.output('blob')
  }
}

/**
 * Función helper para generar PDF desde componente React
 */
export async function generarYDescargarPDFOficial(datos: PortafolioCompleto) {
  const generador = new GeneradorPDFOficialMINEDUC()
  await generador.generar(datos)

  const nombreArchivo = `Portafolio_${datos.portafolio.año_evaluacion}_${datos.portafolio.asignatura.replace(
    /\s+/g,
    '_'
  )}.pdf`

  generador.descargar(nombreArchivo)
}

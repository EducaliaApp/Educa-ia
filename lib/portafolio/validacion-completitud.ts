// lib/portafolio/validacion-completitud.ts

/**
 * Sistema de validación de completitud de portafolios
 * Verifica que todos los campos obligatorios estén completos
 */

export interface ValidacionResultado {
  completo: boolean
  progreso: number // 0-100
  errores: string[]
  advertencias: string[]
  detalle: {
    modulo1: ModuloValidacion
    modulo2: ModuloValidacion
    modulo3: ModuloValidacion
  }
}

export interface ModuloValidacion {
  completo: boolean
  progreso: number
  tareas: TareaValidacion[]
}

export interface TareaValidacion {
  numero: number
  nombre: string
  completa: boolean
  campos_faltantes: string[]
}

/**
 * Valida completitud del portafolio completo
 */
export async function validarCompletitudPortafolio(
  portafolio: any
): Promise<ValidacionResultado> {
  const errores: string[] = []
  const advertencias: string[] = []

  // Validar Módulo 1
  const modulo1 = validarModulo1(portafolio.modulo1)
  if (!modulo1.completo) {
    modulo1.tareas.forEach((tarea) => {
      if (!tarea.completa) {
        errores.push(`Módulo 1, ${tarea.nombre}: ${tarea.campos_faltantes.join(', ')}`)
      }
    })
  }

  // Validar Módulo 2
  const modulo2 = validarModulo2(portafolio.modulo2)
  if (!modulo2.completo) {
    modulo2.tareas.forEach((tarea) => {
      if (!tarea.completa) {
        errores.push(`Módulo 2, ${tarea.nombre}: ${tarea.campos_faltantes.join(', ')}`)
      }
    })
  }

  // Validar Módulo 3
  const modulo3 = validarModulo3(portafolio.modulo3)
  if (!modulo3.completo) {
    modulo3.tareas.forEach((tarea) => {
      if (!tarea.completa) {
        errores.push(`Módulo 3, ${tarea.nombre}: ${tarea.campos_faltantes.join(', ')}`)
      }
    })
  }

  // Validar Tarea 3 (opcional pero advertir si falta)
  if (!portafolio.modulo1?.tarea3 || !portafolio.modulo1.tarea3.completado) {
    advertencias.push(
      'Tarea 3 (Reflexión Socioemocional) es opcional pero muy valorada. Considera completarla.'
    )
  }

  // Calcular progreso general
  const progresoTotal = Math.round(
    (modulo1.progreso + modulo2.progreso + modulo3.progreso) / 3
  )

  return {
    completo: errores.length === 0,
    progreso: progresoTotal,
    errores,
    advertencias,
    detalle: {
      modulo1,
      modulo2,
      modulo3,
    },
  }
}

/**
 * Valida Módulo 1: Planificación, Evaluación y Reflexión
 */
function validarModulo1(modulo1: any): ModuloValidacion {
  const tareas: TareaValidacion[] = []

  // Tarea 1A: Planificación (OBLIGATORIA)
  const tarea1A = validarTarea1A(modulo1?.tarea1?.seccion_a)
  tareas.push(tarea1A)

  // Tarea 1B: Fundamentación (OBLIGATORIA)
  const tarea1B = validarTarea1B(modulo1?.tarea1?.seccion_b)
  tareas.push(tarea1B)

  // Tarea 2A: Estrategia de Monitoreo (OBLIGATORIA)
  const tarea2A = validarTarea2A(modulo1?.tarea2?.seccion_a)
  tareas.push(tarea2A)

  // Tarea 3: Reflexión Socioemocional (OPCIONAL - no cuenta para completitud)
  const tarea3 = validarTarea3(modulo1?.tarea3)
  // No agregamos tarea3 a tareas obligatorias

  const tareasObligatorias = tareas.filter((t) => t.numero !== 3)
  const tareasCompletas = tareasObligatorias.filter((t) => t.completa).length
  const progreso = Math.round((tareasCompletas / tareasObligatorias.length) * 100)

  return {
    completo: tareasObligatorias.every((t) => t.completa),
    progreso,
    tareas,
  }
}

function validarTarea1A(seccionA: any): TareaValidacion {
  const campos_faltantes: string[] = []

  if (!seccionA) {
    return {
      numero: 1,
      nombre: 'Tarea 1A: Planificación',
      completa: false,
      campos_faltantes: ['Toda la sección A falta'],
    }
  }

  // Validar 3 experiencias
  for (let i = 1; i <= 3; i++) {
    const exp = seccionA[`experiencia_${i}`]
    if (!exp) {
      campos_faltantes.push(`Experiencia ${i} completa`)
      continue
    }

    if (!exp.objetivo_aprendizaje || exp.objetivo_aprendizaje.length < 20) {
      campos_faltantes.push(`Exp ${i}: Objetivo de aprendizaje`)
    }
    if (!exp.conocimientos_previos || exp.conocimientos_previos.length < 20) {
      campos_faltantes.push(`Exp ${i}: Conocimientos previos`)
    }
    if (!exp.actividades || exp.actividades.length < 1) {
      campos_faltantes.push(`Exp ${i}: Al menos 1 actividad`)
    }
    if (!exp.recursos || exp.recursos.length < 1) {
      campos_faltantes.push(`Exp ${i}: Al menos 1 recurso`)
    }
    if (!exp.tiempo_estimado || exp.tiempo_estimado.length < 5) {
      campos_faltantes.push(`Exp ${i}: Tiempo estimado`)
    }
    if (!exp.atencion_diversidad || exp.atencion_diversidad.length < 30) {
      campos_faltantes.push(`Exp ${i}: Atención a la diversidad`)
    }
  }

  return {
    numero: 1,
    nombre: 'Tarea 1A: Planificación',
    completa: campos_faltantes.length === 0,
    campos_faltantes,
  }
}

function validarTarea1B(seccionB: any): TareaValidacion {
  const campos_faltantes: string[] = []

  if (!seccionB) {
    return {
      numero: 1,
      nombre: 'Tarea 1B: Fundamentación',
      completa: false,
      campos_faltantes: ['Toda la sección B falta'],
    }
  }

  if (!seccionB.experiencia_seleccionada) {
    campos_faltantes.push('Experiencia seleccionada')
  }
  if (!seccionB.fundamentacion_decisiones || seccionB.fundamentacion_decisiones.length < 100) {
    campos_faltantes.push('Fundamentación de decisiones')
  }
  if (!seccionB.consideracion_diversidad || seccionB.consideracion_diversidad.length < 100) {
    campos_faltantes.push('Consideración de diversidad')
  }
  if (
    !seccionB.conexion_conocimientos_previos ||
    seccionB.conexion_conocimientos_previos.length < 100
  ) {
    campos_faltantes.push('Conexión con conocimientos previos')
  }
  if (
    !seccionB.promocion_aprendizaje_profundo ||
    seccionB.promocion_aprendizaje_profundo.length < 100
  ) {
    campos_faltantes.push('Promoción de aprendizaje profundo')
  }

  return {
    numero: 1,
    nombre: 'Tarea 1B: Fundamentación',
    completa: campos_faltantes.length === 0,
    campos_faltantes,
  }
}

function validarTarea2A(seccionA: any): TareaValidacion {
  const campos_faltantes: string[] = []

  if (!seccionA) {
    return {
      numero: 2,
      nombre: 'Tarea 2A: Evaluación',
      completa: false,
      campos_faltantes: ['Toda la sección A falta'],
    }
  }

  if (!seccionA.estrategia_descrita || seccionA.estrategia_descrita.length < 100) {
    campos_faltantes.push('Estrategia descrita')
  }
  if (!seccionA.instrumentos_utilizados || seccionA.instrumentos_utilizados.length < 1) {
    campos_faltantes.push('Instrumentos utilizados')
  }
  if (!seccionA.criterios_evaluacion || seccionA.criterios_evaluacion.length < 80) {
    campos_faltantes.push('Criterios de evaluación')
  }
  if (!seccionA.momento_aplicacion || seccionA.momento_aplicacion.length < 50) {
    campos_faltantes.push('Momento de aplicación')
  }

  return {
    numero: 2,
    nombre: 'Tarea 2A: Evaluación',
    completa: campos_faltantes.length === 0,
    campos_faltantes,
  }
}

function validarTarea3(tarea3: any): TareaValidacion {
  // Opcional - solo validamos si existe
  if (!tarea3) {
    return {
      numero: 3,
      nombre: 'Tarea 3: Reflexión Socioemocional (Opcional)',
      completa: false,
      campos_faltantes: ['Tarea opcional no completada'],
    }
  }

  const campos_faltantes: string[] = []

  if (
    !tarea3.aprendizaje_socioemocional_identificado ||
    tarea3.aprendizaje_socioemocional_identificado.length < 80
  ) {
    campos_faltantes.push('Aprendizaje socioemocional')
  }
  if (!tarea3.situaciones_observadas || tarea3.situaciones_observadas.length < 100) {
    campos_faltantes.push('Situaciones observadas')
  }

  return {
    numero: 3,
    nombre: 'Tarea 3: Reflexión Socioemocional',
    completa: campos_faltantes.length === 0,
    campos_faltantes,
  }
}

/**
 * Valida Módulo 2: Clase Grabada
 */
function validarModulo2(modulo2: any): ModuloValidacion {
  const tareas: TareaValidacion[] = []
  const campos_faltantes: string[] = []

  if (!modulo2) {
    return {
      completo: false,
      progreso: 0,
      tareas: [
        {
          numero: 4,
          nombre: 'Tarea 4: Clase Grabada',
          completa: false,
          campos_faltantes: ['Módulo 2 completo falta'],
        },
      ],
    }
  }

  // Validar video
  if (!modulo2.video || !modulo2.video.url) {
    campos_faltantes.push('Video de clase')
  }

  // Validar ficha
  const ficha = modulo2.ficha
  if (!ficha) {
    campos_faltantes.push('Ficha descriptiva completa')
  } else {
    if (!ficha.curso_nivel || ficha.curso_nivel.length < 3) {
      campos_faltantes.push('Curso/nivel')
    }
    if (!ficha.objetivo_aprendizaje || ficha.objetivo_aprendizaje.length < 50) {
      campos_faltantes.push('Objetivo de aprendizaje')
    }
    if (!ficha.segmento_inicio || !ficha.descripcion_inicio) {
      campos_faltantes.push('Segmento de inicio')
    }
    if (!ficha.segmento_desarrollo || !ficha.descripcion_desarrollo) {
      campos_faltantes.push('Segmento de desarrollo')
    }
    if (!ficha.segmento_cierre || !ficha.descripcion_cierre) {
      campos_faltantes.push('Segmento de cierre')
    }
  }

  tareas.push({
    numero: 4,
    nombre: 'Tarea 4: Clase Grabada',
    completa: campos_faltantes.length === 0,
    campos_faltantes,
  })

  return {
    completo: campos_faltantes.length === 0,
    progreso: campos_faltantes.length === 0 ? 100 : 0,
    tareas,
  }
}

/**
 * Valida Módulo 3: Trabajo Colaborativo
 */
function validarModulo3(modulo3: any): ModuloValidacion {
  const tareas: TareaValidacion[] = []
  const campos_faltantes: string[] = []

  if (!modulo3) {
    return {
      completo: false,
      progreso: 0,
      tareas: [
        {
          numero: 5,
          nombre: 'Tarea 5: Trabajo Colaborativo',
          completa: false,
          campos_faltantes: ['Módulo 3 completo falta'],
        },
      ],
    }
  }

  // Validar parte obligatoria
  const obligatoria = modulo3.parte_obligatoria
  if (!obligatoria) {
    campos_faltantes.push('Parte obligatoria completa')
  } else {
    if (!obligatoria.a1_relevancia_problema || obligatoria.a1_relevancia_problema.length < 100) {
      campos_faltantes.push('A1: Relevancia del problema')
    }
    if (
      !obligatoria.a2_reflexion_conjunta_dialogo ||
      obligatoria.a2_reflexion_conjunta_dialogo.length < 100
    ) {
      campos_faltantes.push('A2: Reflexión conjunta')
    }
    if (
      !obligatoria.b1_aprendizajes_profesionales ||
      obligatoria.b1_aprendizajes_profesionales.length < 100
    ) {
      campos_faltantes.push('B1: Aprendizajes profesionales')
    }
  }

  tareas.push({
    numero: 5,
    nombre: 'Tarea 5: Trabajo Colaborativo',
    completa: campos_faltantes.length === 0,
    campos_faltantes,
  })

  return {
    completo: campos_faltantes.length === 0,
    progreso: campos_faltantes.length === 0 ? 100 : 0,
    tareas,
  }
}

/**
 * Verifica si un portafolio puede ser enviado
 */
export function puedeEnviarPortafolio(validacion: ValidacionResultado): {
  puede: boolean
  razon?: string
} {
  if (!validacion.completo) {
    return {
      puede: false,
      razon: `Portafolio incompleto (${validacion.progreso}%). Faltan: ${validacion.errores.join('; ')}`,
    }
  }

  return { puede: true }
}

/**
 * Calcula el progreso de un portafolio
 */
export function calcularProgresoPortafolio(modulos: any[]): number {
  if (!modulos || modulos.length === 0) return 0

  const totalTareas = modulos.reduce((acc, m) => acc + (m.tareas?.length || 0), 0)
  const tareasCompletas = modulos.reduce(
    (acc, m) => acc + (m.tareas?.filter((t: any) => t.completado)?.length || 0),
    0
  )

  if (totalTareas === 0) return 0

  return Math.round((tareasCompletas / totalTareas) * 100)
}

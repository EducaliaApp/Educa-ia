import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_ENV_HINT, isMissingSupabaseEnvError } from '@/lib/supabase/config'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener perfil y verificar créditos
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Verificar límite de créditos (FREE plan)
    if (profile.plan === 'free') {
      if (profile.creditos_usados_planificaciones >= profile.creditos_planificaciones) {
        return NextResponse.json(
          { error: 'Has alcanzado el límite de planificaciones para tu plan FREE' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { asignatura, nivel, unidad, duracion_clases } = body

    if (!asignatura || !nivel || !unidad || !duracion_clases) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validar que la API key de OpenAI esté configurada antes de intentar generar la planificación
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY no está configurada en el entorno')
      return NextResponse.json(
        { error: 'Servicio de generación no disponible. Falta configurar OpenAI.' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    // Generar planificación con OpenAI
    const prompt = `Eres un experto en planificación curricular chilena.

Genera una planificación detallada para:
- Asignatura: ${asignatura}
- Nivel: ${nivel}
- Unidad: ${unidad}
- Duración: ${duracion_clases} clases de 90 minutos

La planificación debe incluir:

1. OBJETIVOS DE APRENDIZAJE:
   Lista de 3-5 objetivos alineados al curriculum Mineduc chileno

2. PLANIFICACIÓN CLASE POR CLASE:
   Para cada clase genera:
   - Número y título de la clase
   - Objetivo específico
   - INICIO (15 min): Activación de conocimientos previos
   - DESARROLLO (60 min): Actividades principales detalladas
   - CIERRE (15 min): Síntesis y evaluación formativa
   - Materiales necesarios
   - Indicadores de evaluación

3. EVALUACIÓN DE LA UNIDAD:
   Sugerencias de evaluación sumativa

4. RECURSOS RECOMENDADOS:
   Links, materiales, herramientas digitales

Responde en formato JSON con esta estructura exacta:
{
  "titulo": "Título de la unidad",
  "objetivosAprendizaje": ["OA1", "OA2", "OA3"],
  "clases": [
    {
      "numero": 1,
      "titulo": "Título de la clase",
      "objetivo": "Objetivo específico",
      "inicio": "Descripción detallada de la actividad de inicio",
      "desarrollo": "Descripción detallada de las actividades de desarrollo",
      "cierre": "Descripción detallada de la actividad de cierre",
      "materiales": ["Material 1", "Material 2"],
      "indicadores": ["Indicador 1", "Indicador 2"]
    }
  ],
  "evaluacion": "Descripción de la evaluación sumativa",
  "recursos": ["Recurso 1", "Recurso 2"]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en planificación curricular chilena. Siempre respondes en formato JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const contenido = JSON.parse(completion.choices[0].message.content || '{}')

    // Guardar planificación en la base de datos
    const { data: planificacion, error: insertError } = await supabase
      .from('planificaciones')
      .insert({
        user_id: user.id,
        asignatura,
        nivel,
        unidad,
        duracion_clases: Number.parseInt(duracion_clases),
        contenido,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error al guardar planificación:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar planificación' },
        { status: 500 }
      )
    }

    // Incrementar contador de créditos usados
    await supabase
      .from('profiles')
      .update({
        creditos_usados_planificaciones: profile.creditos_usados_planificaciones + 1,
      })
      .eq('id', user.id)

    return NextResponse.json({ planificacion })
  } catch (error) {
    console.error('Error al generar planificación:', error)

    if (isMissingSupabaseEnvError(error)) {
      return NextResponse.json(
        {
          error: `Servicio no disponible. Configura ${SUPABASE_ENV_HINT} para continuar.`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error al generar planificación' },
      { status: 500 }
    )
  }
}

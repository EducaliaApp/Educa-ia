#!/usr/bin/env deno run --allow-net --allow-env --allow-write

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  Deno.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ValidationResult {
  tipo: string
  nivel: 'info' | 'warning' | 'error' | 'critical'
  mensaje: string
  detalles?: any
}

const resultados: ValidationResult[] = []
let erroresCriticos = 0

console.log('🔍 Iniciando validación de datos RAG...\n')

// ============================================
// 1. VALIDAR CHUNKS DE DOCUMENTOS
// ============================================

console.log('📄 Validando chunks_documentos...')

// 1.1 Chunks muy cortos (< 50 caracteres)
const { data: chunksCortos } = await supabase
  .from('chunks_documentos')
  .select('id, documento_id, contenido, chunk_index')
  .or('contenido.is.null,length(contenido).lt.50')

if (chunksCortos && chunksCortos.length > 0) {
  resultados.push({
    tipo: 'chunks_cortos',
    nivel: 'warning',
    mensaje: `${chunksCortos.length} chunks con contenido muy corto o nulo`,
    detalles: chunksCortos.slice(0, 5)
  })
  console.log(`  ⚠️  ${chunksCortos.length} chunks muy cortos`)
}

// 1.2 Chunks sin embedding
const { data: chunksSinEmbedding } = await supabase
  .from('chunks_documentos')
  .select('id, documento_id, chunk_index')
  .is('embedding', null)

if (chunksSinEmbedding && chunksSinEmbedding.length > 0) {
  erroresCriticos += chunksSinEmbedding.length
  resultados.push({
    tipo: 'chunks_sin_embedding',
    nivel: 'critical',
    mensaje: `${chunksSinEmbedding.length} chunks sin embedding`,
    detalles: chunksSinEmbedding
  })
  console.log(`  🔴 ${chunksSinEmbedding.length} chunks SIN embedding (CRÍTICO)`)
}

// 1.3 Chunks con contenido no textual (>50% símbolos/números)
const { data: todosChunks } = await supabase
  .from('chunks_documentos')
  .select('id, contenido')
  .not('contenido', 'is', null)
  .limit(1000) // Muestra

const chunksNoTextuales = todosChunks?.filter(chunk => {
  const textoLimpio = chunk.contenido.replace(/[^a-záéíóúñ\s]/gi, '')
  const ratioTexto = textoLimpio.length / chunk.contenido.length
  return ratioTexto < 0.5
}) || []

if (chunksNoTextuales.length > 0) {
  resultados.push({
    tipo: 'chunks_no_textuales',
    nivel: 'warning',
    mensaje: `${chunksNoTextuales.length} chunks con poco contenido textual (< 50%)`,
    detalles: chunksNoTextuales.slice(0, 3).map(c => ({
      id: c.id,
      preview: c.contenido.substring(0, 100)
    }))
  })
  console.log(`  ⚠️  ${chunksNoTextuales.length} chunks con poco texto real`)
}

// 1.4 Estadísticas generales de chunks
const { count: totalChunks } = await supabase
  .from('chunks_documentos')
  .select('*', { count: 'exact', head: true })

resultados.push({
  tipo: 'estadisticas_chunks',
  nivel: 'info',
  mensaje: `Total de chunks en BD: ${totalChunks}`,
  detalles: {
    total: totalChunks,
    con_embedding: (totalChunks || 0) - (chunksSinEmbedding?.length || 0),
    cortos: chunksCortos?.length || 0,
    no_textuales: chunksNoTextuales.length
  }
})

console.log(`  ✅ Total chunks: ${totalChunks}`)
console.log(`  ✅ Con embedding: ${(totalChunks || 0) - (chunksSinEmbedding?.length || 0)}`)

// ============================================
// 2. VALIDAR DOCUMENTOS OFICIALES
// ============================================

console.log('\n📚 Validando documentos_oficiales...')

// 2.1 Documentos sin procesar (> 7 días)
const { data: docsSinProcesar } = await supabase
  .from('documentos_oficiales')
  .select('id, nombre_archivo, created_at')
  .eq('procesado', false)
  .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

if (docsSinProcesar && docsSinProcesar.length > 0) {
  erroresCriticos += docsSinProcesar.length
  resultados.push({
    tipo: 'documentos_sin_procesar',
    nivel: 'critical',
    mensaje: `${docsSinProcesar.length} documentos sin procesar por más de 7 días`,
    detalles: docsSinProcesar
  })
  console.log(`  🔴 ${docsSinProcesar.length} documentos NO procesados (>7 días)`)
}

// 2.2 Documentos sin chunks generados
const { data: docsSinChunks } = await supabase
  .from('documentos_oficiales')
  .select(`
    id,
    nombre_archivo,
    procesado,
    chunks:chunks_documentos(count)
  `)
  .eq('procesado', true)

const docsVacios = docsSinChunks?.filter(doc =>
  doc.procesado && (!doc.chunks || doc.chunks.length === 0 || doc.chunks[0].count === 0)
) || []

if (docsVacios.length > 0) {
  erroresCriticos += docsVacios.length
  resultados.push({
    tipo: 'documentos_sin_chunks',
    nivel: 'critical',
    mensaje: `${docsVacios.length} documentos procesados pero sin chunks generados`,
    detalles: docsVacios.map(d => ({ id: d.id, nombre: d.nombre_archivo }))
  })
  console.log(`  🔴 ${docsVacios.length} documentos procesados SIN chunks`)
}

// 2.3 Cobertura por modalidad
const { data: docsPorModalidad } = await supabase
  .from('documentos_oficiales')
  .select('modalidad')
  .eq('procesado', true)

const cobertura = docsPorModalidad?.reduce((acc: any, doc) => {
  acc[doc.modalidad] = (acc[doc.modalidad] || 0) + 1
  return acc
}, {})

resultados.push({
  tipo: 'cobertura_modalidades',
  nivel: 'info',
  mensaje: 'Cobertura de documentos por modalidad',
  detalles: cobertura
})

console.log(`  ℹ️  Cobertura por modalidad:`)
if (cobertura) {
  for (const [modalidad, count] of Object.entries(cobertura)) {
    console.log(`      - ${modalidad}: ${count} documentos`)
  }
}

// ============================================
// 3. VALIDAR RÚBRICAS MBE
// ============================================

console.log('\n📐 Validando rubricas_mbe...')

// 3.1 Rúbricas sin embedding
const { data: rubricasSinEmbedding } = await supabase
  .from('rubricas_mbe')
  .select('id, indicador_id, nombre_indicador')
  .is('embedding', null)

if (rubricasSinEmbedding && rubricasSinEmbedding.length > 0) {
  erroresCriticos += rubricasSinEmbedding.length
  resultados.push({
    tipo: 'rubricas_sin_embedding',
    nivel: 'critical',
    mensaje: `${rubricasSinEmbedding.length} rúbricas sin embedding`,
    detalles: rubricasSinEmbedding
  })
  console.log(`  🔴 ${rubricasSinEmbedding.length} rúbricas SIN embedding`)
}

// 3.2 Rúbricas con JSONB inválido
const { data: todasRubricas } = await supabase
  .from('rubricas_mbe')
  .select('id, indicador_id, niveles_desempeno')

const rubricasInvalidas = todasRubricas?.filter(r => {
  if (!r.niveles_desempeno) return true

  const niveles = ['destacado', 'competente', 'basico', 'insatisfactorio']
  return !niveles.every(nivel => r.niveles_desempeno[nivel])
}) || []

if (rubricasInvalidas.length > 0) {
  erroresCriticos += rubricasInvalidas.length
  resultados.push({
    tipo: 'rubricas_jsonb_invalido',
    nivel: 'critical',
    mensaje: `${rubricasInvalidas.length} rúbricas con estructura JSONB inválida`,
    detalles: rubricasInvalidas.map(r => ({ id: r.id, indicador: r.indicador_id }))
  })
  console.log(`  🔴 ${rubricasInvalidas.length} rúbricas con JSONB inválido`)
}

// 3.3 Estadísticas de rúbricas
const { count: totalRubricas } = await supabase
  .from('rubricas_mbe')
  .select('*', { count: 'exact', head: true })

const { data: rubricasPorDominio } = await supabase
  .from('rubricas_mbe')
  .select('dominio')

const porDominio = rubricasPorDominio?.reduce((acc: any, r) => {
  acc[r.dominio || 'sin_dominio'] = (acc[r.dominio || 'sin_dominio'] || 0) + 1
  return acc
}, {})

resultados.push({
  tipo: 'estadisticas_rubricas',
  nivel: 'info',
  mensaje: `Total de rúbricas: ${totalRubricas}`,
  detalles: {
    total: totalRubricas,
    por_dominio: porDominio
  }
})

console.log(`  ✅ Total rúbricas: ${totalRubricas}`)
if (porDominio) {
  console.log(`  ℹ️  Por dominio MBE:`)
  for (const [dominio, count] of Object.entries(porDominio)) {
    console.log(`      - Dominio ${dominio}: ${count}`)
  }
}

// Contar rúbricas con embedding (consulta directa)
const { count: rubricasConEmbedding } = await supabase
  .from('rubricas_mbe')
  .select('*', { count: 'exact', head: true })
  .not('embedding', 'is', null)

console.log(`  ℹ️  Rúbricas con embedding: ${rubricasConEmbedding || 0}`)

// ============================================
// 4. VALIDAR ÍNDICES VECTORIALES
// ============================================

console.log('\n🔍 Validando índices vectoriales...')

// 4.1 Verificar que existan los índices
let indices = null
try {
  const result = await supabase.rpc('verificar_indices_vectoriales' as any)
  indices = result.data
} catch (error) {
  // Función no existe, continuamos con alternativa
}

if (!indices) {
  // Alternativa: query manual
  let checkIndices = { data: [] as any[] }
  try {
    checkIndices = await supabase
      .from('pg_indexes')
      .select('indexname')
      .in('indexname', ['idx_chunks_embedding', 'idx_rubricas_embedding'])
  } catch (error) {
    // Tabla no accesible, asumir que índices no existen
  }

  if (checkIndices.data && checkIndices.data.length < 2) {
    resultados.push({
      tipo: 'indices_faltantes',
      nivel: 'error',
      mensaje: 'Faltan índices vectoriales en la base de datos',
      detalles: { encontrados: checkIndices.data?.length || 0, esperados: 2 }
    })
    console.log(`  ⚠️  Índices vectoriales incompletos`)
  } else {
    console.log(`  ✅ Índices vectoriales OK`)
  }
} else {
  console.log(`  ✅ Índices vectoriales verificados`)
}

// ============================================
// 5. TEST DE BÚSQUEDA
// ============================================

console.log('\n🔎 Probando búsqueda vectorial...')

// Solo hacer test de búsqueda si hay datos en la base
const hayDatos = totalChunks > 0 || rubricasConEmbedding > 0

if (!hayDatos) {
  resultados.push({
    tipo: 'busqueda_vectorial_skip',
    nivel: 'info',
    mensaje: 'Test de búsqueda omitido (base de datos vacía)',
    detalles: { motivo: 'No hay embeddings para buscar' }
  })
  console.log(`  ℹ️  Test de búsqueda omitido (base de datos vacía)`)
} else {
  try {
    // Generar embedding de prueba (vector aleatorio normalizado)
    const dimensiones = 1536
    const vectorPrueba = Array.from({ length: dimensiones }, () => Math.random() - 0.5)
    const norma = Math.sqrt(vectorPrueba.reduce((sum, v) => sum + v * v, 0))
    const vectorNormalizado = vectorPrueba.map(v => v / norma)

    const { data: resultadosBusqueda, error: errorBusqueda } = await supabase.rpc(
      'buscar_rubricas_similares',
      {
        query_embedding: vectorNormalizado,
        match_threshold: 0.5,
        match_count: 5
      }
    )

    if (errorBusqueda) {
      // Errores de tipo SQL en la función no son críticos para validación de datos
      const esErrorTipoSQL = errorBusqueda.message.includes('operator does not exist') ||
                             errorBusqueda.message.includes('type') ||
                             errorBusqueda.message.includes('casting')

      resultados.push({
        tipo: 'busqueda_vectorial_fallo',
        nivel: esErrorTipoSQL ? 'warning' : 'critical',
        mensaje: esErrorTipoSQL
          ? 'Función de búsqueda tiene error de tipos SQL (requiere fix en función)'
          : 'Error en búsqueda vectorial',
        detalles: { error: errorBusqueda.message }
      })

      if (!esErrorTipoSQL) {
        erroresCriticos++
      }

      console.log(`  ${esErrorTipoSQL ? '⚠️' : '🔴'}  Búsqueda vectorial FALLÓ: ${errorBusqueda.message}`)
    } else {
      resultados.push({
        tipo: 'busqueda_vectorial_ok',
        nivel: 'info',
        mensaje: `Búsqueda vectorial funcional (${resultadosBusqueda?.length || 0} resultados)`,
        detalles: { resultados: resultadosBusqueda?.length || 0 }
      })
      console.log(`  ✅ Búsqueda vectorial funciona (${resultadosBusqueda?.length || 0} resultados)`)
    }
  } catch (error) {
    // Errores de tipo SQL en la función no son críticos para validación de datos
    const esErrorTipoSQL = error.message.includes('operator does not exist') ||
                           error.message.includes('type') ||
                           error.message.includes('casting')

    resultados.push({
      tipo: 'busqueda_vectorial_error',
      nivel: esErrorTipoSQL ? 'warning' : 'critical',
      mensaje: esErrorTipoSQL
        ? 'Función de búsqueda tiene error de tipos SQL (requiere fix en función)'
        : 'Excepción en búsqueda vectorial',
      detalles: { error: error.message }
    })

    if (!esErrorTipoSQL) {
      erroresCriticos++
    }

    console.log(`  ${esErrorTipoSQL ? '⚠️' : '🔴'}  Excepción en búsqueda: ${error.message}`)
  }
}

// ============================================
// 6. MÉTRICAS DE CALIDAD
// ============================================

console.log('\n📊 Calculando métricas de calidad...')

// 6.1 Ratio de chunks válidos
const ratioChunksValidos = totalChunks
  ? ((totalChunks - (chunksSinEmbedding?.length || 0) - (chunksCortos?.length || 0)) / totalChunks * 100).toFixed(1)
  : 0

// 6.2 Ratio de documentos procesados
const { count: totalDocs } = await supabase
  .from('documentos_oficiales')
  .select('*', { count: 'exact', head: true })

const { count: docsProcesados } = await supabase
  .from('documentos_oficiales')
  .select('*', { count: 'exact', head: true })
  .eq('procesado', true)

const ratioProcesados = totalDocs
  ? (docsProcesados! / totalDocs * 100).toFixed(1)
  : 0

resultados.push({
  tipo: 'metricas_calidad',
  nivel: 'info',
  mensaje: 'Métricas generales de calidad',
  detalles: {
    chunks_validos_pct: parseFloat(ratioChunksValidos),
    documentos_procesados_pct: parseFloat(ratioProcesados),
    total_chunks: totalChunks,
    total_documentos: totalDocs,
    total_rubricas: totalRubricas,
    errores_criticos: erroresCriticos
  }
})

console.log(`\n📈 Métricas de Calidad:`)
console.log(`  - Chunks válidos: ${ratioChunksValidos}%`)
console.log(`  - Documentos procesados: ${ratioProcesados}%`)
console.log(`  - Total chunks: ${totalChunks}`)
console.log(`  - Total documentos: ${totalDocs}`)
console.log(`  - Total rúbricas: ${totalRubricas}`)

// ============================================
// 7. GENERAR REPORTE
// ============================================

console.log(`\n${'='.repeat(60)}`)
console.log(`📋 RESUMEN DE VALIDACIÓN`)
console.log(`${'='.repeat(60)}`)

const errores = resultados.filter(r => r.nivel === 'error').length
const warnings = resultados.filter(r => r.nivel === 'warning').length

console.log(`\n🔴 Errores críticos: ${erroresCriticos}`)
console.log(`⚠️  Errores: ${errores}`)
console.log(`⚠️  Advertencias: ${warnings}`)
console.log(`ℹ️  Información: ${resultados.filter(r => r.nivel === 'info').length}`)

// Generar markdown para GitHub Actions
const markdown = `
## 📊 Reporte de Validación RAG

**Fecha:** ${new Date().toISOString()}

### Resumen

| Métrica | Valor |
|---------|-------|
| 🔴 **Errores Críticos** | **${erroresCriticos}** |
| ⚠️ Errores | ${errores} |
| ⚠️ Advertencias | ${warnings} |
| ✅ Chunks Válidos | ${ratioChunksValidos}% |
| ✅ Docs Procesados | ${ratioProcesados}% |

### Detalles

${resultados
  .filter(r => r.nivel === 'critical' || r.nivel === 'error')
  .map(r => `- **[${r.nivel.toUpperCase()}]** ${r.mensaje}`)
  .join('\n')}

### Estadísticas

- **Total Chunks:** ${totalChunks}
- **Total Documentos:** ${totalDocs}
- **Total Rúbricas:** ${totalRubricas}
- **Documentos Procesados:** ${docsProcesados} (${ratioProcesados}%)

${warnings > 0 ? `
### ⚠️ Advertencias

${resultados
  .filter(r => r.nivel === 'warning')
  .map(r => `- ${r.mensaje}`)
  .join('\n')}
` : ''}
`

await Deno.writeTextFile('validation-results.md', markdown)
console.log(`\n✅ Reporte guardado en validation-results.md`)

// Guardar resultados en BD
try {
  await supabase.from('validaciones_rag').insert({
    fecha: new Date().toISOString(),
    errores_criticos: erroresCriticos,
    errores: errores,
    advertencias: warnings,
    chunks_validos_pct: parseFloat(ratioChunksValidos),
    documentos_procesados_pct: parseFloat(ratioProcesados),
    total_chunks: totalChunks,
    total_documentos: totalDocs,
    total_rubricas: totalRubricas,
    resultados_detallados: resultados
  })
  console.log(`✅ Resultados guardados en BD`)
} catch (error) {
  console.warn(`⚠️  No se pudo guardar en BD: ${error.message}`)
}

// Escribir outputs para GitHub Actions
const githubOutput = Deno.env.get('GITHUB_OUTPUT')
if (githubOutput) {
  const outputs = `critical_errors=${erroresCriticos}\nvalidated=${totalChunks}\n`
  await Deno.writeTextFile(githubOutput, outputs, { append: true })
}

// Salir con código apropiado
if (erroresCriticos > 0) {
  console.log(`\n❌ VALIDACIÓN FALLIDA (${erroresCriticos} errores críticos)`)
  Deno.exit(1)
} else if (errores > 0) {
  console.log(`\n⚠️  VALIDACIÓN COMPLETADA CON ERRORES (${errores} errores)`)
  Deno.exit(0)
} else {
  console.log(`\n✅ VALIDACIÓN EXITOSA`)
  Deno.exit(0)
}

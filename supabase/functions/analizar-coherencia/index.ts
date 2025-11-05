import { createClient } from "npm:@supabase/supabase-js@2.30.0";
import { AIAnalyzer } from "../shared/ai-analyzer.ts";

Deno.serve(async (req: Request) => {
  try {
    const { año_vigencia = 2025 } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const aiAnalyzer = new AIAnalyzer();
    
    console.log(`🔍 Analizando coherencia curricular para año ${año_vigencia}...`);
    
    // Obtener documentos del año especificado
    const { data: documentos } = await supabase
      .from('documentos_oficiales')
      .select('id, titulo, contenido_texto, tipo_documento')
      .eq('año_vigencia', año_vigencia)
      .eq('es_version_actual', true)
      .not('contenido_texto', 'is', null);
    
    if (!documentos || documentos.length < 2) {
      return new Response(JSON.stringify({
        error: 'Se necesitan al menos 2 documentos para análisis de coherencia'
      }), { status: 400 });
    }
    
    console.log(`📋 Analizando ${documentos.length} documentos...`);
    
    // Preparar documentos para análisis
    const docsParaAnalisis = documentos.map(doc => ({
      id: doc.id,
      texto: doc.contenido_texto.substring(0, 3000), // Limitar texto para IA
      tipo: doc.tipo_documento
    }));
    
    // Análisis de coherencia con IA
    const analisisCoherencia = await aiAnalyzer.analizarCoherencia(docsParaAnalisis);
    
    // Guardar resultados
    const { data: analisisGuardado } = await supabase
      .from('cambios_inteligentes')
      .insert({
        documento_id: documentos[0].id, // Usar primer documento como referencia
        cambios_detectados: [],
        impacto_maximo: analisisCoherencia.coherencia_global < 0.7 ? 'alto' : 'medio',
        coherencia_score: analisisCoherencia.coherencia_global,
        inconsistencias: analisisCoherencia.inconsistencias,
        recomendaciones_accion: analisisCoherencia.inconsistencias.map(inc => 
          `Revisar inconsistencia entre documentos: ${inc.descripcion}`
        )
      })
      .select()
      .single();
    
    console.log(`✅ Análisis completado. Coherencia: ${analisisCoherencia.coherencia_global}`);
    console.log(`⚠️ Inconsistencias encontradas: ${analisisCoherencia.inconsistencias.length}`);
    
    return new Response(JSON.stringify({
      success: true,
      coherencia_global: analisisCoherencia.coherencia_global,
      inconsistencias_count: analisisCoherencia.inconsistencias.length,
      inconsistencias: analisisCoherencia.inconsistencias,
      analisis_id: analisisGuardado.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en análisis de coherencia:', error);
    
    return new Response(JSON.stringify({
      error: 'Error en análisis de coherencia',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
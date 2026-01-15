import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DocumentProcessor } from './document-processor.ts'
import { AIAnalyzer } from "./ai-analyzer.ts";

interface VersionSemantica {
  major: number
  minor: number
  patch: number
  metadata: {
    cambios_detectados: string[]
    impacto_estimado: string
    fecha_deteccion: string
  }
}

interface PipelineResult {
  success: boolean
  stage_completed: string
  document_id: string
  error?: string
  metrics: {
    total_time_ms: number
    stage_times: Record<string, number>
  }
}

export class DocumentPipeline {
  private supabase: SupabaseClient
  private processor: DocumentProcessor
  private aiAnalyzer: AIAnalyzer
  private embeddingCache = new Map<string, number[]>()

  stages = [
    'download',
    'validate', 
    'extract',
    'classify',
    'chunk',
    'embed',
    'index',
    'notify'
  ];

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient ?? createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    this.processor = new DocumentProcessor(this.supabase)
    this.aiAnalyzer = new AIAnalyzer()
  }

  async process(document: any): Promise<PipelineResult> {
    const startTime = Date.now();
    const stageTimes: Record<string, number> = {};
    let lastCompletedStage = '';

    try {
      for (const stage of this.stages) {
        const stageStart = Date.now();
        await this.executeStage(stage, document);
        stageTimes[stage] = Date.now() - stageStart;
        lastCompletedStage = stage;
        
        // Actualizar progreso en BD
        await this.updateProgress(document.id, stage);
      }

      return {
        success: true,
        stage_completed: lastCompletedStage,
        document_id: document.id,
        metrics: {
          total_time_ms: Date.now() - startTime,
          stage_times: stageTimes
        }
      };

    } catch (error) {
      await this.handleFailure(document.id, lastCompletedStage, error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        stage_completed: lastCompletedStage,
        document_id: document.id,
        error: error.message,
        metrics: {
          total_time_ms: Date.now() - startTime,
          stage_times: stageTimes
        }
      };
    }
  }

  private async executeStage(stage: string, document: any): Promise<void> {
    switch (stage) {
      case 'download':
        document.buffer = await this.downloadDocument(document.url);
        break;
      case 'validate':
        await this.validateDocument(document);
        break;
      case 'extract':
        document.texto = await this.extractText(document.buffer);
        break;
      case 'classify':
        document.clasificacion = await this.classifyDocument(document.texto);
        break;
      case 'chunk':
        document.chunks = await this.chunkDocument(document.texto, document);
        break;
      case 'embed':
        document.embeddings = await this.generateEmbeddings(document.chunks);
        break;
      case 'index':
        await this.indexDocument(document);
        break;
      case 'notify':
        await this.notifyCompletion(document);
        break;
    }
  }

  private async downloadDocument(url: string): Promise<ArrayBuffer> {
    return this.processor.processWithRetry(async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.arrayBuffer();
    }, 'document download');
  }

  private async validateDocument(document: any): Promise<void> {
    if (!await this.processor.validatePDF(document.buffer)) {
      throw new Error('Invalid PDF document');
    }
  }

  private async extractText(buffer: ArrayBuffer): Promise<string> {
    // Implementación simplificada - usar función existente
    const { getDocument } = await import("npm:pdfjs-dist@3.11.174");
    const pdf = await getDocument({ data: buffer }).promise;
    let texto = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      texto += pageText + '\n';
    }
    
    return texto;
  }

  private async classifyDocument(texto: string): Promise<any> {
    return await this.aiAnalyzer.clasificarDocumento(texto);
  }

  private async chunkDocument(texto: string, document: any): Promise<any[]> {
    // Chunking básico - usar lógica existente
    const CHUNK_SIZE = 1500;
    const chunks = [];
    let start = 0;
    
    while (start < texto.length) {
      const end = Math.min(start + CHUNK_SIZE, texto.length);
      chunks.push({
        contenido: texto.substring(start, end),
        index: chunks.length
      });
      start += CHUNK_SIZE - 200; // Overlap
    }
    
    return chunks;
  }

  private async generateEmbeddings(chunks: any[]): Promise<any[]> {
    const result = [];
    
    for (const chunk of chunks) {
      // Verificar cache
      const cacheKey = this.getCacheKey(chunk.contenido);
      let embedding = this.embeddingCache.get(cacheKey);
      
      if (!embedding) {
        embedding = await this.createEmbedding(chunk.contenido);
        this.embeddingCache.set(cacheKey, embedding);
      }
      
      result.push({ ...chunk, embedding });
    }
    
    return result;
  }

  private async createEmbedding(texto: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')!}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: texto
      })
    });
    
    const result = await response.json();
    return result.data[0].embedding;
  }

  private getCacheKey(texto: string): string {
    // Hash simple para cache
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      const char = texto.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async indexDocument(document: any): Promise<void> {
    // Guardar chunks en BD
    for (const chunk of document.embeddings) {
      await this.supabase.from('chunks_documentos').insert({
        documento_id: document.id,
        contenido: chunk.contenido,
        chunk_index: chunk.index,
        embedding: chunk.embedding
      });
    }

    // Actualizar documento como procesado
    await this.supabase.from('documentos_oficiales').update({
      procesado: true,
      clasificacion_ia: document.clasificacion,
      fecha_procesamiento: new Date().toISOString()
    }).eq('id', document.id);
  }

  private async notifyCompletion(document: any): Promise<void> {
    await this.supabase.from('notificaciones_admin').insert({
      tipo: 'documento_procesado',
      titulo: `Documento procesado: ${document.nombre}`,
      mensaje: `Procesamiento completado con ${document.embeddings.length} chunks`,
      prioridad: 'media'
    });
  }

  private async updateProgress(documentId: string, stage: string): Promise<void> {
    const progress = Math.round((this.stages.indexOf(stage) + 1) / this.stages.length * 100);
    
    await this.supabase.from('documentos_oficiales').update({
      progreso_procesamiento: progress,
      etapa_actual: stage
    }).eq('id', documentId);
  }

  private async handleFailure(documentId: string, lastStage: string, error: Error): Promise<void> {
    await this.supabase.from('documentos_oficiales').update({
      estado_procesamiento: 'fallido',
      error_procesamiento: error.message,
      etapa_fallida: lastStage
    }).eq('id', documentId);

    // Programar reintento automático
    await this.scheduleRetry(documentId);
  }

  private async scheduleRetry(documentId: string): Promise<void> {
    const retryAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
    
    await this.supabase.from('reintentos_procesamiento').insert({
      documento_id: documentId,
      programado_para: retryAt.toISOString(),
      intentos: 1
    });
  }

  generateSemanticVersion(cambiosDetectados: any[]): VersionSemantica {
    let major = 0, minor = 0, patch = 0;
    
    for (const cambio of cambiosDetectados) {
      switch (cambio.impacto) {
        case 'critico':
          major++;
          break;
        case 'alto':
          minor++;
          break;
        case 'medio':
        case 'bajo':
          patch++;
          break;
      }
    }

    return {
      major,
      minor, 
      patch,
      metadata: {
        cambios_detectados: cambiosDetectados.map(c => c.descripcion),
        impacto_estimado: cambiosDetectados.length > 0 ? 
          cambiosDetectados.reduce((max, c) => c.impacto === 'critico' ? 'critico' : max, 'bajo') : 'ninguno',
        fecha_deteccion: new Date().toISOString()
      }
    };
  }
}
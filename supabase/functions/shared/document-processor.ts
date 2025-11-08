// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface LogEvent {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  component: string
  event: string
  metadata: Record<string, any>
}

export class DocumentProcessor {
  private supabase: any;
  private logs: LogEvent[] = [];

    constructor(supabaseClient?: any) {
      this.supabase = supabaseClient ?? createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
  }

  private log(level: LogEvent['level'], component: string, event: string, metadata: any = {}) {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      component,
      event,
      metadata
    };
    
    this.logs.push(logEvent);
    console.log(`[${level.toUpperCase()}] ${component}: ${event}`, metadata);
    
    // Enviar logs críticos a BD
    if (level === 'error') {
      this.supabase.from('system_logs').insert(logEvent).then().catch(() => {});
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processWithRetry<T>(
    operation: () => Promise<T>, 
    context: string,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.log('info', 'DocumentProcessor', `Attempting ${context}`, { attempt: i + 1 });
        return await operation();
      } catch (error) {
        this.log('warn', 'DocumentProcessor', `Failed ${context}`, { 
          attempt: i + 1, 
          error: error.message 
        });
        
        if (i === maxRetries - 1) {
          this.log('error', 'DocumentProcessor', `Max retries reached for ${context}`, { error: error.message });
          throw error;
        }
        
        await this.delay(Math.pow(2, i) * 1000);
      }
    }
    throw new Error('Max retries reached');
  }

  async validatePDF(arrayBuffer: ArrayBuffer): Promise<boolean> {
    try {
      // Validar header PDF
      const header = new Uint8Array(arrayBuffer.slice(0, 4));
      const pdfHeader = String.fromCharCode(...header);
      
      if (!pdfHeader.startsWith('%PDF')) {
        this.log('warn', 'PDFValidator', 'Invalid PDF header', { header: pdfHeader });
        return false;
      }

      // Validar tamaño mínimo
      if (arrayBuffer.byteLength < 1024) {
        this.log('warn', 'PDFValidator', 'PDF too small', { size: arrayBuffer.byteLength });
        return false;
      }

      this.log('info', 'PDFValidator', 'PDF validation passed', { size: arrayBuffer.byteLength });
      return true;
    } catch (error) {
      this.log('error', 'PDFValidator', 'Validation failed', { error: error.message });
      return false;
    }
  }

  async validateDocumentContent(texto: string, expectedType: string): Promise<boolean> {
    const indicators = {
      'rubrica': ['criterio', 'descriptor', 'nivel', 'estándar'],
      'manual_portafolio': ['módulo', 'tarea', 'portafolio', 'evidencia'],
      'mbe': ['estándar', 'dominio', 'enseñanza', 'aprendizaje']
    };

    const keywords = indicators[expectedType as keyof typeof indicators] || [];
    const found = keywords.filter(keyword => 
      new RegExp(keyword, 'i').test(texto)
    ).length;

    const isValid = found >= Math.ceil(keywords.length / 2);
    
    this.log('info', 'ContentValidator', 'Content validation', { 
      expectedType, 
      found, 
      required: Math.ceil(keywords.length / 2),
      isValid 
    });

    return isValid;
  }

  getLogs(): LogEvent[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }
}
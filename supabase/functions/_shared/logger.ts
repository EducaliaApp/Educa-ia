// supabase/functions/_shared/logger.ts
// Simple logger for Edge Functions

export class Logger {
  constructor(private context: string) {}

  private formatMessage(level: string, mensaje: string, metadata?: any): string {
    const timestamp = new Date().toISOString()
    const base = `[${timestamp}] [${level}] [${this.context}] ${mensaje}`

    if (metadata) {
      return `${base} ${JSON.stringify(metadata)}`
    }

    return base
  }

  info(mensaje: string, metadata?: any): void {
    console.log(this.formatMessage('INFO', mensaje, metadata))
  }

  warn(mensaje: string, metadata?: any): void {
    console.warn(this.formatMessage('WARN', mensaje, metadata))
  }

  error(mensaje: string, error?: Error | string): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: error }

    console.error(this.formatMessage('ERROR', mensaje, errorDetails))
  }

  debug(mensaje: string, metadata?: any): void {
    if (Deno.env.get('DEBUG') === 'true') {
      console.debug(this.formatMessage('DEBUG', mensaje, metadata))
    }
  }
}

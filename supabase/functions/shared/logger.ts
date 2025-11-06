// supabase/functions/shared/logger.ts
// Sistema de logging centralizado para Edge Functions

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  functionName: string
  requestId?: string
  userId?: string
}

export interface LogMetadata {
  [key: string]: any
}

export class Logger {
  private context: LogContext
  private supabase: SupabaseClient | null = null
  private consoleOnly: boolean = false

  constructor(context: LogContext, supabase?: SupabaseClient) {
    this.context = context
    this.supabase = supabase || null
    this.consoleOnly = !supabase
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: LogMetadata) {
    this.log('debug', message, metadata)
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: LogMetadata) {
    this.log('info', message, metadata)
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: LogMetadata) {
    this.log('warn', message, metadata)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: LogMetadata) {
    const errorMetadata = {
      ...metadata,
      error_name: error?.name,
      error_message: error?.message,
    }

    this.log('error', message, errorMetadata, error?.stack)
  }

  /**
   * Internal log method
   */
  private async log(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    stackTrace?: string
  ) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      function: this.context.functionName,
      requestId: this.context.requestId,
      userId: this.context.userId,
      message,
      metadata,
    }

    // Always log to console for Supabase logs
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         console.log

    consoleMethod(`[${level.toUpperCase()}] [${this.context.functionName}]`, message, metadata || '')

    // Store in database if supabase client available
    if (!this.consoleOnly && this.supabase) {
      try {
        await this.supabase
          .from('function_logs')
          .insert({
            function_name: this.context.functionName,
            request_id: this.context.requestId,
            user_id: this.context.userId,
            level,
            message,
            metadata: metadata || {},
            stack_trace: stackTrace,
            error_details: level === 'error' ? metadata : null,
          })
          .select()
          .single()
      } catch (err) {
        // Fail silently - logging should never break the main flow
        console.error('Failed to write log to database:', err)
      }
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogContext>): Logger {
    return new Logger(
      {
        ...this.context,
        ...additionalContext,
      },
      this.supabase || undefined
    )
  }

  /**
   * Log timing information
   */
  async time<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now()

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      this.info(`${operation} completed`, {
        operation,
        duration_ms: duration,
      })

      return { result, duration }
    } catch (error: any) {
      const duration = Date.now() - startTime

      this.error(`${operation} failed`, error, {
        operation,
        duration_ms: duration,
      })

      throw error
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(
  functionName: string,
  supabase?: SupabaseClient,
  requestId?: string,
  userId?: string
): Logger {
  return new Logger(
    {
      functionName,
      requestId,
      userId,
    },
    supabase
  )
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Utility to extract user ID from headers
 */
export function extractUserIdFromRequest(req: Request): string | undefined {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return undefined

    // This is a simplified version - in production you'd decode the JWT
    // For now we'll return undefined and rely on supabase auth
    return undefined
  } catch {
    return undefined
  }
}

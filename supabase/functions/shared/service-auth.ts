// @ts-nocheck
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HEADER_API_KEY = 'x-api-key'

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

function validarClaveServicio(req: Request): void {
  const customSecret = Deno.env.get('SERVICE_FUNCTION_SECRET')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  
  if (!customSecret && !serviceRoleKey && !anonKey) {
    throw new Error('Falta SERVICE_FUNCTION_SECRET, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY en configuración')
  }

  const headerValue = req.headers.get(HEADER_API_KEY) ?? req.headers.get('authorization')
  const clave = headerValue?.startsWith('Bearer ')
    ? headerValue.slice(7)
    : headerValue || ''

  // Aceptar secret personalizado, service role key o anon key
  const esValido = (customSecret && clave === customSecret) || 
                   (serviceRoleKey && clave === serviceRoleKey) ||
                   (anonKey && clave === anonKey)
  
  if (!esValido) {
    throw new UnauthorizedError('No autorizado para ejecutar esta función')
  }
}

export function crearClienteServicio(req: Request): SupabaseClient {
  validarClaveServicio(req)

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

export { UnauthorizedError }

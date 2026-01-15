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
  
  if (!customSecret && !serviceRoleKey) {
    throw new Error('Falta SERVICE_FUNCTION_SECRET o SUPABASE_SERVICE_ROLE_KEY en configuración')
  }

  const headerValue = req.headers.get(HEADER_API_KEY) ?? req.headers.get('authorization')
  const clave = headerValue?.startsWith('Bearer ')
    ? headerValue.slice(7)
    : headerValue || ''

  if (!clave) {
    throw new UnauthorizedError('No se proporcionó clave de autenticación')
  }

  // Aceptar solo secret personalizado o service role key (NO anon key por seguridad)
  const esValido = (customSecret && clave === customSecret) || 
                   (serviceRoleKey && clave === serviceRoleKey)
  
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

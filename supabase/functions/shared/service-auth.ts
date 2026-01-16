// Utilidad de autenticación para Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
 
export class UnauthorizedError extends Error {
  constructor(message = 'No autorizado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}
 
/**
 * Crea un cliente de Supabase con role service_role
 * Para operaciones administrativas desde Edge Functions
 */
export function crearClienteServicio(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas')
  }
 
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
 
/**
 * Valida autenticación del usuario desde el request
 * Lanza UnauthorizedError si no está autenticado
 */
export async function validarAutenticacion(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
 
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables de entorno no configuradas')
  }
 
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new UnauthorizedError('Token de autorización no proporcionado')
  }
 
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authHeader },
    },
  })
 
  const { data: { user }, error } = await supabase.auth.getUser()
 
  if (error || !user) {
    throw new UnauthorizedError('Token inválido o expirado')
  }
 
  return user
}
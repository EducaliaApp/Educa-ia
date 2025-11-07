// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const respuesta = JSON.stringify({
  error: 'Función analizar-video no está disponible actualmente'
})

serve(() => {
  return new Response(respuesta, {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
})

'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/Button'
import { Bell, X, ExternalLink } from 'lucide-react'

interface Documento {
  id: string
  titulo: string
}

interface CambioDocumento {
  id: string
  version_anterior: string
  version_nueva: string
  detectado_at: string
  documento?: Documento
}

export function NotificacionCambiosDocumentos() {
  const [cambios, setCambios] = useState<CambioDocumento[]>([])
  const [mostrar, setMostrar] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    cargarCambiosRecientes()

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('cambios-documentos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historial_cambios_documentos'
        },
        (payload: { new: CambioDocumento }) => {
          setCambios((prev: CambioDocumento[]) => [payload.new, ...prev])
        }
      )
      .on(
        'broadcast',
        { event: 'documento_cambio' },
        (payload: any) => {
          // Recargar cambios cuando hay notificación broadcast
          cargarCambiosRecientes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function cargarCambiosRecientes() {
    const { data } = await supabase
      .from('historial_cambios_documentos')
      .select(`
        *,
        documento:documentos_oficiales(*)
      `)
      .order('detectado_at', { ascending: false })
      .limit(5)

    if (data) {
      setCambios(data)
    }
  }

  if (!mostrar || cambios.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-md z-50">
      <Alert className="bg-blue-50 border-blue-200">
        <Bell className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Documentos Actualizados
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMostrar(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            {cambios.slice(0, 3).map((cambio: CambioDocumento) => (
              <div key={cambio.id} className="text-sm p-2 bg-blue-25 rounded border-l-2 border-blue-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <strong className="text-blue-900">{cambio.documento?.titulo}</strong>
                    <br />
                    <span className="text-blue-600 text-xs">
                      {cambio.version_anterior} → {cambio.version_nueva}
                    </span>
                    <br />
                    <span className="text-blue-500 text-xs">
                      {new Date(cambio.detectado_at).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open('/admin/documentos', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {cambios.length > 3 && (
            <Button
              variant="ghost"
              className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-800"
              onClick={() => window.open('/admin/documentos', '_blank')}
            >
              Ver todos los cambios ({cambios.length}) →
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
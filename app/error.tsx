'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { SUPABASE_ENV_GROUPS, isMissingSupabaseEnvError } from '@/lib/supabase/config'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error }: Readonly<ErrorProps>) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const missingSupabase = isMissingSupabaseEnvError(error)
  const supabaseEnvGroups = SUPABASE_ENV_GROUPS

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-12 text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">Algo no está configurado correctamente</h1>
        {missingSupabase ? (
          <>
            <p className="text-lg text-gray-700">
              Para usar la aplicación necesitas definir las variables de entorno{' '}
              {supabaseEnvGroups.map((group, groupIndex) => (
                <span key={group.join('-')}>
                  {groupIndex > 0 && ' y '}
                  {group.map((option, optionIndex) => (
                    <span key={option}>
                      {optionIndex > 0 && ' o '}
                      <code className="font-mono bg-gray-100 px-2 py-1 rounded">{option}</code>
                    </span>
                  ))}
                </span>
              ))}{' '}
              con las credenciales de tu proyecto Supabase.
            </p>
            <p className="text-gray-600">
              Revisa el archivo <code className="font-mono bg-gray-100 px-2 py-1 rounded">SETUP-ENV.md</code> para obtener los
              pasos detallados o visita la{' '}
              <Link
                href="https://supabase.com/dashboard/project/_/settings/api"
                className="text-primary font-semibold hover:underline"
              >
                consola de Supabase
              </Link>{' '}
              y copia la URL y la llave anónima.
            </p>
          </>
        ) : (
          <p className="text-lg text-gray-700">Se produjo un error inesperado. Intenta nuevamente más tarde.</p>
        )}
      </div>
    </div>
  )
}

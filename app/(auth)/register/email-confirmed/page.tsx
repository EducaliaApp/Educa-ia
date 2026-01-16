'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const REDIRECT_DELAY_MS = 5000

export default function EmailConfirmedPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login')
      router.refresh()
    }, REDIRECT_DELAY_MS)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
          <p className="mt-2 text-gray-600">¡Correo verificado con éxito!</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg text-sm space-y-2">
          <p className="font-medium">
            Has validado tu correo electrónico con éxito. Serás redirigido al inicio de sesión para ingresar con las credenciales
            que creaste durante el registro.
          </p>
          <p>Si la redirección no ocurre automáticamente, utiliza el botón para continuar.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full inline-flex justify-center rounded-lg bg-primary px-4 py-2 text-white font-medium shadow-sm hover:bg-primary/90 transition"
          >
            Ir al inicio de sesión
          </Link>
          <Link
            href="/register"
            className="w-full inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Crear otra cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}

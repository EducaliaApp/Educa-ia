import Link from 'next/link'

type VerifyEmailPageProps = {
  searchParams?: {
    email?: string
  }
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const email = searchParams?.email

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
          <p className="mt-2 text-gray-600">Revisa tu correo electrónico</p>
        </div>

        <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded-lg text-sm space-y-2">
          <p className="font-medium">Te hemos enviado un mensaje para verificar tu dirección de correo.</p>
          {email ? (
            <p>
              Abre <span className="font-semibold">{email}</span> y sigue el enlace de verificación para activar tu cuenta.
            </p>
          ) : (
            <p>Abre tu bandeja de entrada y sigue el enlace de verificación para activar tu cuenta.</p>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Si no ves el correo, revisa tu carpeta de spam o promociones. También puedes intentar reenviar el correo desde la página de inicio de sesión.
          </p>
          <p>
            Si el problema persiste, escríbenos a{' '}
            <a href="mailto:soporte@profeflow.com" className="text-primary font-medium hover:underline">
              soporte@profeflow.com
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full inline-flex justify-center rounded-lg bg-primary px-4 py-2 text-white font-medium shadow-sm hover:bg-primary/90 transition"
          >
            Ir a iniciar sesión
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

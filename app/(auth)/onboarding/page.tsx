import Link from 'next/link'

type OnboardingPageProps = {
  searchParams?: {
    status?: string
  }
}

export default function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const status = searchParams?.status

  const message = (() => {
    if (status === 'profile-created') {
      return 'Creamos tu perfil automáticamente. Vuelve a iniciar sesión para continuar con el onboarding.'
    }

    if (status === 'profile-error') {
      return 'Tuvimos un problema al preparar tu perfil. Cierra las pestañas abiertas y vuelve a iniciar sesión para continuar.'
    }

    return 'Completa el onboarding para acceder a tu panel.'
  })()

  const registerButtonClass =
    'w-full inline-flex justify-center rounded-lg bg-primary px-4 py-2 text-white font-medium shadow-sm hover:bg-primary/90 transition'
  const loginButtonClass =
    'w-full inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 transition'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
          <p className="mt-2 text-gray-600">Prepara tu cuenta antes de continuar</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Revisa que tu registro esté completo y vuelve a iniciar sesión para acceder al dashboard.
          </p>
          <p>
            Si acabas de completar el registro, espera unos segundos antes de iniciar sesión nuevamente.
          </p>
          <p>
            Si el problema persiste, escríbenos a{' '}
            <a
              href="mailto:soporte@profeflow.com"
              className="text-primary font-medium hover:underline"
            >
              soporte@profeflow.com
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className={registerButtonClass}
          >
            Ir al registro
          </Link>
          <Link
            href="/login"
            className={loginButtonClass}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

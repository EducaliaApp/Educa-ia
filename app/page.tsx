import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-gray-900">
          Profe<span className="text-primary">Flow</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Planificación curricular inteligente con IA para profesores chilenos
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-secondary text-white rounded-lg hover:bg-green-600 transition"
          >
            Registrarse Gratis
          </Link>
        </div>
      </div>
    </div>
  )
}

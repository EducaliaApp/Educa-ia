import Link from 'next/link'
import { Check, Crown, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function UpgradePage() {
  const features = {
    free: [
      { text: '5 planificaciones por mes', included: true },
      { text: '3 evaluaciones por mes', included: true },
      { text: 'Generación con IA', included: true },
      { text: 'Exportación a PDF con marca de agua', included: true },
      { text: 'Planificaciones ilimitadas', included: false },
      { text: 'Evaluaciones ilimitadas', included: false },
      { text: 'PDFs sin marca de agua', included: false },
      { text: 'Soporte prioritario', included: false },
      { text: 'Acceso a nuevas funciones', included: false },
    ],
    pro: [
      { text: '5 planificaciones por mes', included: true },
      { text: '3 evaluaciones por mes', included: true },
      { text: 'Generación con IA', included: true },
      { text: 'Exportación a PDF', included: true },
      { text: 'Planificaciones ilimitadas', included: true },
      { text: 'Evaluaciones ilimitadas', included: true },
      { text: 'PDFs sin marca de agua', included: true },
      { text: 'Soporte prioritario', included: true },
      { text: 'Acceso a nuevas funciones', included: true },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Elige el plan perfecto para ti
          </h1>
          <p className="text-xl text-gray-600">
            Lleva tu planificación educativa al siguiente nivel
          </p>
        </div>

        {/* Plans Comparison */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* FREE Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Plan FREE</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/mes</span>
              </div>
              <p className="text-gray-600 mt-2">
                Perfecto para probar ProfeFlow
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {features.free.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Comenzar Gratis
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* PRO Plan */}
          <Card className="relative border-2 border-primary shadow-xl">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                Más Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                Plan PRO
              </CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$6.990</span>
                <span className="text-gray-600">/mes</span>
              </div>
              <p className="text-gray-600 mt-2">
                Para profesores que quieren lo mejor
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {features.pro.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-900 font-medium">
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button className="w-full">
                <Crown className="h-5 w-5 mr-2" />
                Suscribirse Ahora
              </Button>
              <p className="text-xs text-center text-gray-500 mt-3">
                Integración de pagos próximamente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Preguntas Frecuentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  ¿Puedo cancelar en cualquier momento?
                </h3>
                <p className="text-gray-600">
                  Sí, puedes cancelar tu suscripción PRO en cualquier momento. No hay compromisos a largo plazo.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  ¿Qué pasa con mis planificaciones si cambio de plan?
                </h3>
                <p className="text-gray-600">
                  Todas tus planificaciones y evaluaciones quedan guardadas. Siempre tendrás acceso a todo lo que hayas creado.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  ¿Los créditos se renuevan cada mes?
                </h3>
                <p className="text-gray-600">
                  Sí, en el plan FREE tus créditos se renuevan el día 1 de cada mes. En el plan PRO tienes acceso ilimitado.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  ¿Qué métodos de pago aceptan?
                </h3>
                <p className="text-gray-600">
                  Próximamente aceptaremos tarjetas de crédito, débito y transferencias bancarias.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-primary hover:underline">
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProfeFlow - Planificación Inteligente para Profesores',
  description: 'Herramienta de planificación curricular con LIA para profesores chilenos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}

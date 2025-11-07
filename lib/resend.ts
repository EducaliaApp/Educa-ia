import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(email: string, nombre: string) {
  try {
    await resend.emails.send({
      from: 'ProfeFlow <onboarding@profeflow.com>',
      to: email,
      subject: 'Bienvenido a ProfeFlow',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">¡Bienvenido a ProfeFlow, ${nombre}!</h1>
          <p>Estamos emocionados de tenerte con nosotros.</p>
          <p>Con ProfeFlow puedes:</p>
          <ul>
            <li>Generar planificaciones curriculares con LIA</li>
            <li>Evaluar trabajos de estudiantes con retroalimentación inteligente</li>
            <li>Exportar todo a PDF de manera profesional</li>
          </ul>
          <p>Como usuario FREE, tienes:</p>
          <ul>
            <li>5 planificaciones por mes</li>
            <li>3 evaluaciones por mes</li>
          </ul>
          <p>
            <a href="https://profeflow.com/upgrade" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Actualizar a PRO
            </a>
          </p>
          <p style="margin-top: 32px; color: #666; font-size: 14px;">
            ¿Tienes preguntas? Responde a este email y te ayudaremos encantados.
          </p>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            ProfeFlow - Planificación Inteligente para Profesores
          </p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Error al enviar email de bienvenida:', error)
    // No lanzamos el error para no bloquear el registro
  }
}

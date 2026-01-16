// app/(dashboard)/dashboard/portafolio/[id]/editar/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortafolioEditForm } from './PortafolioEditForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PortafolioEditarPage({ params }: Props) {
  const resolvedParams = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener portafolio existente
  const { data: portafolio, error } = await supabase
    .from('portafolios')
    .select('*')
    .eq('id', resolvedParams.id)
    .eq('profesor_id', user.id)
    .single()

  if (error || !portafolio) {
    redirect('/dashboard/portafolio')
  }

  return <PortafolioEditForm portafolio={portafolio} />
}

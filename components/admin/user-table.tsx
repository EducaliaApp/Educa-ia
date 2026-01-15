'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  nombre: string
  email: string
  plan: 'free' | 'pro'
  asignatura: string
  total_planificaciones?: number
  creditos_planificaciones?: number
  creditos_evaluaciones?: number
  creditos_usados_planificaciones?: number
  creditos_usados_evaluaciones?: number
  created_at: string
}

interface UserTableProps {
  users: User[]
  onPlanToggle?: (userId: string, currentPlan: 'free' | 'pro') => void
  isLoading?: boolean
}

export function UserTable({ users, onPlanToggle, isLoading }: UserTableProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)

  const handlePlanToggle = async (userId: string, currentPlan: 'free' | 'pro') => {
    setLoadingUserId(userId)
    await onPlanToggle?.(userId, currentPlan)
    setLoadingUserId(null)
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-400">Cargando usuarios...</span>
        </div>
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
        <p className="text-slate-400 text-center">No hay usuarios registrados</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                Usuario
              </th>
              <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                Email
              </th>
              <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                Plan
              </th>
              <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                Asignatura
              </th>
              <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                Créditos Plan.
              </th>
              <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                Créditos Eval.
              </th>
              <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                Registro
              </th>
              {onPlanToggle && (
                <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-medium text-sm">
                        {user.nombre?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-white font-medium">{user.nombre}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{user.email}</td>
                <td className="px-6 py-4">
                  <Badge variant={user.plan === 'pro' ? 'success' : 'default'}>
                    {user.plan.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">
                  {user.asignatura || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <span className="text-slate-300 font-medium">
                      {user.creditos_usados_planificaciones || 0}/{user.creditos_planificaciones || 0}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <span className="text-slate-300 font-medium">
                      {user.creditos_usados_evaluaciones || 0}/{user.creditos_evaluaciones || 0}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">
                  {formatDate(user.created_at)}
                </td>
                {onPlanToggle && (
                  <td className="px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlanToggle(user.id, user.plan)}
                      disabled={loadingUserId === user.id}
                    >
                      {loadingUserId === user.id ? (
                        'Cambiando...'
                      ) : (
                        `Cambiar a ${user.plan === 'free' ? 'PRO' : 'FREE'}`
                      )}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserTable } from '@/components/admin/user-table'
import Input from '@/components/ui/Input'
import { Search, Users as UsersIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  nombre: string
  email: string
  plan: 'free' | 'pro'
  asignatura: string
  created_at: string
  total_planificaciones?: number
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState('all')

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchTerm, planFilter, users])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      // Get all users with their planificaciones count
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nombre, email, plan, asignatura, created_at')
        .order('created_at', { ascending: false })

      if (profiles) {
        // Get planificaciones count for each user
        const usersWithCounts = await Promise.all(
          profiles.map(async (profile) => {
            const { count } = await supabase
              .from('planificaciones')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id)

            return {
              ...profile,
              total_planificaciones: count || 0,
            }
          })
        )

        setUsers(usersWithCounts as User[])
        setFilteredUsers(usersWithCounts as User[])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by plan
    if (planFilter !== 'all') {
      filtered = filtered.filter((user) => user.plan === planFilter)
    }

    setFilteredUsers(filtered)
  }

  const handlePlanToggle = async (userId: string, currentPlan: 'free' | 'pro') => {
    const newPlan = currentPlan === 'free' ? 'pro' : 'free'

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: newPlan })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, plan: newPlan } : user))
      )
    } catch (error) {
      console.error('Error updating plan:', error)
      alert('Error al actualizar el plan')
    }
  }

  const freeUsersCount = users.filter((u) => u.plan === 'free').length
  const proUsersCount = users.filter((u) => u.plan === 'pro').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Gestión de Usuarios</h1>
        <p className="text-slate-400">Administra todos los usuarios de ProfeFlow</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Usuarios</p>
              <h3 className="text-white text-3xl font-bold">{users.length}</h3>
            </div>
            <div className="p-3 bg-blue-600/10 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Usuarios FREE</p>
              <h3 className="text-white text-3xl font-bold">{freeUsersCount}</h3>
            </div>
            <div className="p-3 bg-slate-600/10 rounded-lg">
              <UsersIcon className="w-6 h-6 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Usuarios PRO</p>
              <h3 className="text-white text-3xl font-bold">{proUsersCount}</h3>
            </div>
            <div className="p-3 bg-green-600/10 rounded-lg">
              <UsersIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className={cn(
              'w-full px-3 py-2 border rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
              'bg-slate-800 border-slate-700 text-white'
            )}
          >
            <option value="all">Todos los planes</option>
            <option value="free">Solo FREE</option>
            <option value="pro">Solo PRO</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <UserTable
        users={filteredUsers}
        onPlanToggle={handlePlanToggle}
        isLoading={isLoading}
      />

      {/* Results count */}
      {!isLoading && (
        <div className="text-center">
          <p className="text-slate-400 text-sm">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </p>
        </div>
      )}
    </div>
  )
}

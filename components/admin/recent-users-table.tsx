'use client'

import { UserTable } from '@/components/admin/user-table'

interface RecentUsersTableProps {
  users: any[]
}

export function RecentUsersTable({ users }: RecentUsersTableProps) {
  if (!users || users.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
        <p className="text-slate-400 text-center">No hay usuarios recientes</p>
      </div>
    )
  }

  return <UserTable users={users} />
}

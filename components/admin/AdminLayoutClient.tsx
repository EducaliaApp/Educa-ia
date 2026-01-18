'use client'

import { useState } from 'react'
import { MobileMenuButton } from '../ui/MobileMenuButton'
import { MobileDrawer } from '../ui/MobileDrawer'
import { AdminSidebar } from './admin-sidebar'

interface AdminLayoutClientProps {
  userName: string
  userEmail: string
  children: React.ReactNode
}

/**
 * Client component para manejar la navegación móvil del admin
 */
export default function AdminLayoutClient({
  userName,
  userEmail,
  children,
}: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <div className="min-h-screen bg-slate-950 flex">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 border-b border-slate-800 h-14 flex items-center px-4">
          <MobileMenuButton onToggle={setMobileMenuOpen} />
          <div className="ml-3 flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">PF</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">ProfeFlow</h1>
              <p className="text-slate-400 text-xs">Panel Admin</p>
            </div>
          </div>
        </div>

        {/* Mobile padding for fixed header */}
        <div className="lg:hidden h-14 w-full" />

        {children}
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Panel Admin"
      >
        <AdminSidebar 
          userName={userName} 
          userEmail={userEmail}
          onClose={() => setMobileMenuOpen(false)}
        />
      </MobileDrawer>
    </>
  )
}

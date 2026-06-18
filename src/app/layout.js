'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import './globals.css'

const navItems = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/tecnicos', label: 'Técnicos', icon: '🔧' },
  { href: '/obras', label: 'Obras', icon: '🏗️' },
  { href: '/asignaciones', label: 'Asignaciones', icon: '📋' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/inventario', label: 'Inventario', icon: '📦' },
  { href: '/nomina', label: 'Nómina', icon: '💵' },
  { href: '/catalogo', label: 'Catálogo de Precios', icon: '🏷️' },
  { href: '/presupuestos', label: 'Presupuestos', icon: '📄' },
]

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isLoginPage = pathname === '/login'

  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-center">
                <img
                  src="/logo.png"
                  alt="CQ Ingeniería en Climatización"
                  className="h-20 w-auto object-contain"
                />
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const activo = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activo
                          ? 'bg-[#FF7900] text-white shadow-md shadow-orange-300/40'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="px-3 pb-4 border-t border-gray-200 pt-3">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Cerrar Sesión
                </button>
                <p className="text-gray-400 text-xs mt-3 px-3">v1.0 — Panel interno</p>
              </div>
            </aside>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col">
              <header className="bg-white border-b border-gray-200 px-8 py-5">
                <h1 className="text-2xl font-bold text-gray-900">
                  Sistema Base de Datos de la Empresa
                </h1>
              </header>

              <main className="flex-1 p-8">{children}</main>
            </div>
          </div>
        )}
      </body>
    </html>
  )
}

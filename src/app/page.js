'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function getHoyAR() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function getFecha7DiasAR() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

const cards = [
  {
    label: 'Técnicos',
    table: 'empleados',
    href: '/tecnicos',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    label: 'Obras',
    table: 'obras',
    href: '/obras',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    label: 'Clientes',
    table: 'clientes',
    href: '/clientes',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    label: 'Asignaciones',
    table: 'asignacion_obras',
    href: '/asignaciones',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
]

export default function Dashboard() {
  const [counts, setCounts] = useState({
    empleados: null,
    obras: null,
    clientes: null,
    asignacion_obras: null,
    enStock: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [alertasVehiculos, setAlertasVehiculos] = useState([])

  useEffect(() => {
    async function fetchCounts() {
      try {
        const fecha7dias = getFecha7DiasAR()

        const [r0, r1, r2, r3, r4, r5] = await Promise.all([
          supabase.from('empleados').select('*', { count: 'exact', head: true }),
          supabase.from('obras').select('*', { count: 'exact', head: true }),
          supabase.from('clientes').select('*', { count: 'exact', head: true }),
          supabase.from('asignacion_obras').select('*', { count: 'exact', head: true }),
          supabase.from('inventario').select('*', { count: 'exact', head: true }).eq('estado', 'En stock'),
          supabase
            .from('vehiculos')
            .select('id, patente, fecha_venc_seguro, fecha_venc_revision_tecnica')
            .or(`fecha_venc_seguro.lte.${fecha7dias},fecha_venc_revision_tecnica.lte.${fecha7dias}`),
        ])

        const firstError = [r0, r1, r2, r3, r4].find((r) => r.error)
        if (firstError) throw new Error(firstError.error.message)

        setCounts({
          empleados: r0.count,
          obras: r1.count,
          clientes: r2.count,
          asignacion_obras: r3.count,
          enStock: r4.count,
        })

        if (!r5.error && r5.data) setAlertasVehiculos(r5.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [])

  return (
    <div>
      <div className="mb-8 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-gray-900">Panel Principal</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general del sistema</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4 mb-6">
          <p className="font-semibold">Error al cargar datos</p>
          <p className="text-sm mt-1 font-mono">{error}</p>
        </div>
      )}

      {/* Banner de alertas de vehículos */}
      {alertasVehiculos.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-700 text-sm mb-2">
                Vencimientos próximos o vencidos ({alertasVehiculos.length} vehículo{alertasVehiculos.length !== 1 ? 's' : ''})
              </p>
              <ul className="space-y-1">
                {alertasVehiculos.map((v) => {
                  const hoyStr = getHoyAR()
                  const lines = []
                  if (v.fecha_venc_seguro && v.fecha_venc_seguro <= getFecha7DiasAR()) {
                    const vencido = v.fecha_venc_seguro < hoyStr
                    lines.push(
                      <li key={`seg-${v.id}`} className="text-sm text-red-600">
                        <span className="font-mono font-semibold">{v.patente}</span>
                        {' — Seguro '}
                        {vencido ? 'venció el' : 'vence el'}{' '}
                        <strong>{new Date(v.fecha_venc_seguro + 'T12:00:00').toLocaleDateString('es-AR')}</strong>
                      </li>
                    )
                  }
                  if (v.fecha_venc_revision_tecnica && v.fecha_venc_revision_tecnica <= getFecha7DiasAR()) {
                    const vencido = v.fecha_venc_revision_tecnica < hoyStr
                    lines.push(
                      <li key={`rev-${v.id}`} className="text-sm text-red-600">
                        <span className="font-mono font-semibold">{v.patente}</span>
                        {' — Rev. Técnica '}
                        {vencido ? 'venció el' : 'vence el'}{' '}
                        <strong>{new Date(v.fecha_venc_revision_tecnica + 'T12:00:00').toLocaleDateString('es-AR')}</strong>
                      </li>
                    )
                  }
                  return lines
                })}
              </ul>
              <Link
                href="/vehiculos"
                className="inline-block mt-2 text-xs font-medium text-red-600 hover:text-red-800 underline transition-colors"
              >
                Ver todos los vehículos →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cards principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
        {cards.map((card, i) => (
          <Link
            key={card.table}
            href={card.href}
            className="group bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col gap-3 animate-fade-in-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF7900] flex items-center justify-center">
              {card.icon}
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{card.label}</p>
              {loading ? (
                <div className="mt-1.5 w-14 h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className="text-4xl font-bold text-[#FF7900] mt-1 tabular-nums">
                  {counts[card.table] ?? '—'}
                </p>
              )}
            </div>

            <span className="text-xs text-gray-400 group-hover:text-[#FF7900] transition-colors duration-300 mt-auto">
              Ver detalle →
            </span>
          </Link>
        ))}
      </div>

      {/* Card Items en Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Link
          href="/inventario"
          className="group bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col gap-3 animate-fade-in-up"
          style={{ animationDelay: `${4 * 70}ms` }}
        >
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Items en Stock</p>
            {loading ? (
              <div className="mt-1.5 w-14 h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-4xl font-bold text-green-600 mt-1 tabular-nums">
                {counts.enStock ?? '—'}
              </p>
            )}
          </div>

          <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors duration-300 mt-auto">
            Ver inventario →
          </span>
        </Link>
      </div>
    </div>
  )
}

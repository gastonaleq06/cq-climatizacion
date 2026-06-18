'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function colorEstado(estado) {
  switch (estado) {
    case 'En Curso':   return 'bg-emerald-100 text-emerald-700 border border-emerald-300'
    case 'Finalizada': return 'bg-sky-100 text-sky-700 border border-sky-300'
    case 'Pausada':    return 'bg-amber-100 text-amber-700 border border-amber-300'
    default:           return 'bg-gray-100 text-gray-700 border border-gray-300'
  }
}

function colorEstadoPresupuesto(estado) {
  switch (estado) {
    case 'Aprobado':  return 'bg-green-100 text-green-700'
    case 'Enviado':   return 'bg-blue-100 text-blue-700'
    case 'Rechazado': return 'bg-red-100 text-red-700'
    default:          return 'bg-yellow-100 text-yellow-700'
  }
}

function formatPrecio(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0)
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR')
}

export default function FichaObra() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [obra, setObra] = useState(null)
  const [personal, setPersonal] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [presupuestos, setPresupuestos] = useState([])

  useEffect(() => {
    if (!id) return
    fetchTodo()
  }, [id])

  async function fetchTodo() {
    setLoading(true)
    setError(null)
    try {
      const { data: obraData, error: errObra } = await supabase
        .from('obras')
        .select('id, nombre_obra, fecha_inicio, estado, clientes(nombre_empresa)')
        .eq('id', id)
        .single()
      if (errObra) throw errObra

      const [
        { data: personalData, error: errPersonal },
        { data: movData, error: errMov },
        { data: presData, error: errPres },
      ] = await Promise.all([
        supabase
          .from('asignacion_obras')
          .select('id, fecha_asignacion, empleados(nombre)')
          .eq('id_obra', id)
          .order('fecha_asignacion', { ascending: false }),
        supabase
          .from('movimientos_inventario')
          .select('id, inventario_id, fecha, cantidad, inventario(nombre_producto, categoria, marca)')
          .eq('obra_id', id)
          .order('fecha', { ascending: false }),
        supabase
          .from('presupuestos')
          .select('id, fecha, estado, total, cliente')
          .eq('cliente', obraData.clientes?.nombre_empresa ?? '')
          .order('fecha', { ascending: false }),
      ])

      if (errPersonal) throw errPersonal
      if (errMov) throw errMov

      setObra(obraData)
      setPersonal(personalData || [])
      setMovimientos(movData || [])
      setPresupuestos(presData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tecnicosUnicos = personal.reduce((acc, asig) => {
    const nombre = asig.empleados?.nombre
    if (nombre && !acc.find(t => t.nombre === nombre)) {
      acc.push({ nombre, fechas: [] })
    }
    if (nombre) {
      acc.find(t => t.nombre === nombre).fechas.push(asig.fecha_asignacion)
    }
    return acc
  }, [])

  const consumoPorProducto = Object.values(
    movimientos.reduce((acc, m) => {
      const k = m.inventario_id
      if (!acc[k]) {
        acc[k] = {
          nombre: m.inventario?.nombre_producto ?? `Producto #${k}`,
          categoria: m.inventario?.categoria ?? '—',
          total: 0,
          movimientos: [],
        }
      }
      acc[k].total += m.cantidad
      acc[k].movimientos.push(m)
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p>Cargando ficha de obra...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4">
        <p className="font-semibold">Error al cargar la obra</p>
        <p className="text-sm mt-1 font-mono">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/obras')}
          className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
        >
          ← Volver
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-primary">{obra.nombre_obra}</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorEstado(obra.estado)}`}>
              {obra.estado}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {obra.clientes?.nombre_empresa ?? 'Sin cliente'} — Inicio: {formatFecha(obra.fecha_inicio)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Técnicos</p>
          <p className="text-3xl font-bold text-primary">{tecnicosUnicos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Ítems consumidos</p>
          <p className="text-3xl font-bold text-primary">{consumoPorProducto.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Presupuestos</p>
          <p className="text-3xl font-bold text-primary">{presupuestos.length}</p>
        </div>
      </div>

      {/* Personal asignado */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Personal Asignado
        </h3>
        {tecnicosUnicos.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay técnicos asignados a esta obra.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left">Técnico</th>
                  <th className="px-4 py-2.5 text-left">Asignaciones</th>
                  <th className="px-4 py-2.5 text-left">Última fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tecnicosUnicos.map(t => (
                  <tr key={t.nombre} className="bg-white">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{t.fechas.length}</td>
                    <td className="px-4 py-3 text-gray-700">{t.fechas[0] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inventario consumido */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Inventario Consumido
        </h3>
        {consumoPorProducto.length === 0 ? (
          <p className="text-gray-400 text-sm">No se despacharon materiales a esta obra todavía.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left">Producto</th>
                  <th className="px-4 py-2.5 text-left">Categoría</th>
                  <th className="px-4 py-2.5 text-right">Total despachado</th>
                  <th className="px-4 py-2.5 text-right">Movimientos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consumoPorProducto.map(p => (
                  <tr key={p.nombre} className="bg-white">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                        {p.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{p.total}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {p.movimientos.map(m => m.fecha).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Presupuestos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Presupuestos Asociados
          <span className="ml-2 text-gray-400 normal-case font-normal">
            (vinculados al cliente: {obra.clientes?.nombre_empresa ?? '—'})
          </span>
        </h3>
        {presupuestos.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay presupuestos asociados a este cliente.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left w-16">ID</th>
                  <th className="px-4 py-2.5 text-left">Fecha</th>
                  <th className="px-4 py-2.5 text-left">Estado</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {presupuestos.map(p => (
                  <tr key={p.id} className="bg-white">
                    <td className="px-4 py-3 text-gray-400 font-mono">{p.id}</td>
                    <td className="px-4 py-3 text-gray-700">{formatFecha(p.fecha)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${colorEstadoPresupuesto(p.estado)}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {formatPrecio(p.total)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/presupuestos/${p.id}`)}
                        className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                      >
                        Ver / Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

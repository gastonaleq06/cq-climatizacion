'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ESTADOS = ['Pendiente', 'Aprobado', 'Enviado', 'Rechazado']

const BADGE_COLOR = {
  Pendiente: 'bg-yellow-100 text-yellow-700',
  Aprobado: 'bg-green-100 text-green-700',
  Enviado: 'bg-blue-100 text-blue-700',
  Rechazado: 'bg-red-100 text-red-700',
}

function itemVacio() {
  return {
    _key: Math.random().toString(36).slice(2) + Date.now().toString(36),
    servicio_id: '',
    servicio_nombre: '',
    descripcion: '',
    cantidad: 1,
    precio_unitario: '',
  }
}

function formatPrecio(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0)
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR')
}

export default function Presupuestos() {
  const router = useRouter()
  const [vista, setVista] = useState('lista')

  const [catalogo, setCatalogo] = useState([])
  const [clientes, setClientes] = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [clienteId, setClienteId] = useState('')
  const [fecha, setFecha] = useState('')
  const [estado, setEstado] = useState('Pendiente')
  const [items, setItems] = useState([itemVacio()])
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)

  const total = items.reduce((sum, it) => {
    return sum + (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0)
  }, 0)

  async function fetchCatalogo() {
    const { data } = await supabase
      .from('catalogo_servicios')
      .select('id, nombre, descripcion, precio_base, categoria')
      .order('categoria')
    if (data) setCatalogo(data)
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre_empresa')
      .order('nombre_empresa')
    if (data) setClientes(data)
  }

  async function fetchPresupuestos() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('id, cliente, fecha, estado, total, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPresupuestos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalogo()
    fetchClientes()
    fetchPresupuestos()
  }, [])

  function agregarItem() {
    setItems(prev => [...prev, itemVacio()])
  }

  function eliminarItem(key) {
    setItems(prev => prev.filter(it => it._key !== key))
  }

  function actualizarItem(key, field, value) {
    setItems(prev =>
      prev.map(it => {
        if (it._key !== key) return it
        const updated = { ...it, [field]: value }
        if (field === 'servicio_id') {
          const svc = catalogo.find(s => String(s.id) === value)
          if (svc) {
            updated.servicio_nombre = svc.nombre
            updated.descripcion = svc.descripcion || ''
            updated.precio_unitario = String(svc.precio_base)
          }
        }
        return updated
      })
    )
  }

  async function handleGuardar() {
    setErrorForm(null)

    const clienteSeleccionado = clientes.find(c => String(c.id) === clienteId)
    if (!clienteSeleccionado) return setErrorForm('Seleccioná un cliente.')
    if (!fecha) return setErrorForm('La fecha es obligatoria.')
    if (items.length === 0) return setErrorForm('Agregá al menos un ítem.')

    for (const it of items) {
      if (!it.servicio_nombre.trim()) return setErrorForm('Cada ítem debe tener un nombre de servicio.')
      const qty = parseFloat(it.cantidad)
      const price = parseFloat(it.precio_unitario)
      if (!qty || qty < 1) return setErrorForm('La cantidad de cada ítem debe ser mayor a 0.')
      if (isNaN(price) || price < 0) return setErrorForm('El precio unitario de cada ítem debe ser válido.')
    }

    setGuardando(true)
    try {
      const { data: presupuesto, error: errP } = await supabase
        .from('presupuestos')
        .insert([{ cliente: clienteSeleccionado.nombre_empresa, fecha, estado, total }])
        .select('id')
        .single()
      if (errP) throw errP

      const payload = items.map(it => ({
        presupuesto_id: presupuesto.id,
        servicio_nombre: it.servicio_nombre.trim(),
        descripcion: it.descripcion.trim() || null,
        cantidad: Math.max(1, Math.round(parseFloat(it.cantidad))),
        precio_unitario: parseFloat(it.precio_unitario),
        subtotal: Math.max(1, Math.round(parseFloat(it.cantidad))) * parseFloat(it.precio_unitario),
      }))

      const { error: errI } = await supabase.from('presupuestos_items').insert(payload)
      if (errI) throw errI

      setClienteId('')
      setFecha('')
      setEstado('Pendiente')
      setItems([itemVacio()])
      setVista('lista')
      await fetchPresupuestos()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function cancelarNuevo() {
    setClienteId('')
    setFecha('')
    setEstado('Pendiente')
    setItems([itemVacio()])
    setErrorForm(null)
    setVista('lista')
  }

  // ── LISTA ──────────────────────────────────────────────────────────────
  if (vista === 'lista') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary">Presupuestos</h2>
            <p className="text-gray-500 text-sm mt-0.5">Historial de presupuestos generados</p>
          </div>
          <button
            onClick={() => setVista('nuevo')}
            className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
          >
            + Nuevo Presupuesto
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p>Cargando presupuestos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4">
            <p className="font-semibold">Error al cargar datos</p>
            <p className="text-sm mt-1 font-mono">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200">
                  <th className="px-6 py-3 text-left w-16">ID</th>
                  <th className="px-6 py-3 text-left">Cliente</th>
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {presupuestos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                      No hay presupuestos aún. Hacé clic en "+ Nuevo Presupuesto" para crear el primero.
                    </td>
                  </tr>
                ) : (
                  presupuestos.map(p => (
                    <tr key={p.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-400 font-mono">{p.id}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{p.cliente}</td>
                      <td className="px-6 py-3 text-gray-500">{formatFecha(p.fecha)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            BADGE_COLOR[p.estado] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold text-gray-900">
                        {formatPrecio(p.total)}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => router.push(`/presupuestos/${p.id}`)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          Ver / Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── NUEVO PRESUPUESTO ──────────────────────────────────────────────────
  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={cancelarNuevo}
          className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
        >
          ← Volver
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Nuevo Presupuesto</h2>
          <p className="text-gray-500 text-sm mt-0.5">Completá los datos y los ítems del servicio</p>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Datos del Cliente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-sm text-gray-500 mb-1">Cliente *</label>
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Seleccioná un cliente —</option>
              {clientes.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre_empresa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Estado</label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ESTADOS.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Ítems del Presupuesto
          </h3>
          <button
            onClick={agregarItem}
            className="text-primary hover:text-primary-600 text-sm font-medium border border-primary/30 hover:border-primary/60 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Agregar Ítem
          </button>
        </div>

        <div className="space-y-4">
          {items.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              No hay ítems. Hacé clic en "+ Agregar Ítem" para comenzar.
            </p>
          )}

          {items.map((it, idx) => {
            const subtotal =
              (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0)
            return (
              <div
                key={it._key}
                className="border border-gray-100 rounded-xl p-4 bg-gray-50/60"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Ítem #{idx + 1}
                  </span>
                  <button
                    onClick={() => eliminarItem(it._key)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    ✕ Eliminar
                  </button>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    Cargar desde el catálogo (opcional)
                  </label>
                  <select
                    value={it.servicio_id}
                    onChange={e => actualizarItem(it._key, 'servicio_id', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— Elegir del catálogo —</option>
                    {catalogo.map(s => (
                      <option key={s.id} value={String(s.id)}>
                        [{s.categoria}] {s.nombre} — {formatPrecio(s.precio_base)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Nombre del servicio *
                    </label>
                    <input
                      type="text"
                      value={it.servicio_nombre}
                      onChange={e => actualizarItem(it._key, 'servicio_nombre', e.target.value)}
                      placeholder="Ej: Instalación Split 3000 fg"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={it.descripcion}
                      onChange={e => actualizarItem(it._key, 'descripcion', e.target.value)}
                      placeholder="Detalle adicional (opcional)"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cantidad *</label>
                    <input
                      type="number"
                      value={it.cantidad}
                      onChange={e => actualizarItem(it._key, 'cantidad', e.target.value)}
                      min="1"
                      step="1"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Precio Unitario (ARS) *
                    </label>
                    <input
                      type="number"
                      value={it.precio_unitario}
                      onChange={e => actualizarItem(it._key, 'precio_unitario', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="pb-0.5 text-right">
                    <p className="text-xs text-gray-400 mb-1">Subtotal</p>
                    <p className="font-mono font-semibold text-gray-900 text-sm">
                      {formatPrecio(subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Total y guardar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
              Total del Presupuesto
            </p>
            <p className="text-4xl font-bold text-primary">{formatPrecio(total)}</p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {errorForm && (
              <p className="text-red-600 text-sm font-mono text-right max-w-xs">{errorForm}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={cancelarNuevo}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
              >
                {guardando ? 'Guardando...' : 'Guardar Presupuesto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

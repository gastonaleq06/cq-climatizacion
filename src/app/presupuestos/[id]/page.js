'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

export default function EditarPresupuesto() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [catalogo, setCatalogo] = useState([])
  const [presupuesto, setPresupuesto] = useState(null)
  const [estado, setEstado] = useState('Pendiente')
  const [items, setItems] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [exito, setExito] = useState(false)

  const total = items.reduce(
    (sum, it) => sum + (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0),
    0
  )

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: p, error: errP }, { data: its, error: errI }, { data: cat }] =
        await Promise.all([
          supabase.from('presupuestos').select('*').eq('id', id).single(),
          supabase.from('presupuestos_items').select('*').eq('presupuesto_id', id).order('id'),
          supabase
            .from('catalogo_servicios')
            .select('id, nombre, descripcion, precio_base, categoria')
            .order('categoria'),
        ])

      if (errP) throw errP
      if (errI) throw errI

      setPresupuesto(p)
      setEstado(p.estado)
      setItems(
        (its || []).map(it => ({
          _key: String(it.id),
          servicio_id: '',
          servicio_nombre: it.servicio_nombre,
          descripcion: it.descripcion || '',
          cantidad: it.cantidad,
          precio_unitario: String(it.precio_unitario),
        }))
      )
      if (cat) setCatalogo(cat)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchData()
  }, [id])

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
    setExito(false)

    if (items.length === 0) return setErrorForm('El presupuesto debe tener al menos un ítem.')

    for (const it of items) {
      if (!it.servicio_nombre.trim())
        return setErrorForm('Cada ítem debe tener un nombre de servicio.')
      const qty = parseFloat(it.cantidad)
      const price = parseFloat(it.precio_unitario)
      if (!qty || qty < 1) return setErrorForm('La cantidad de cada ítem debe ser mayor a 0.')
      if (isNaN(price) || price < 0)
        return setErrorForm('El precio unitario de cada ítem debe ser válido.')
    }

    setGuardando(true)
    try {
      const { error: errP } = await supabase
        .from('presupuestos')
        .update({ estado, total })
        .eq('id', id)
      if (errP) throw errP

      const { error: errDel } = await supabase
        .from('presupuestos_items')
        .delete()
        .eq('presupuesto_id', id)
      if (errDel) throw errDel

      const payload = items.map(it => ({
        presupuesto_id: Number(id),
        servicio_nombre: it.servicio_nombre.trim(),
        descripcion: it.descripcion.trim() || null,
        cantidad: Math.max(1, Math.round(parseFloat(it.cantidad))),
        precio_unitario: parseFloat(it.precio_unitario),
        subtotal:
          Math.max(1, Math.round(parseFloat(it.cantidad))) * parseFloat(it.precio_unitario),
      }))

      const { error: errI } = await supabase.from('presupuestos_items').insert(payload)
      if (errI) throw errI

      setExito(true)
      await fetchData()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p>Cargando presupuesto...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4">
        <p className="font-semibold">Error al cargar el presupuesto</p>
        <p className="text-sm mt-1 font-mono">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/presupuestos')}
          className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
        >
          ← Volver
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Presupuesto #{id}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {presupuesto?.cliente} — {formatFecha(presupuesto?.fecha)}
          </p>
        </div>
      </div>

      {/* Estado */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Estado del Presupuesto
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ESTADOS.map(op => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <span
            className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
              BADGE_COLOR[estado] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {estado}
          </span>
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
              <div key={it._key} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
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
            {exito && (
              <p className="text-green-600 text-sm font-medium">Cambios guardados correctamente.</p>
            )}
            {errorForm && (
              <p className="text-red-600 text-sm font-mono text-right max-w-xs">{errorForm}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/presupuestos')}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Volver
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
              >
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

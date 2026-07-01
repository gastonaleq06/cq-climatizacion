'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function getHoyAR() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-AR')
}

function formatPrecio(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0)
}

function colorEstadoVehiculo(estado) {
  switch (estado) {
    case 'Activo':    return 'bg-green-100 text-green-700 border border-green-300'
    case 'En Taller': return 'bg-amber-100 text-amber-700 border border-amber-300'
    case 'Inactivo':  return 'bg-red-100 text-red-700 border border-red-300'
    default:          return 'bg-gray-100 text-gray-700 border border-gray-300'
  }
}

const TIPOS_MANT = ['Cambio de aceite', 'Revisión técnica', 'Frenos', 'Neumáticos', 'Otro']

const formMantVacio = {
  fecha: '',
  tipo: 'Cambio de aceite',
  descripcion: '',
  km: '',
  costo: '',
}

export default function FichaVehiculo() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vehiculo, setVehiculo] = useState(null)
  const [mantenimientos, setMantenimientos] = useState([])

  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(formMantVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: v, error: errV },
        { data: m, error: errM },
      ] = await Promise.all([
        supabase.from('vehiculos').select('*').eq('id', id).single(),
        supabase.from('vehiculos_mantenimientos')
          .select('*')
          .eq('vehiculo_id', id)
          .order('fecha', { ascending: false }),
      ])
      if (errV) throw errV
      if (errM) throw errM
      setVehiculo(v)
      setMantenimientos(m || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function abrirModal() {
    setForm({ ...formMantVacio, fecha: getHoyAR() })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!form.fecha || !form.tipo) {
      setErrorForm('Fecha y tipo son obligatorios.')
      return
    }
    setGuardando(true)
    setErrorForm(null)
    try {
      const { error: err } = await supabase.from('vehiculos_mantenimientos').insert([{
        vehiculo_id: Number(id),
        fecha: form.fecha,
        tipo: form.tipo,
        descripcion: form.descripcion.trim() || null,
        km: form.km ? parseInt(form.km) : null,
        costo: form.costo ? parseFloat(form.costo) : null,
      }])
      if (err) throw err
      await fetchData()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(mantId) {
    if (!window.confirm('¿Eliminar este registro de mantenimiento?')) return
    setEliminandoId(mantId)
    try {
      const { error: err } = await supabase.from('vehiculos_mantenimientos').delete().eq('id', mantId)
      if (err) throw err
      await fetchData()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  const costoTotal = mantenimientos.reduce((sum, m) => sum + (parseFloat(m.costo) || 0), 0)

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p>Cargando ficha del vehículo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4">
        <p className="font-semibold">Error al cargar el vehículo</p>
        <p className="text-sm mt-1 font-mono">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/vehiculos')}
          className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
        >
          ← Volver
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-primary font-mono">{vehiculo.patente}</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorEstadoVehiculo(vehiculo.estado)}`}>
              {vehiculo.estado}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {vehiculo.marca} {vehiculo.modelo}
            {vehiculo.anio && ` (${vehiculo.anio})`}
          </p>
        </div>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Mantenimientos</p>
          <p className="text-3xl font-bold text-primary">{mantenimientos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Costo Total</p>
          <p className="text-2xl font-bold text-primary">{formatPrecio(costoTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Último KM</p>
          <p className="text-3xl font-bold text-primary">
            {mantenimientos.find(m => m.km)?.km?.toLocaleString('es-AR') ?? '—'}
          </p>
        </div>
      </div>

      {/* Fechas de vencimiento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Vencimientos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Seguro</p>
            <p className="font-medium text-gray-900">{formatFecha(vehiculo.fecha_venc_seguro)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Revisión Técnica</p>
            <p className="font-medium text-gray-900">{formatFecha(vehiculo.fecha_venc_revision_tecnica)}</p>
          </div>
        </div>
        {vehiculo.observaciones && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Observaciones</p>
            <p className="text-sm text-gray-700">{vehiculo.observaciones}</p>
          </div>
        )}
      </div>

      {/* Historial de mantenimientos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Historial de Mantenimientos
          </h3>
          <button
            onClick={abrirModal}
            className="bg-primary hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-primary/30"
          >
            + Registrar Mantenimiento
          </button>
        </div>

        {mantenimientos.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No hay mantenimientos registrados todavía.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left">Fecha</th>
                  <th className="px-4 py-2.5 text-left">Tipo</th>
                  <th className="px-4 py-2.5 text-left">Descripción</th>
                  <th className="px-4 py-2.5 text-right">KM</th>
                  <th className="px-4 py-2.5 text-right">Costo</th>
                  <th className="px-4 py-2.5 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mantenimientos.map((m) => (
                  <tr key={m.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatFecha(m.fecha)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {m.descripcion || <span className="text-gray-300 italic">Sin descripción</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {m.km ? m.km.toLocaleString('es-AR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {m.costo ? formatPrecio(m.costo) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEliminar(m.id)}
                        disabled={eliminandoId === m.id}
                        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {eliminandoId === m.id ? '...' : '✕ Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo mantenimiento */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Registrar Mantenimiento</h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Fecha *</label>
                  <input type="date" name="fecha" value={form.fecha} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary">
                    {TIPOS_MANT.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Descripción</label>
                <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Cambio 5W-40 + filtro" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">KM actuales</label>
                  <input type="number" name="km" value={form.km} onChange={handleChange} min="0"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: 85000" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Costo (ARS)</label>
                  <input type="number" name="costo" value={form.costo} onChange={handleChange} min="0" step="0.01"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: 15000" />
                </div>
              </div>

              {errorForm && <p className="text-red-600 text-sm font-mono">{errorForm}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando}
                  className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

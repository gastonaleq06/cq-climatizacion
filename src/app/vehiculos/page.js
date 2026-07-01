'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function getHoyAR() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-AR')
}

// Retorna clases de color según proximidad del vencimiento
function colorFecha(fechaStr) {
  if (!fechaStr) return 'text-gray-400'
  const hoy = new Date()
  const venc = new Date(fechaStr + 'T12:00:00')
  const diffDias = (venc - hoy) / (1000 * 60 * 60 * 24)
  if (diffDias < 0) return 'text-red-600 font-semibold'
  if (diffDias <= 7) return 'text-amber-600 font-semibold'
  return 'text-gray-700'
}

function colorEstadoVehiculo(estado) {
  switch (estado) {
    case 'Activo':    return 'bg-green-100 text-green-700'
    case 'En Taller': return 'bg-amber-100 text-amber-700'
    case 'Inactivo':  return 'bg-red-100 text-red-700'
    default:          return 'bg-gray-100 text-gray-600'
  }
}

const ESTADOS_VEHICULO = ['Activo', 'En Taller', 'Inactivo']

const formVacio = {
  patente: '',
  marca: '',
  modelo: '',
  anio: '',
  fecha_venc_seguro: '',
  fecha_venc_revision_tecnica: '',
  estado: 'Activo',
  observaciones: '',
}

export default function Vehiculos() {
  const router = useRouter()
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [eliminandoId, setEliminandoId] = useState(null)

  async function fetchVehiculos() {
    try {
      const { data, error: err } = await supabase
        .from('vehiculos')
        .select('id, patente, marca, modelo, anio, fecha_venc_seguro, fecha_venc_revision_tecnica, estado')
        .order('id', { ascending: false })
      if (err) throw err
      setVehiculos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehiculos()
  }, [])

  const vehiculosFiltrados = vehiculos.filter((v) => {
    const term = searchTerm.toLowerCase()
    return (
      v.patente?.toLowerCase().includes(term) ||
      v.marca?.toLowerCase().includes(term) ||
      v.modelo?.toLowerCase().includes(term)
    )
  })

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm(formVacio)
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(v) {
    setModoEdicion(true)
    setIdEditando(v.id)
    setForm({
      patente: v.patente || '',
      marca: v.marca || '',
      modelo: v.modelo || '',
      anio: v.anio?.toString() || '',
      fecha_venc_seguro: v.fecha_venc_seguro || '',
      fecha_venc_revision_tecnica: v.fecha_venc_revision_tecnica || '',
      estado: v.estado || 'Activo',
      observaciones: v.observaciones || '',
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!form.patente.trim() || !form.marca.trim() || !form.modelo.trim()) {
      setErrorForm('Patente, marca y modelo son obligatorios.')
      return
    }
    setGuardando(true)
    setErrorForm(null)
    try {
      const payload = {
        patente: form.patente.trim().toUpperCase(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        anio: form.anio ? parseInt(form.anio) : null,
        fecha_venc_seguro: form.fecha_venc_seguro || null,
        fecha_venc_revision_tecnica: form.fecha_venc_revision_tecnica || null,
        estado: form.estado,
        observaciones: form.observaciones.trim() || null,
      }
      if (modoEdicion) {
        const { error: err } = await supabase.from('vehiculos').update(payload).eq('id', idEditando)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('vehiculos').insert([payload])
        if (err) throw err
      }
      await fetchVehiculos()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este vehículo y su historial de mantenimientos?')) return
    setEliminandoId(id)
    try {
      const { error: err } = await supabase.from('vehiculos').delete().eq('id', id)
      if (err) throw err
      await fetchVehiculos()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Vehículos</h2>
      <p className="text-gray-500 mb-8 text-sm">Flota vehicular y control de vencimientos</p>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por patente, marca o modelo..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={abrirModalNuevo}
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
        >
          + Nuevo Vehículo
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${vehiculosFiltrados.length} vehículo(s) encontrados`}
      </p>

      {loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p>Cargando vehículos...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4 mb-6">
          <p className="font-semibold">Error al cargar datos</p>
          <p className="text-sm mt-1 font-mono">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200">
                <th className="px-5 py-3 text-left">Patente</th>
                <th className="px-5 py-3 text-left">Marca / Modelo</th>
                <th className="px-5 py-3 text-left">Vence Seguro</th>
                <th className="px-5 py-3 text-left">Vence Revisión</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehiculosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    No se encontraron vehículos
                  </td>
                </tr>
              ) : (
                vehiculosFiltrados.map((v) => (
                  <tr key={v.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-gray-900">{v.patente}</td>
                    <td className="px-5 py-3 text-gray-700">
                      {v.marca} {v.modelo}
                      {v.anio && <span className="ml-1 text-gray-400 text-xs">({v.anio})</span>}
                    </td>
                    <td className={`px-5 py-3 whitespace-nowrap ${colorFecha(v.fecha_venc_seguro)}`}>
                      {formatFecha(v.fecha_venc_seguro)}
                    </td>
                    <td className={`px-5 py-3 whitespace-nowrap ${colorFecha(v.fecha_venc_revision_tecnica)}`}>
                      {formatFecha(v.fecha_venc_revision_tecnica)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorEstadoVehiculo(v.estado)}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => router.push(`/vehiculos/${v.id}`)}
                          className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          🔧 Mantenimientos
                        </button>
                        <button
                          onClick={() => abrirModalEdicion(v)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(v.id)}
                          disabled={eliminandoId === v.id}
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          {eliminandoId === v.id ? '...' : '🗑️ Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo/editar vehículo */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">
                {modoEdicion ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Patente *</label>
                  <input type="text" name="patente" value={form.patente} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="ABC123" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Año</label>
                  <input type="number" name="anio" value={form.anio} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: 2020" min="1990" max="2030" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Marca *</label>
                  <input type="text" name="marca" value={form.marca} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: Ford" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Modelo *</label>
                  <input type="text" name="modelo" value={form.modelo} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: Transit" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Venc. Seguro</label>
                  <input type="date" name="fecha_venc_seguro" value={form.fecha_venc_seguro} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Venc. Rev. Técnica</label>
                  <input type="date" name="fecha_venc_revision_tecnica" value={form.fecha_venc_revision_tecnica} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Estado</label>
                <select name="estado" value={form.estado} onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary">
                  {ESTADOS_VEHICULO.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Observaciones</label>
                <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Notas adicionales..." />
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

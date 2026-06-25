'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CONCEPTOS = [
  'Nafta',
  'Materiales',
  'Viáticos',
  'Herramientas',
  'Servicios',
  'Transporte',
  'Alquiler',
  'Otros',
]

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const formVacio = {
  fecha: '',
  concepto: '',
  descripcion: '',
  monto: '',
}

function getHoyAR() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatPeso(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return Number(valor).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function getLastDay(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export default function Gastos() {
  const router = useRouter()
  const [listo, setListo] = useState(false)

  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [mesActivo, setMesActivo] = useState(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [eliminandoId, setEliminandoId] = useState(null)

  const anioActual = new Date().getFullYear()

  const fetchRegistros = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select('id, fecha, concepto, descripcion, monto')
        .order('fecha', { ascending: false })
      if (error) throw error
      setRegistros(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function verificarSesion() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace('/login'); return }
        setListo(true)
      } catch {
        router.replace('/login')
      }
    }
    verificarSesion()
  }, [router])

  useEffect(() => {
    if (!listo) return
    fetchRegistros()
  }, [listo, fetchRegistros])

  function seleccionarMes(idx) {
    const mes = String(idx + 1).padStart(2, '0')
    const primerDia = `${anioActual}-${mes}-01`
    const ultimoDia = `${anioActual}-${mes}-${String(getLastDay(anioActual, idx)).padStart(2, '0')}`
    setFechaDesde(primerDia)
    setFechaHasta(ultimoDia)
    setMesActivo(idx)
  }

  function limpiarFiltros() {
    setSearchTerm('')
    setFechaDesde('')
    setFechaHasta('')
    setMesActivo(null)
  }

  const registrosFiltrados = registros.filter((r) => {
    const term = searchTerm.toLowerCase()
    const matchText = !term || (
      r.concepto?.toLowerCase().includes(term) ||
      r.descripcion?.toLowerCase().includes(term)
    )
    const matchDesde = !fechaDesde || r.fecha >= fechaDesde
    const matchHasta = !fechaHasta || r.fecha <= fechaHasta
    return matchText && matchDesde && matchHasta
  })

  const totalGastos = registrosFiltrados.reduce((acc, r) => acc + (Number(r.monto) || 0), 0)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm({ ...formVacio, fecha: getHoyAR() })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(r) {
    setModoEdicion(true)
    setIdEditando(r.id)
    setForm({
      fecha: r.fecha || '',
      concepto: r.concepto || '',
      descripcion: r.descripcion || '',
      monto: r.monto ?? '',
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!form.fecha || !form.concepto || form.monto === '') {
      setErrorForm('Fecha, concepto y monto son obligatorios.')
      return
    }
    setGuardando(true)
    setErrorForm(null)
    try {
      const payload = {
        fecha: form.fecha,
        concepto: form.concepto,
        descripcion: form.descripcion.trim() || null,
        monto: parseFloat(form.monto),
      }
      if (modoEdicion) {
        const { error } = await supabase.from('gastos').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('gastos').insert([payload])
        if (error) throw error
      }
      await fetchRegistros()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    const confirmado = window.confirm('¿Estás seguro de eliminar este gasto?')
    if (!confirmado) return
    setEliminandoId(id)
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', id)
      if (error) throw error
      await fetchRegistros()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  if (!listo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Gastos</h2>
      <p className="text-gray-500 mb-6 text-sm">Registro de salidas de dinero — nafta, materiales, viáticos y más</p>

      {/* Tarjeta Total */}
      <div className="mb-6 bg-[#FF7900] rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-orange-200/50">
        <div>
          <p className="text-orange-100 text-sm font-medium uppercase tracking-wider">Total de Gastos</p>
          <p className="text-white text-4xl font-bold mt-1">
            {loading
              ? '...'
              : totalGastos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
            }
          </p>
          {(searchTerm || fechaDesde || fechaHasta) && (
            <p className="text-orange-200 text-xs mt-1">
              {[
                searchTerm && `"${searchTerm}"`,
                fechaDesde && `desde ${formatFecha(fechaDesde)}`,
                fechaHasta && `hasta ${formatFecha(fechaHasta)}`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="opacity-20">
          <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
          </svg>
        </div>
      </div>

      {/* Filtros superiores */}
      <div className="flex flex-wrap items-end gap-3 mb-3">
        {/* Búsqueda */}
        <div className="flex flex-col gap-1 w-full sm:w-64">
          <label className="text-xs font-medium text-gray-500">Buscar</label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Concepto o descripción..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Fecha Desde */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-gray-500">Fecha Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setFechaDesde(e.target.value); setMesActivo(null) }}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Fecha Hasta */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-gray-500">Fecha Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setFechaHasta(e.target.value); setMesActivo(null) }}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Limpiar filtros */}
        {(searchTerm || fechaDesde || fechaHasta) && (
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-transparent select-none">·</label>
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 border border-gray-200 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Botón nuevo gasto */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={abrirModalNuevo}
            className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30 h-[38px] whitespace-nowrap"
          >
            + Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Selector rápido de meses */}
      <div className="mb-4 overflow-x-auto pb-1">
        <div className="flex gap-1.5 min-w-max">
          {MESES.map((mes, idx) => (
            <button
              key={mes}
              onClick={() => seleccionarMes(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                mesActivo === idx
                  ? 'bg-[#FF7900] text-white shadow-md shadow-orange-300/40'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {mes}
            </button>
          ))}
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${registrosFiltrados.length} registro(s) encontrados`}
      </p>

      {loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p>Cargando gastos...</p>
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
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Concepto</th>
                <th className="px-5 py-3 text-left">Descripción</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-600">Monto</th>
                <th className="px-5 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    No se encontraron gastos
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((r) => (
                  <tr key={r.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{formatFecha(r.fecha)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {r.concepto || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-[260px] truncate">{r.descripcion || '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-right font-semibold text-[#FF7900]">{formatPeso(r.monto)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModalEdicion(r)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(r.id)}
                          disabled={eliminandoId === r.id}
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          {eliminandoId === r.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {registrosFiltrados.length > 0 && (
              <tfoot>
                <tr className="bg-orange-50 border-t-2 border-orange-200">
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Total mostrado
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[#FF7900] text-base">
                    {totalGastos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Modal nuevo / editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">
                {modoEdicion ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-900 transition-colors text-xl leading-none">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Concepto</label>
                <select
                  name="concepto"
                  value={form.concepto}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Seleccioná un concepto —</option>
                  {CONCEPTOS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Carga de combustible para obra Palermo..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Monto ($)</label>
                <input
                  type="number"
                  name="monto"
                  value={form.monto}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-[#FF7900] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>

              {errorForm && (
                <p className="text-red-600 text-sm font-mono">{errorForm}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
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

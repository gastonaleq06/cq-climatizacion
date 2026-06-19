'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const formVacio = {
  fecha: '',
  id_empleado: '',
  pago_hora: '',
  horas_trabajadas: '',
  detalle_otros: '',
  total_pago: '',
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

export default function Nomina() {
  const router = useRouter()
  const [rolVerificado, setRolVerificado] = useState(false)
  const [accesoDenegado, setAccesoDenegado] = useState(false)

  const [registros, setRegistros] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [eliminandoId, setEliminandoId] = useState(null)

  const fetchRegistros = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nomina')
        .select(`
          id,
          fecha,
          pago_hora,
          horas_trabajadas,
          detalle_otros,
          total_pago,
          empleados (
            id,
            nombre,
            cargo
          )
        `)
        .order('fecha', { ascending: false })

      if (error) throw error
      setRegistros(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEmpleados = useCallback(async () => {
    const { data } = await supabase
      .from('empleados')
      .select('id, nombre, cargo')
      .order('nombre', { ascending: true })
    if (data) setEmpleados(data)
  }, [])

  useEffect(() => {
    async function verificarAcceso() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace('/login'); return }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('rol')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !['admin', 'jefe'].includes(profile.rol)) {
          setAccesoDenegado(true)
          setTimeout(() => router.replace('/'), 1500)
          return
        }

        setRolVerificado(true)
      } catch {
        router.replace('/login')
      }
    }
    verificarAcceso()
  }, [router])

  useEffect(() => {
    if (!rolVerificado) return
    fetchRegistros()
    fetchEmpleados()
  }, [rolVerificado, fetchRegistros, fetchEmpleados])

  const registrosFiltrados = registros.filter((r) => {
    const term = searchTerm.toLowerCase()
    const matchText = !term || (
      r.empleados?.nombre?.toLowerCase().includes(term) ||
      r.empleados?.cargo?.toLowerCase().includes(term) ||
      r.detalle_otros?.toLowerCase().includes(term)
    )
    const matchDesde = !fechaDesde || r.fecha >= fechaDesde
    const matchHasta = !fechaHasta || r.fecha <= fechaHasta
    return matchText && matchDesde && matchHasta
  })

  const totalSemana = registrosFiltrados.reduce((acc, r) => acc + (Number(r.total_pago) || 0), 0)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'pago_hora' || name === 'horas_trabajadas') {
        const ph = name === 'pago_hora' ? value : prev.pago_hora
        const ht = name === 'horas_trabajadas' ? value : prev.horas_trabajadas
        if (ph !== '' && ht !== '') {
          next.total_pago = (parseFloat(ph) * parseFloat(ht)).toFixed(2)
        }
      }
      return next
    })
  }

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm(formVacio)
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(r) {
    setModoEdicion(true)
    setIdEditando(r.id)
    setForm({
      fecha: r.fecha || '',
      id_empleado: r.empleados?.id ?? '',
      pago_hora: r.pago_hora ?? '',
      horas_trabajadas: r.horas_trabajadas ?? '',
      detalle_otros: r.detalle_otros || '',
      total_pago: r.total_pago ?? '',
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
  }

  async function handleGuardar(e) {
    e.preventDefault()

    if (!form.fecha || !form.id_empleado || form.pago_hora === '' || form.horas_trabajadas === '') {
      setErrorForm('Fecha, empleado, pago por hora y horas trabajadas son obligatorios.')
      return
    }

    setGuardando(true)
    setErrorForm(null)

    try {
      const payload = {
        fecha: form.fecha,
        id_empleado: Number(form.id_empleado),
        pago_hora: parseFloat(form.pago_hora),
        horas_trabajadas: parseFloat(form.horas_trabajadas),
        detalle_otros: form.detalle_otros.trim() || null,
        total_pago: parseFloat(form.total_pago),
      }

      if (modoEdicion) {
        const { error } = await supabase.from('nomina').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('nomina').insert([payload])
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
    const confirmado = window.confirm('¿Estás seguro de eliminar este registro de nómina?')
    if (!confirmado) return

    setEliminandoId(id)
    try {
      const { error } = await supabase.from('nomina').delete().eq('id', id)
      if (error) throw error
      await fetchRegistros()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  if (!rolVerificado) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {accesoDenegado ? (
          <div className="fixed bottom-6 right-6 bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 text-sm font-semibold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Acceso denegado
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p>Verificando acceso...</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Nómina Semanal</h2>
      <p className="text-gray-500 mb-6 text-sm">Registro de pagos y horas trabajadas</p>

      {/* Tarjeta Total Semana */}
      <div className="mb-6 bg-[#FF7900] rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-orange-200/50">
        <div>
          <p className="text-orange-100 text-sm font-medium uppercase tracking-wider">Total Semana</p>
          <p className="text-white text-4xl font-bold mt-1">
            {loading
              ? '...'
              : totalSemana.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
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
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        {/* Búsqueda por texto */}
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
              placeholder="Nombre, cargo, detalle..."
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
            onChange={(e) => setFechaDesde(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Fecha Hasta */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-gray-500">Fecha Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Botón limpiar filtros — solo visible si hay algún filtro activo */}
        {(searchTerm || fechaDesde || fechaHasta) && (
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-transparent select-none">·</label>
            <button
              onClick={() => { setSearchTerm(''); setFechaDesde(''); setFechaHasta('') }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 border border-gray-200 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Botón nuevo registro — empujado a la derecha en desktop */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={abrirModalNuevo}
            className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30 h-[38px]"
          >
            ➕ Nuevo Registro
          </button>
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${registrosFiltrados.length} registro(s) encontrados`}
      </p>

      {loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p>Cargando nómina...</p>
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
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Ocupación</th>
                <th className="px-5 py-3 text-right">Pago x Hora</th>
                <th className="px-5 py-3 text-right">Hs. Trabajadas</th>
                <th className="px-5 py-3 text-left">Detalles / Otros</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-600">Total</th>
                <th className="px-5 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((r) => (
                  <tr key={r.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{formatFecha(r.fecha)}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{r.empleados?.nombre ?? '—'}</td>
                    <td className="px-5 py-3 text-primary whitespace-nowrap">{r.empleados?.cargo ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap text-right">{formatPeso(r.pago_hora)}</td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap text-right">{r.horas_trabajadas ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{r.detalle_otros || '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-right font-semibold text-[#FF7900]">{formatPeso(r.total_pago)}</td>
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
                  <td colSpan={6} className="px-5 py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    Total mostrado
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[#FF7900] text-base">
                    {totalSemana.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">
                {modoEdicion ? 'Editar Registro' : 'Nuevo Registro'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-900 transition-colors">
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
                <label className="block text-sm text-gray-500 mb-1">Empleado</label>
                <select
                  name="id_empleado"
                  value={form.id_empleado}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Seleccioná un empleado —</option>
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Pago por Hora ($)</label>
                  <input
                    type="number"
                    name="pago_hora"
                    value={form.pago_hora}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Horas Trabajadas</label>
                  <input
                    type="number"
                    name="horas_trabajadas"
                    value={form.horas_trabajadas}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Detalles / Otros</label>
                <input
                  type="text"
                  name="detalle_otros"
                  value={form.detalle_otros}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: bono, viáticos, horas extra..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Total Pago ($)
                  <span className="ml-1 text-xs text-orange-400">— autocalculado, editable</span>
                </label>
                <input
                  type="number"
                  name="total_pago"
                  value={form.total_pago}
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

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Tecnicos() {
  const router = useRouter()
  const [listo, setListo] = useState(false)

  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    cargo: '',
    direccion: '',
    documento: '',
    telefono: '',
    alta_afip: '',
  })

  const [eliminandoId, setEliminandoId] = useState(null)

  async function fetchEmpleados() {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, cargo, direccion, documento, telefono, alta_afip')
        .order('id', { ascending: true })

      if (error) throw error
      setEmpleados(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function verificarSesion() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace('/login'); return }
        setListo(true)
        fetchEmpleados()
      } catch {
        router.replace('/login')
      }
    }
    verificarSesion()
  }, [router])

  const empleadosFiltrados = empleados.filter((emp) => {
    const term = searchTerm.toLowerCase()
    return (
      emp.nombre?.toLowerCase().includes(term) ||
      emp.cargo?.toLowerCase().includes(term)
    )
  })

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm({
      nombre: '',
      cargo: '',
      direccion: '',
      documento: '',
      telefono: '',
      alta_afip: '',
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(emp) {
    setModoEdicion(true)
    setIdEditando(emp.id)
    setForm({
      nombre: emp.nombre || '',
      cargo: emp.cargo || '',
      direccion: emp.direccion || '',
      documento: emp.documento || '',
      telefono: emp.telefono || '',
      alta_afip: emp.alta_afip || '',
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleGuardar(e) {
    e.preventDefault()

    if (
      !form.nombre.trim() ||
      !form.cargo.trim() ||
      !form.direccion.trim() ||
      !form.documento.trim() ||
      !form.telefono.trim() ||
      !form.alta_afip.trim()
    ) {
      setErrorForm('Completá todos los campos antes de guardar.')
      return
    }

    setGuardando(true)
    setErrorForm(null)

    try {
      const payload = {
        nombre: form.nombre.trim(),
        cargo: form.cargo.trim(),
        direccion: form.direccion.trim(),
        documento: form.documento.trim(),
        telefono: form.telefono.trim(),
        alta_afip: form.alta_afip.trim(),
      }

      if (modoEdicion) {
        const { error } = await supabase.from('empleados').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('empleados').insert([payload])
        if (error) throw error
      }

      await fetchEmpleados()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    const confirmado = window.confirm('¿Estás seguro de eliminar este técnico?')
    if (!confirmado) return

    setEliminandoId(id)

    try {
      const { error } = await supabase.from('empleados').delete().eq('id', id)
      if (error) throw error

      await fetchEmpleados()
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
      <h2 className="text-2xl font-bold text-primary mb-1">
        CQ Ingeniería en Climatización
      </h2>
      <p className="text-gray-500 mb-8 text-sm">Panel de gestión de técnicos</p>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o cargo..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={abrirModalNuevo}
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
        >
          ➕ Nuevo Técnico
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${empleadosFiltrados.length} técnico(s) encontrados`}
      </p>

      {loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p>Conectando con Supabase...</p>
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
                <th className="px-6 py-3 text-left w-16">ID</th>
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Cargo</th>
                <th className="px-6 py-3 text-left">Dirección</th>
                <th className="px-6 py-3 text-left">Documento</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-left">Alta AFIP</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {empleadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                    No se encontraron técnicos con esa búsqueda
                  </td>
                </tr>
              ) : (
                empleadosFiltrados.map((emp) => (
                  <tr
                    key={emp.id}
                    className="bg-white hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-400 font-mono">{emp.id}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{emp.nombre}</td>
                    <td className="px-6 py-3 text-primary whitespace-nowrap">{emp.cargo}</td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{emp.direccion}</td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{emp.documento}</td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{emp.telefono}</td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{emp.alta_afip}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModalEdicion(emp)}
                          title="Editar"
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(emp.id)}
                          disabled={eliminandoId === emp.id}
                          title="Eliminar"
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          {eliminandoId === emp.id ? '...' : '🗑️ Eliminar'}
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

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">
                {modoEdicion ? 'Editar Técnico' : 'Nuevo Técnico'}
              </h2>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Cargo</label>
                <input
                  type="text"
                  name="cargo"
                  value={form.cargo}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Técnico en Refrigeración"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Av. San Martín 450"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Documento</label>
                <input
                  type="text"
                  name="documento"
                  value={form.documento}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 30123456"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 387 555-1234"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Alta AFIP</label>
                <input
                  type="date"
                  name="alta_afip"
                  value={form.alta_afip}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
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

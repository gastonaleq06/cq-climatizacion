'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ESTADOS = ['En Planificación', 'En Curso', 'Finalizada', 'Pausada']

const formVacio = { nombre_obra: '', fecha_inicio: '', estado: ESTADOS[0], id_cliente: '' }

export default function Obras() {
  const [obras, setObras] = useState([])
  const [clientes, setClientes] = useState([])
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

  const router = useRouter()

  const fetchObras = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nombre_obra, fecha_inicio, estado, id_cliente, clientes(nombre_empresa)')
        .order('id', { ascending: true })

      if (error) throw error
      setObras(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre_empresa')
      .order('nombre_empresa', { ascending: true })
    if (data) setClientes(data)
  }, [])

  useEffect(() => {
    fetchObras()
    fetchClientes()
  }, [fetchObras, fetchClientes])

  const obrasFiltradas = obras.filter((obra) => {
    const term = searchTerm.toLowerCase()
    return (
      obra.nombre_obra?.toLowerCase().includes(term) ||
      obra.estado?.toLowerCase().includes(term) ||
      obra.clientes?.nombre_empresa?.toLowerCase().includes(term)
    )
  })

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm(formVacio)
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(obra) {
    setModoEdicion(true)
    setIdEditando(obra.id)
    setForm({
      nombre_obra: obra.nombre_obra || '',
      fecha_inicio: obra.fecha_inicio || '',
      estado: obra.estado || ESTADOS[0],
      id_cliente: obra.id_cliente ?? '',
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

    if (!form.nombre_obra.trim() || !form.fecha_inicio || !form.estado || !form.id_cliente) {
      setErrorForm('Completá todos los campos, incluido el cliente.')
      return
    }

    setGuardando(true)
    setErrorForm(null)

    try {
      const payload = {
        nombre_obra: form.nombre_obra.trim(),
        fecha_inicio: form.fecha_inicio,
        estado: form.estado,
        id_cliente: Number(form.id_cliente),
      }

      if (modoEdicion) {
        const { error } = await supabase.from('obras').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('obras').insert([payload])
        if (error) throw error
      }

      await fetchObras()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    const confirmado = window.confirm('¿Estás seguro de eliminar esta obra?')
    if (!confirmado) return

    setEliminandoId(id)

    try {
      const { error } = await supabase.from('obras').delete().eq('id', id)
      if (error) throw error

      await fetchObras()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  function colorEstado(estado) {
    switch (estado) {
      case 'En Curso':     return 'bg-emerald-100 text-emerald-700 border border-emerald-300'
      case 'Finalizada':   return 'bg-sky-100 text-sky-700 border border-sky-300'
      case 'Pausada':      return 'bg-amber-100 text-amber-700 border border-amber-300'
      default:             return 'bg-gray-100 text-gray-700 border border-gray-300'
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Gestión de Obras</h2>
      <p className="text-gray-500 mb-8 text-sm">Panel de gestión de obras</p>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
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
            placeholder="Buscar por nombre, cliente o estado..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={abrirModalNuevo}
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
        >
          ➕ Nueva Obra
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${obrasFiltradas.length} obra(s) encontradas`}
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
                <th className="px-6 py-3 text-left">Nombre de la Obra</th>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Fecha de Inicio</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {obrasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No se encontraron obras con esa búsqueda
                  </td>
                </tr>
              ) : (
                obrasFiltradas.map((obra) => (
                  <tr key={obra.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-400 font-mono">{obra.id}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{obra.nombre_obra}</td>
                    <td className="px-6 py-3 text-primary whitespace-nowrap">
                      {obra.clientes?.nombre_empresa ?? <span className="text-gray-400 italic">Sin cliente</span>}
                    </td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{obra.fecha_inicio}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorEstado(obra.estado)}`}>
                        {obra.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/obras/${obra.id}`)}
                          className="bg-primary hover:bg-primary-600 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          📊 Ver Ficha
                        </button>
                        <button
                          onClick={() => abrirModalEdicion(obra)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(obra.id)}
                          disabled={eliminandoId === obra.id}
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          {eliminandoId === obra.id ? '...' : '🗑️ Eliminar'}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">
                {modoEdicion ? 'Editar Obra' : 'Nueva Obra'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Nombre de la Obra</label>
                <input
                  type="text"
                  name="nombre_obra"
                  value={form.nombre_obra}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Edificio Torre Norte"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Cliente</label>
                <select
                  name="id_cliente"
                  value={form.id_cliente}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Seleccioná un cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_empresa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Fecha de Inicio</label>
                <input
                  type="date"
                  name="fecha_inicio"
                  value={form.fecha_inicio}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Estado</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ESTADOS.map((opcion) => (
                    <option key={opcion} value={opcion}>{opcion}</option>
                  ))}
                </select>
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

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [form, setForm] = useState({
    nombre_empresa: '',
    cuit_empresa: '',
    direccion_obra: '',
    contacto_nombre: '',
    contacto_telefono: '',
  })

  const [eliminandoId, setEliminandoId] = useState(null)

  async function fetchClientes() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_empresa, cuit_empresa, direccion_obra, contacto_nombre, contacto_telefono')
        .order('id', { ascending: true })

      if (error) throw error
      setClientes(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  const clientesFiltrados = clientes.filter((cliente) => {
    const term = searchTerm.toLowerCase()
    return (
      cliente.nombre_empresa?.toLowerCase().includes(term) ||
      cliente.contacto_nombre?.toLowerCase().includes(term)
    )
  })

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm({
      nombre_empresa: '',
      cuit_empresa: '',
      direccion_obra: '',
      contacto_nombre: '',
      contacto_telefono: '',
    })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(cliente) {
    setModoEdicion(true)
    setIdEditando(cliente.id)
    setForm({
      nombre_empresa: cliente.nombre_empresa || '',
      cuit_empresa: cliente.cuit_empresa || '',
      direccion_obra: cliente.direccion_obra || '',
      contacto_nombre: cliente.contacto_nombre || '',
      contacto_telefono: cliente.contacto_telefono || '',
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
      !form.nombre_empresa.trim() ||
      !form.cuit_empresa.trim() ||
      !form.direccion_obra.trim() ||
      !form.contacto_nombre.trim() ||
      !form.contacto_telefono.trim()
    ) {
      setErrorForm('Completá todos los campos antes de guardar.')
      return
    }

    setGuardando(true)
    setErrorForm(null)

    try {
      const payload = {
        nombre_empresa: form.nombre_empresa.trim(),
        cuit_empresa: form.cuit_empresa.trim(),
        direccion_obra: form.direccion_obra.trim(),
        contacto_nombre: form.contacto_nombre.trim(),
        contacto_telefono: form.contacto_telefono.trim(),
      }

      if (modoEdicion) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('clientes').insert([payload])
        if (error) throw error
      }

      await fetchClientes()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    const confirmado = window.confirm('¿Estás seguro de eliminar este cliente?')
    if (!confirmado) return

    setEliminandoId(id)

    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error

      await fetchClientes()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Gestión de Clientes</h2>
      <p className="text-gray-500 mb-8 text-sm">Panel de gestión de clientes</p>

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
            placeholder="Buscar por empresa o contacto..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={abrirModalNuevo}
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
        >
          ➕ Nuevo Cliente
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${clientesFiltrados.length} cliente(s) encontrados`}
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
                <th className="px-6 py-3 text-left">Empresa</th>
                <th className="px-6 py-3 text-left">CUIT</th>
                <th className="px-6 py-3 text-left">Dirección Obra</th>
                <th className="px-6 py-3 text-left">Contacto</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    No se encontraron clientes con esa búsqueda
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="bg-white hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-400 font-mono">{cliente.id}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{cliente.nombre_empresa}</td>
                    <td className="px-6 py-3 text-gray-700">{cliente.cuit_empresa}</td>
                    <td className="px-6 py-3 text-gray-700">{cliente.direccion_obra}</td>
                    <td className="px-6 py-3 text-primary">{cliente.contacto_nombre}</td>
                    <td className="px-6 py-3 text-gray-700">{cliente.contacto_telefono}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModalEdicion(cliente)}
                          title="Editar"
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(cliente.id)}
                          disabled={eliminandoId === cliente.id}
                          title="Eliminar"
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          {eliminandoId === cliente.id ? '...' : '🗑️ Eliminar'}
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
                {modoEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                <label className="block text-sm text-gray-500 mb-1">Nombre de la Empresa</label>
                <input
                  type="text"
                  name="nombre_empresa"
                  value={form.nombre_empresa}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Constructora del Norte SRL"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">CUIT</label>
                <input
                  type="text"
                  name="cuit_empresa"
                  value={form.cuit_empresa}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 30-12345678-9"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Dirección de la Obra</label>
                <input
                  type="text"
                  name="direccion_obra"
                  value={form.direccion_obra}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Av. Belgrano 1200"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Nombre de Contacto</label>
                <input
                  type="text"
                  name="contacto_nombre"
                  value={form.contacto_nombre}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: María Gómez"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Teléfono de Contacto</label>
                <input
                  type="tel"
                  name="contacto_telefono"
                  value={form.contacto_telefono}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 387 555-1234"
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
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const CATEGORIAS = [
  'Instalación',
  'Mantenimiento',
  'Reparación',
  'Inspección',
  'Materiales',
  'Mano de Obra',
  'Otro',
]

const FORM_VACIO = {
  categoria: '',
  nombre: '',
  descripcion: '',
  precio_base: '',
}

export default function CatalogoPrecios() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [eliminandoId, setEliminandoId] = useState(null)

  async function fetchItems() {
    try {
      const { data, error } = await supabase
        .from('catalogo_servicios')
        .select('id, categoria, nombre, descripcion, precio_base, created_at')
        .order('categoria', { ascending: true })

      if (error) throw error
      setItems(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const itemsFiltrados = items.filter((item) => {
    const term = searchTerm.toLowerCase()
    return (
      item.nombre?.toLowerCase().includes(term) ||
      item.categoria?.toLowerCase().includes(term) ||
      item.descripcion?.toLowerCase().includes(term)
    )
  })

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm(FORM_VACIO)
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(item) {
    setModoEdicion(true)
    setIdEditando(item.id)
    setForm({
      categoria: item.categoria || '',
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      precio_base: item.precio_base?.toString() || '',
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

    if (!form.categoria.trim() || !form.nombre.trim() || !form.precio_base.toString().trim()) {
      setErrorForm('Categoría, nombre y precio base son obligatorios.')
      return
    }

    const precio = parseFloat(form.precio_base)
    if (isNaN(precio) || precio < 0) {
      setErrorForm('El precio base debe ser un número mayor o igual a 0.')
      return
    }

    setGuardando(true)
    setErrorForm(null)

    try {
      const payload = {
        categoria: form.categoria.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precio_base: precio,
      }

      if (modoEdicion) {
        const { error } = await supabase.from('catalogo_servicios').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('catalogo_servicios').insert([payload])
        if (error) throw error
      }

      await fetchItems()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    const confirmado = window.confirm('¿Estás seguro de eliminar este ítem del catálogo?')
    if (!confirmado) return

    setEliminandoId(id)
    try {
      const { error } = await supabase.from('catalogo_servicios').delete().eq('id', id)
      if (error) throw error
      await fetchItems()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  function formatPrecio(valor) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Catálogo de Precios</h2>
      <p className="text-gray-500 mb-8 text-sm">Precios base de servicios para armar presupuestos</p>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, categoría o descripción..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={abrirModalNuevo}
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
        >
          + Nuevo Ítem
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${itemsFiltrados.length} ítem(s) encontrados`}
      </p>

      {loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p>Cargando catálogo...</p>
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
                <th className="px-6 py-3 text-left">Categoría</th>
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Descripción</th>
                <th className="px-6 py-3 text-right">Precio Base</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No se encontraron ítems con esa búsqueda
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map((item) => (
                  <tr key={item.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-400 font-mono">{item.id}</td>
                    <td className="px-6 py-3">
                      <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-6 py-3 text-gray-500 max-w-xs truncate">{item.descripcion || '—'}</td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-gray-900">
                      {formatPrecio(item.precio_base)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => abrirModalEdicion(item)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(item.id)}
                          disabled={eliminandoId === item.id}
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          {eliminandoId === item.id ? '...' : 'Eliminar'}
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
                {modoEdicion ? 'Editar Ítem' : 'Nuevo Ítem'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Categoría *</label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccioná una categoría</option>
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Instalación Split 3000 frigorías"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Descripción</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Detalle opcional del servicio..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Precio Base (ARS) *</label>
                <input
                  type="number"
                  name="precio_base"
                  value={form.precio_base}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 25000"
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

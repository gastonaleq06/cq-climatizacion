'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function getHoyAR() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

const formVacio = {
  nombre_producto: '',
  categoria: '',
  marca: '',
  capacidad: '',
  cantidad: '',
  estado: 'En stock',
}

export default function Inventario() {
  const [items, setItems] = useState([])
  const [obras, setObras] = useState([])
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

  const [modalDespacho, setModalDespacho] = useState(false)
  const [itemDespacho, setItemDespacho] = useState(null)
  const [despacho, setDespacho] = useState({ cantidad: '', obra_id: '', fecha: '' })
  const [errorDespacho, setErrorDespacho] = useState(null)
  const [despachando, setDespachando] = useState(false)

  const [modalHistorial, setModalHistorial] = useState(false)
  const [itemHistorial, setItemHistorial] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // Estado para edición inline de movimientos
  const [editandoMovId, setEditandoMovId] = useState(null)
  const [cantidadEditando, setCantidadEditando] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [errorEdicion, setErrorEdicion] = useState(null)

  async function fetchItems() {
    try {
      const [{ data: inv, error: errInv }, { data: obs, error: errObs }] = await Promise.all([
        supabase
          .from('inventario')
          .select('id, nombre_producto, categoria, marca, capacidad, cantidad, estado')
          .order('id', { ascending: true }),
        supabase.from('obras').select('id, nombre_obra').order('nombre_obra'),
      ])

      if (errInv) throw errInv
      if (errObs) throw errObs

      setItems(inv)
      setObras(obs)
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
      item.nombre_producto?.toLowerCase().includes(term) ||
      item.categoria?.toLowerCase().includes(term) ||
      item.marca?.toLowerCase().includes(term)
    )
  })

  function abrirModalNuevo() {
    setModoEdicion(false)
    setIdEditando(null)
    setForm(formVacio)
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirModalEdicion(item) {
    setModoEdicion(true)
    setIdEditando(item.id)
    setForm({
      nombre_producto: item.nombre_producto || '',
      categoria: item.categoria || '',
      marca: item.marca || '',
      capacidad: item.capacidad || '',
      cantidad: item.cantidad ?? '',
      estado: item.estado || 'En stock',
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

    if (!form.nombre_producto.trim() || !form.categoria.trim() || !form.marca.trim()) {
      setErrorForm('Nombre, categoría y marca son obligatorios.')
      return
    }

    setGuardando(true)
    setErrorForm(null)

    try {
      const payload = {
        nombre_producto: form.nombre_producto.trim(),
        categoria: form.categoria.trim(),
        marca: form.marca.trim(),
        capacidad: form.capacidad.trim(),
        cantidad: form.cantidad === '' ? null : Number(form.cantidad),
        estado: form.estado,
      }

      if (modoEdicion) {
        const { error } = await supabase.from('inventario').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventario').insert([payload])
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
    const confirmado = window.confirm('¿Estás seguro de eliminar este producto?')
    if (!confirmado) return

    setEliminandoId(id)
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', id)
      if (error) throw error
      await fetchItems()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  async function fetchHistorial(inventarioId) {
    setLoadingHistorial(true)
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('id, fecha, cantidad, obras(nombre_obra)')
      .eq('inventario_id', inventarioId)
      .order('fecha', { ascending: false })
    if (!error && data) setHistorial(data)
    setLoadingHistorial(false)
  }

  async function abrirHistorial(item) {
    setItemHistorial(item)
    setHistorial([])
    setEditandoMovId(null)
    setErrorEdicion(null)
    setModalHistorial(true)
    await fetchHistorial(item.id)
  }

  function cerrarHistorial() {
    setModalHistorial(false)
    setItemHistorial(null)
    setEditandoMovId(null)
    setErrorEdicion(null)
  }

  function abrirDespacho(item) {
    setItemDespacho(item)
    setDespacho({ cantidad: '', obra_id: obras[0]?.id?.toString() || '', fecha: getHoyAR() })
    setErrorDespacho(null)
    setModalDespacho(true)
  }

  function cerrarDespacho() {
    setModalDespacho(false)
    setItemDespacho(null)
  }

  async function handleDespachar(e) {
    e.preventDefault()

    const cantidadNum = parseInt(despacho.cantidad, 10)

    if (!despacho.fecha) {
      setErrorDespacho('Seleccioná una fecha.')
      return
    }
    if (!despacho.obra_id) {
      setErrorDespacho('Seleccioná una obra destino.')
      return
    }
    if (!cantidadNum || cantidadNum < 1) {
      setErrorDespacho('La cantidad debe ser mayor a 0.')
      return
    }
    if (itemDespacho.cantidad !== null && cantidadNum > itemDespacho.cantidad) {
      setErrorDespacho(`Stock insuficiente. Disponible: ${itemDespacho.cantidad}`)
      return
    }

    setDespachando(true)
    setErrorDespacho(null)

    try {
      const { error: errMov } = await supabase.from('movimientos_inventario').insert([{
        inventario_id: itemDespacho.id,
        obra_id: Number(despacho.obra_id),
        cantidad: cantidadNum,
        fecha: despacho.fecha,
      }])
      if (errMov) throw errMov

      const nuevoStock = (itemDespacho.cantidad ?? 0) - cantidadNum
      const { error: errUpd } = await supabase
        .from('inventario')
        .update({ cantidad: nuevoStock })
        .eq('id', itemDespacho.id)
      if (errUpd) throw errUpd

      await fetchItems()
      setModalDespacho(false)
      setItemDespacho(null)
    } catch (err) {
      setErrorDespacho(err.message)
    } finally {
      setDespachando(false)
    }
  }

  async function handleGuardarEdicionMov(mov) {
    const nuevaCantidad = parseInt(cantidadEditando, 10)
    if (!nuevaCantidad || nuevaCantidad < 1) {
      setErrorEdicion('La cantidad debe ser mayor a 0.')
      return
    }

    setGuardandoEdicion(true)
    setErrorEdicion(null)

    try {
      // Leer stock actual (fresco) antes de ajustar
      const { data: invData, error: errInv } = await supabase
        .from('inventario')
        .select('cantidad')
        .eq('id', itemHistorial.id)
        .single()
      if (errInv) throw errInv

      const stockActual = invData.cantidad ?? 0
      const delta = mov.cantidad - nuevaCantidad   // positivo = devuelve stock
      const nuevoStock = stockActual + delta

      // Actualizar el movimiento
      const { error: errMov } = await supabase
        .from('movimientos_inventario')
        .update({ cantidad: nuevaCantidad })
        .eq('id', mov.id)
      if (errMov) throw errMov

      // Actualizar el stock del producto
      const { error: errUpd } = await supabase
        .from('inventario')
        .update({ cantidad: nuevoStock })
        .eq('id', itemHistorial.id)
      if (errUpd) throw errUpd

      // Actualizar stock en el objeto local del historial para que el header se refresque
      setItemHistorial(prev => ({ ...prev, cantidad: nuevoStock }))
      setEditandoMovId(null)

      // Refrescar historial y tabla principal
      await fetchHistorial(itemHistorial.id)
      await fetchItems()
    } catch (err) {
      setErrorEdicion(err.message)
    } finally {
      setGuardandoEdicion(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Inventario</h2>
      <p className="text-gray-500 mb-8 text-sm">Gestión de productos y equipos</p>

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
            placeholder="Buscar por nombre, categoría o marca..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={abrirModalNuevo}
          className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
        >
          ➕ Nuevo Producto
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        {!loading && !error && `${itemsFiltrados.length} producto(s) encontrados`}
      </p>

      {loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p>Cargando inventario...</p>
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
                <th className="px-5 py-3 text-left w-14">ID</th>
                <th className="px-5 py-3 text-left">Producto</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-left">Marca</th>
                <th className="px-5 py-3 text-left">Capacidad</th>
                <th className="px-5 py-3 text-left">Stock</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                itemsFiltrados.map((item) => (
                  <tr key={item.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 font-mono">{item.id}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{item.nombre_producto}</td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{item.categoria}</td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{item.marca}</td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{item.capacidad}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`font-semibold ${
                        item.cantidad === 0 ? 'text-red-500' :
                        item.cantidad !== null && item.cantidad <= 2 ? 'text-yellow-600' :
                        'text-gray-700'
                      }`}>
                        {item.cantidad ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.cantidad > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.cantidad > 0 ? 'En stock' : 'Agotado'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => abrirHistorial(item)}
                          className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          📋 Historial
                        </button>
                        <button
                          onClick={() => abrirDespacho(item)}
                          disabled={!item.cantidad || item.cantidad < 1}
                          title={!item.cantidad || item.cantidad < 1 ? 'Sin stock disponible' : 'Despachar a obra'}
                          className="bg-primary hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          📦 Despachar
                        </button>
                        <button
                          onClick={() => abrirModalEdicion(item)}
                          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(item.id)}
                          disabled={eliminandoId === item.id}
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                        >
                          {eliminandoId === item.id ? '...' : '🗑️ Eliminar'}
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

      {/* Modal historial de movimientos */}
      {modalHistorial && itemHistorial && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-primary">Historial de Despachos</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {itemHistorial.nombre_producto}
                  <span className="ml-2 text-gray-500">
                    · Stock actual: <strong className="text-gray-700">{itemHistorial.cantidad ?? '—'}</strong>
                  </span>
                </p>
              </div>
              <button onClick={cerrarHistorial} className="text-gray-400 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            {loadingHistorial ? (
              <div className="text-center py-8 text-gray-400">
                <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-sm">Cargando movimientos...</p>
              </div>
            ) : historial.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                Este producto no tiene movimientos registrados.
              </p>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border border-gray-200 mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200">
                        <th className="px-4 py-2.5 text-left">Fecha</th>
                        <th className="px-4 py-2.5 text-left">Obra destino</th>
                        <th className="px-4 py-2.5 text-right">Cant. despachada</th>
                        <th className="px-4 py-2.5 text-left">Editar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historial.map(mov => (
                        <tr key={mov.id} className="bg-white">
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{mov.fecha}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                            {mov.obras?.nombre_obra ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {editandoMovId === mov.id ? (
                              <input
                                type="number"
                                value={cantidadEditando}
                                onChange={e => setCantidadEditando(e.target.value)}
                                min="1"
                                className="w-20 bg-gray-50 border border-primary rounded px-2 py-1 text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className="font-semibold text-primary">{mov.cantidad}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {editandoMovId === mov.id ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleGuardarEdicionMov(mov)}
                                  disabled={guardandoEdicion}
                                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1 rounded transition-colors"
                                >
                                  {guardandoEdicion ? '...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={() => { setEditandoMovId(null); setErrorEdicion(null) }}
                                  disabled={guardandoEdicion}
                                  className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditandoMovId(mov.id)
                                  setCantidadEditando(String(mov.cantidad))
                                  setErrorEdicion(null)
                                }}
                                className="text-sky-600 hover:text-sky-800 text-xs font-medium transition-colors"
                              >
                                ✏️ Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {errorEdicion && (
                  <p className="text-red-600 text-sm font-mono mb-3">{errorEdicion}</p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total despachado</span>
                  <span className="font-bold text-gray-900">
                    {historial.reduce((s, m) => s + m.cantidad, 0)} unidades
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={cerrarHistorial}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal despacho a obra */}
      {modalDespacho && itemDespacho && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Despachar a Obra</h2>
              <button onClick={cerrarDespacho} className="text-gray-400 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Producto</p>
              <p className="font-medium text-gray-900">{itemDespacho.nombre_producto}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Stock actual:{' '}
                <span className="font-semibold text-gray-700">
                  {itemDespacho.cantidad ?? '—'} unidades
                </span>
              </p>
            </div>

            <form onSubmit={handleDespachar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Obra destino</label>
                <select
                  value={despacho.obra_id}
                  onChange={e => setDespacho({ ...despacho, obra_id: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nombre_obra}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Cantidad a despachar</label>
                <input
                  type="number"
                  value={despacho.cantidad}
                  onChange={e => setDespacho({ ...despacho, cantidad: e.target.value })}
                  min="1"
                  max={itemDespacho.cantidad ?? undefined}
                  step="1"
                  placeholder="Ej: 2"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Fecha de despacho</label>
                <input
                  type="date"
                  value={despacho.fecha}
                  onChange={e => setDespacho({ ...despacho, fecha: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {errorDespacho && (
                <p className="text-red-600 text-sm font-mono">{errorDespacho}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cerrarDespacho}
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={despachando}
                  className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {despachando ? 'Despachando...' : 'Confirmar Despacho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nuevo/editar producto */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">
                {modoEdicion ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  name="nombre_producto"
                  value={form.nombre_producto}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Aire acondicionado split"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Categoría</label>
                <input
                  type="text"
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Climatización"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Marca</label>
                <input
                  type="text"
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Carrier"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Capacidad</label>
                <input
                  type="text"
                  name="capacidad"
                  value={form.capacidad}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 3000 frigorías"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Cantidad</label>
                <input
                  type="number"
                  name="cantidad"
                  value={form.cantidad}
                  onChange={handleChange}
                  min="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 5"
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
                  <option value="En stock">En stock</option>
                  <option value="Vendido">Vendido</option>
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

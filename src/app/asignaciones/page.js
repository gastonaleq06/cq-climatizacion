'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Asignaciones() {
  const [asignaciones, setAsignaciones] = useState([])
  const [obras, setObras] = useState([])
  const [empleados, setEmpleados] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [form, setForm] = useState({ id_obra: '', fecha_asignacion: '' })
  const [tecnicosSeleccionados, setTecnicosSeleccionados] = useState(new Set())

  const [eliminandoId, setEliminandoId] = useState(null)

  async function fetchTodo() {
    try {
      const [resAsig, resObras, resEmp] = await Promise.all([
        supabase.from('asignacion_obras').select('id, id_obra, id_empleado, fecha_asignacion').order('id', { ascending: true }),
        supabase.from('obras').select('id, nombre_obra'),
        supabase.from('empleados').select('id, nombre').order('nombre'),
      ])

      if (resAsig.error) throw resAsig.error
      if (resObras.error) throw resObras.error
      if (resEmp.error) throw resEmp.error

      setAsignaciones(resAsig.data)
      setObras(resObras.data)
      setEmpleados(resEmp.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodo()
  }, [])

  function nombreObra(id) {
    const obra = obras.find((o) => o.id === id)
    return obra ? obra.nombre_obra : `Obra #${id}`
  }

  function nombreEmpleado(id) {
    const emp = empleados.find((e) => e.id === id)
    return emp ? emp.nombre : `Técnico #${id}`
  }

  function abrirModalNuevo() {
    setForm({
      id_obra: obras[0]?.id?.toString() || '',
      fecha_asignacion: '',
    })
    setTecnicosSeleccionados(new Set())
    setErrorForm(null)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function toggleTecnico(id) {
    setTecnicosSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleTodos() {
    if (tecnicosSeleccionados.size === empleados.length) {
      setTecnicosSeleccionados(new Set())
    } else {
      setTecnicosSeleccionados(new Set(empleados.map(e => e.id)))
    }
  }

  async function handleGuardar(e) {
    e.preventDefault()

    if (!form.id_obra || !form.fecha_asignacion.trim()) {
      setErrorForm('Seleccioná una obra y una fecha.')
      return
    }
    if (tecnicosSeleccionados.size === 0) {
      setErrorForm('Seleccioná al menos un técnico.')
      return
    }

    setGuardando(true)
    setErrorForm(null)

    try {
      const payload = Array.from(tecnicosSeleccionados).map(tecnicoId => ({
        id_obra: Number(form.id_obra),
        id_empleado: Number(tecnicoId),
        fecha_asignacion: form.fecha_asignacion.trim(),
      }))

      const { error } = await supabase.from('asignacion_obras').insert(payload)
      if (error) throw error

      await fetchTodo()
      setModalAbierto(false)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    const confirmado = window.confirm('¿Estás seguro de eliminar esta asignación?')
    if (!confirmado) return

    setEliminandoId(id)

    try {
      const { error } = await supabase.from('asignacion_obras').delete().eq('id', id)
      if (error) throw error

      await fetchTodo()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoId(null)
    }
  }

  const todosSeleccionados = empleados.length > 0 && tecnicosSeleccionados.size === empleados.length

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Asignación de Personal</h2>
      <p className="text-gray-500 mb-8 text-sm">Técnicos asignados a cada obra</p>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-gray-500 text-sm">
          {!loading && !error && `${asignaciones.length} asignación(es) registradas`}
        </p>

        <button
          onClick={abrirModalNuevo}
          disabled={obras.length === 0 || empleados.length === 0}
          className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
        >
          ➕ Nueva Asignación
        </button>
      </div>

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
                <th className="px-6 py-3 text-left">Obra</th>
                <th className="px-6 py-3 text-left">Técnico</th>
                <th className="px-6 py-3 text-left">Fecha de Asignación</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {asignaciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    Todavía no hay asignaciones registradas
                  </td>
                </tr>
              ) : (
                asignaciones.map((asig) => (
                  <tr
                    key={asig.id}
                    className="bg-white hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-400 font-mono">{asig.id}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{nombreObra(asig.id_obra)}</td>
                    <td className="px-6 py-3 text-primary">{nombreEmpleado(asig.id_empleado)}</td>
                    <td className="px-6 py-3 text-gray-700">{asig.fecha_asignacion}</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleEliminar(asig.id)}
                        disabled={eliminandoId === asig.id}
                        title="Desasignar"
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                      >
                        {eliminandoId === asig.id ? '...' : '🗑️ Desasignar'}
                      </button>
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
              <h2 className="text-lg font-semibold text-primary">Nueva Asignación</h2>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Obra</label>
                <select
                  name="id_obra"
                  value={form.id_obra}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.nombre_obra}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Fecha de Asignación</label>
                <input
                  type="date"
                  name="fecha_asignacion"
                  value={form.fecha_asignacion}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-500">
                    Técnicos{' '}
                    {tecnicosSeleccionados.size > 0 && (
                      <span className="text-primary font-medium">
                        ({tecnicosSeleccionados.size} seleccionado{tecnicosSeleccionados.size !== 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={toggleTodos}
                    className="text-xs text-primary hover:text-primary-600 font-medium transition-colors"
                  >
                    {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {empleados.map((emp) => {
                      const seleccionado = tecnicosSeleccionados.has(emp.id)
                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            seleccionado ? 'bg-primary/5' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={seleccionado}
                            onChange={() => toggleTecnico(emp.id)}
                            className="w-4 h-4 rounded accent-[#FF7900] cursor-pointer"
                          />
                          <span className={`text-sm ${seleccionado ? 'text-primary font-medium' : 'text-gray-700'}`}>
                            {emp.nombre}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
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
                  {guardando
                    ? 'Guardando...'
                    : tecnicosSeleccionados.size > 1
                    ? `Asignar ${tecnicosSeleccionados.size} técnicos`
                    : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

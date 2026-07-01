'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PlantillaPDF from './PlantillaPDF'
import { descargarPDF } from './generarPDF'
import { calcPrecioVentaInsumo } from '@/lib/pricing'

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADOS = ['Pendiente', 'Aprobado', 'Enviado', 'Rechazado']

const BADGE_COLOR = {
  Pendiente: 'bg-yellow-100 text-yellow-700',
  Aprobado:  'bg-green-100 text-green-700',
  Enviado:   'bg-blue-100 text-blue-700',
  Rechazado: 'bg-red-100 text-red-700',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHoyAR() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR')
}

function formatPrecio(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0)
}

function genKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Precio unitario de un kit (suma de insumos + mano de obra base)
function calcPrecioKitUnit(item, vars) {
  if (!vars) return 0
  const insumoTotal = (item._kitInsumos || []).reduce((sum, ki) => {
    const ins = ki.catalogo_insumos
    if (!ins) return sum
    return sum + (ki.cantidad || 0) * calcPrecioVentaInsumo(ins, vars)
  }, 0)
  return insumoTotal + (item._manoObraBase || 0)
}

// Ítem vacío manual (sin catálogo)
function itemManualVacio() {
  return {
    _key: genKey(),
    _type: 'manual',
    servicio_nombre: '',
    cantidad: 1,
    precio_unitario: '',
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Presupuestos() {
  const router = useRouter()
  const [vista, setVista] = useState('lista')
  const [generando, setGenerando] = useState(false)
  const [generandoPdfId, setGenerandoPdfId] = useState(null)

  // ── Datos maestros
  const [clientes, setClientes] = useState([])
  const [obras, setObras] = useState([])
  const [kits, setKits] = useState([])
  const [varsGlobales, setVarsGlobales] = useState(null)
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Estado del formulario
  const [clienteId, setClienteId] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [obraNombre, setObraNombre] = useState('')
  const [fecha, setFecha] = useState(getHoyAR())
  const [estado, setEstado] = useState('Pendiente')
  const [items, setItems] = useState([])
  const [descripcionTareas, setDescripcionTareas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)

  // ── Panel de kit
  const [mostrarKitPanel, setMostrarKitPanel] = useState(false)
  const [kitSelId, setKitSelId] = useState('')
  const [kitCantidad, setKitCantidad] = useState(1)

  // ── Total reactivo ────────────────────────────────────────────────────────

  const total = useMemo(() =>
    items.reduce((sum, it) => {
      const qty = parseFloat(it.cantidad) || 0
      if (it._type === 'kit') return sum + qty * calcPrecioKitUnit(it, varsGlobales)
      return sum + qty * (parseFloat(it.precio_unitario) || 0)
    }, 0),
  [items, varsGlobales])

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchPresupuestos() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('id, cliente, obra, fecha, estado, total, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPresupuestos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMaestros() {
    const [
      { data: c, error: errC },
      { data: o },
      { data: v },
      { data: k },
    ] = await Promise.all([
      supabase.from('clientes').select('id, nombre_empresa, cuit_empresa, direccion_obra').order('nombre_empresa'),
      supabase.from('obras').select('id, nombre_obra').order('nombre_obra'),
      supabase.from('variables_globales').select('*').eq('id', 1).single(),
      supabase
        .from('plantillas_kits')
        .select(`
          id, nombre, capacidad, mano_obra_base,
          kit_insumos (
            id, cantidad,
            catalogo_insumos ( id, categoria, nombre, unidad, precio_base, peso_kg, moneda )
          )
        `)
        .order('nombre'),
    ])
    if (errC) { setError(`Error al cargar clientes: ${errC.message}`); return }
    if (c) setClientes(c)
    if (o) setObras(o)
    if (v) setVarsGlobales(v)
    if (k) setKits(k)
  }

  useEffect(() => {
    fetchMaestros()
    fetchPresupuestos()
  }, [])

  // ── Acciones sobre ítems ──────────────────────────────────────────────────

  function agregarKit() {
    const kit = kits.find(k => String(k.id) === kitSelId)
    if (!kit) return
    setItems(prev => [...prev, {
      _key: genKey(),
      _type: 'kit',
      _kitNombre: kit.nombre + (kit.capacidad ? ` (${kit.capacidad})` : ''),
      _kitInsumos: kit.kit_insumos || [],
      _manoObraBase: kit.mano_obra_base || 0,
      _marca: '',
      cantidad: parseFloat(kitCantidad) || 1,
    }])
    setMostrarKitPanel(false)
    setKitSelId('')
    setKitCantidad(1)
  }

  function agregarItemManual() {
    setItems(prev => [...prev, itemManualVacio()])
  }

  function eliminarItem(key) {
    setItems(prev => prev.filter(it => it._key !== key))
  }

  function actualizarItem(key, field, value) {
    setItems(prev => prev.map(it => it._key !== key ? it : { ...it, [field]: value }))
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  function buildPdfData() {
    const clienteObj = clientes.find(c => String(c.id) === clienteId) || null
    return {
      numero: 'S/N',
      fecha: fecha ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR') : getHoyAR(),
      cliente: clienteNombre || '—',
      clienteObj,
      obra: obraNombre || '',
      items: items.map(it => {
        if (it._type === 'kit') {
          const unit = calcPrecioKitUnit(it, varsGlobales)
          const qty = parseFloat(it.cantidad) || 0
          return { nombre: it._kitNombre, marca: it._marca || '', cantidad: qty, subtotal: qty * unit }
        }
        const qty = parseFloat(it.cantidad) || 0
        const price = parseFloat(it.precio_unitario) || 0
        return { nombre: it.servicio_nombre || '—', marca: '', cantidad: qty, subtotal: qty * price }
      }),
      total,
      descripcionTareas,
    }
  }

  async function generarPDF() {
    setGenerando(true)
    try {
      await descargarPDF(buildPdfData())
    } catch (err) {
      alert('Error al generar el PDF: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  async function handlePdfRow(pres) {
    setGenerandoPdfId(pres.id)
    try {
      const [{ data: its }, { data: fullPres }] = await Promise.all([
        supabase.from('presupuestos_items').select('*').eq('presupuesto_id', pres.id).order('id'),
        supabase.from('presupuestos').select('descripcion_tareas, obra').eq('id', pres.id).single(),
      ])
      const clienteObj = clientes.find(c => c.nombre_empresa === pres.cliente) || null
      const pdfData = {
        numero: pres.id,
        fecha: pres.fecha ? new Date(pres.fecha + 'T12:00:00').toLocaleDateString('es-AR') : '—',
        cliente: pres.cliente || '—',
        clienteObj,
        obra: fullPres?.obra || pres.obra || '',
        items: (its || []).map(it => ({
          nombre: it.servicio_nombre || '—',
          marca: it.descripcion || '',
          cantidad: parseFloat(it.cantidad) || 0,
          subtotal: parseFloat(it.subtotal) || 0,
        })),
        total: pres.total || 0,
        descripcionTareas: fullPres?.descripcion_tareas || '',
      }
      await descargarPDF(pdfData)
    } catch (err) {
      alert('Error al generar el PDF: ' + err.message)
    } finally {
      setGenerandoPdfId(null)
    }
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  // Nota: la tabla `presupuestos` necesita las columnas `obra` (text, nullable)
  // y `descripcion_tareas` (text, nullable) para persistir esos campos.

  async function handleGuardar() {
    setErrorForm(null)
    if (!clienteId) return setErrorForm('Seleccioná un cliente de la lista.')
    if (!fecha) return setErrorForm('La fecha es obligatoria.')
    if (items.length === 0) return setErrorForm('Agregá al menos un ítem.')

    for (const it of items) {
      const qty = parseFloat(it.cantidad)
      if (isNaN(qty) || qty <= 0) return setErrorForm('La cantidad de cada ítem debe ser mayor a 0.')
      if (it._type === 'manual') {
        if (!it.servicio_nombre.trim()) return setErrorForm('Cada ítem manual necesita una descripción.')
        if (isNaN(parseFloat(it.precio_unitario)) || parseFloat(it.precio_unitario) < 0) {
          return setErrorForm('El precio unitario de cada ítem manual debe ser válido.')
        }
      }
    }

    setGuardando(true)
    try {
      const { data: pres, error: errP } = await supabase
        .from('presupuestos')
        .insert([{
          cliente: clienteNombre.trim(),
          obra: obraNombre.trim() || null,
          fecha,
          estado,
          total,
          descripcion_tareas: descripcionTareas.trim() || null,
        }])
        .select('id')
        .single()
      if (errP) throw errP

      const payload = items.map(it => {
        if (it._type === 'kit') {
          const precio = calcPrecioKitUnit(it, varsGlobales)
          const qty = parseFloat(it.cantidad)
          return {
            presupuesto_id: pres.id,
            servicio_nombre: it._kitNombre + (it._marca ? ` — ${it._marca}` : ''),
            descripcion: it._marca ? `Marca: ${it._marca}` : null,
            cantidad: qty,
            precio_unitario: precio,
            subtotal: qty * precio,
          }
        }
        const qty = parseFloat(it.cantidad)
        const price = parseFloat(it.precio_unitario) || 0
        return {
          presupuesto_id: pres.id,
          servicio_nombre: it.servicio_nombre.trim(),
          descripcion: null,
          cantidad: qty,
          precio_unitario: price,
          subtotal: qty * price,
        }
      })

      const { error: errI } = await supabase.from('presupuestos_items').insert(payload)
      if (errI) throw errI

      resetForm()
      setVista('lista')
      await fetchPresupuestos()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function resetForm() {
    setClienteId('')
    setClienteNombre('')
    setObraNombre('')
    setFecha(getHoyAR())
    setEstado('Pendiente')
    setItems([])
    setDescripcionTareas('')
    setErrorForm(null)
    setMostrarKitPanel(false)
    setKitSelId('')
    setKitCantidad(1)
  }

  function cancelarNuevo() {
    resetForm()
    setVista('lista')
  }

  // ── INPUT STYLE ───────────────────────────────────────────────────────────

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary'
  const inputSmCls = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary'

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA: PDF
  // ══════════════════════════════════════════════════════════════════════════

  if (vista === 'pdf') {
    const pdfData = buildPdfData()
    return (
      <div>
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between gap-3 -mx-4 md:-mx-8 mb-6">
          <button
            onClick={() => setVista('nuevo')}
            className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
          >
            ← Volver al formulario
          </button>
          <button
            onClick={generarPDF}
            disabled={generando}
            className="bg-[#FF7900] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shadow-lg shadow-orange-300/40 flex items-center gap-2"
          >
            {generando ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar PDF
              </>
            )}
          </button>
        </div>
        <div className="flex justify-center pb-12 overflow-x-auto">
          <div className="shadow-2xl shadow-gray-400/20 rounded overflow-hidden">
            <PlantillaPDF presupuesto={pdfData} />
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA: LISTA
  // ══════════════════════════════════════════════════════════════════════════

  if (vista === 'lista') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary">Presupuestos</h2>
            <p className="text-gray-500 text-sm mt-0.5">Historial de presupuestos generados</p>
          </div>
          <button
            onClick={() => setVista('nuevo')}
            className="bg-primary hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
          >
            + Nuevo Presupuesto
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p>Cargando presupuestos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4">
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
                  <th className="px-6 py-3 text-left">Cliente</th>
                  <th className="px-6 py-3 text-left">Obra</th>
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {presupuestos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                      No hay presupuestos aún. Hacé clic en "+ Nuevo Presupuesto" para crear el primero.
                    </td>
                  </tr>
                ) : (
                  presupuestos.map(p => (
                    <tr key={p.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-400 font-mono">{p.id}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{p.cliente}</td>
                      <td className="px-6 py-3 text-gray-500">{p.obra || '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{formatFecha(p.fecha)}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_COLOR[p.estado] || 'bg-gray-100 text-gray-600'}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold text-gray-900">
                        {formatPrecio(p.total)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/presupuestos/${p.id}`)}
                            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                          >
                            Ver / Editar
                          </button>
                          <button
                            onClick={() => handlePdfRow(p)}
                            disabled={generandoPdfId === p.id}
                            title="Descargar PDF"
                            className="border border-gray-200 hover:border-orange-300 hover:text-orange-600 text-gray-500 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generandoPdfId === p.id ? (
                              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            PDF
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
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA: NUEVO PRESUPUESTO
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={cancelarNuevo} className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
          ← Volver
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Nuevo Presupuesto</h2>
          <p className="text-gray-500 text-sm mt-0.5">Completá los datos y los ítems del servicio</p>
        </div>
      </div>

      {/* ── Cabecera: Cliente, Obra, Fecha, Estado ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Datos del Presupuesto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Cliente *</label>
            <select
              value={clienteId}
              onChange={e => {
                const id = e.target.value
                setClienteId(id)
                const c = clientes.find(c => String(c.id) === id)
                setClienteNombre(c?.nombre_empresa || '')
              }}
              className={inputCls}
            >
              <option value="">— Seleccioná un cliente —</option>
              {clientes.map(c => (
                <option key={c.id} value={String(c.id)}>{c.nombre_empresa}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Nombre de la Obra</label>
            <input
              type="text"
              value={obraNombre}
              onChange={e => setObraNombre(e.target.value)}
              list="obras-dl"
              placeholder="Obra existente o nombre nuevo"
              className={inputCls}
              autoComplete="off"
            />
            <datalist id="obras-dl">
              {obras.map(o => <option key={o.id} value={o.nombre_obra} />)}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Estado</label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className={inputCls}
            >
              {ESTADOS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Ítems ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ítems del Presupuesto</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarKitPanel(p => !p)}
              className={`text-sm font-medium border px-3 py-1.5 rounded-lg transition-colors ${
                mostrarKitPanel
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              + Agregar Kit
            </button>
            <button
              onClick={agregarItemManual}
              className="text-primary hover:text-primary-600 text-sm font-medium border border-primary/30 hover:border-primary/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Ítem Manual
            </button>
          </div>
        </div>

        {/* Panel selector de kit */}
        {mostrarKitPanel && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
              Seleccionar Kit de Instalación
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-gray-500 mb-1">Kit</label>
                <select
                  value={kitSelId}
                  onChange={e => setKitSelId(e.target.value)}
                  className={inputSmCls}
                >
                  <option value="">— Elegir kit —</option>
                  {kits.map(k => (
                    <option key={k.id} value={String(k.id)}>
                      {k.nombre}{k.capacidad ? ` (${k.capacidad})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-36">
                <label className="block text-xs text-gray-500 mb-1">Cantidad de equipos</label>
                <input
                  type="number"
                  value={kitCantidad}
                  onChange={e => setKitCantidad(e.target.value)}
                  min="1"
                  step="1"
                  className={inputSmCls}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMostrarKitPanel(false); setKitSelId('') }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={agregarKit}
                  disabled={!kitSelId}
                  className="bg-primary hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
            {varsGlobales && (
              <p className="text-xs text-gray-400 mt-2.5">
                Precios calculados con: Dólar ${varsGlobales.dolar} · Cobre U$S${varsGlobales.precio_cobre_usd_kg}/Kg · Benef. Cobre {varsGlobales.beneficio_cobre}% · Benef. Gral {varsGlobales.beneficio_general}%
              </p>
            )}
          </div>
        )}

        {/* Lista de ítems */}
        <div className="space-y-4">
          {items.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              Agregá kits de instalación o ítems manuales para comenzar.
            </p>
          )}

          {items.map((it, idx) => {
            if (it._type === 'kit') {
              const precioUnit = calcPrecioKitUnit(it, varsGlobales)
              const subtotal = (parseFloat(it.cantidad) || 0) * precioUnit

              return (
                <div key={it._key} className="border border-primary/20 rounded-xl p-4 bg-primary/[0.03]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Ítem #{idx + 1}
                      </span>
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                        Kit
                      </span>
                    </div>
                    <button
                      onClick={() => eliminarItem(it._key)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                    >
                      ✕ Eliminar
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 mb-3">{it._kitNombre}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Marca del equipo</label>
                      <input
                        type="text"
                        value={it._marca}
                        onChange={e => actualizarItem(it._key, '_marca', e.target.value)}
                        placeholder="Ej: Daikin, Midea, BGH…"
                        className={inputSmCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad *</label>
                      <input
                        type="number"
                        value={it.cantidad}
                        onChange={e => actualizarItem(it._key, 'cantidad', e.target.value)}
                        min="1"
                        step="1"
                        className={inputSmCls}
                      />
                    </div>
                    <div className="pb-0.5 text-right">
                      <p className="text-xs text-gray-400 mb-1">Subtotal {varsGlobales ? '⚡ reactivo' : ''}</p>
                      <p className="font-mono font-semibold text-gray-900 text-sm">{formatPrecio(subtotal)}</p>
                      {varsGlobales && (
                        <p className="text-xs text-primary/50 mt-0.5">{formatPrecio(precioUnit)} / unidad</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            // Ítem manual
            const price = parseFloat(it.precio_unitario) || 0
            const subtotal = (parseFloat(it.cantidad) || 0) * price
            return (
              <div key={it._key} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Ítem #{idx + 1}
                  </span>
                  <button
                    onClick={() => eliminarItem(it._key)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    ✕ Eliminar
                  </button>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Descripción *</label>
                  <input
                    type="text"
                    value={it.servicio_nombre}
                    onChange={e => actualizarItem(it._key, 'servicio_nombre', e.target.value)}
                    placeholder="Ej: Instalación split 3000 fr/h"
                    className={inputSmCls}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cantidad *</label>
                    <input
                      type="number"
                      value={it.cantidad}
                      onChange={e => actualizarItem(it._key, 'cantidad', e.target.value)}
                      min="0"
                      step="any"
                      className={inputSmCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Precio Unitario (ARS) *</label>
                    <input
                      type="number"
                      value={it.precio_unitario}
                      onChange={e => actualizarItem(it._key, 'precio_unitario', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className={inputSmCls}
                    />
                  </div>
                  <div className="pb-0.5 text-right">
                    <p className="text-xs text-gray-400 mb-1">Subtotal</p>
                    <p className="font-mono font-semibold text-gray-900 text-sm">{formatPrecio(subtotal)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Descripción de las Tareas ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Descripción de las Tareas
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Detallá los trabajos, materiales incluidos y alcance del servicio. Se mostrará en el PDF.
        </p>
        <textarea
          value={descripcionTareas}
          onChange={e => setDescripcionTareas(e.target.value)}
          rows={7}
          placeholder={
            'Se incluye la colocación de:\n' +
            '• Cañería de cobre con aislación\n' +
            '• Soporte metálico para unidad exterior\n' +
            '• Conexiones eléctricas y puesta en marcha\n' +
            '• Prueba de funcionamiento'
          }
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
      </div>

      {/* ── Total y acciones ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Total del Presupuesto</p>
            <p className="text-4xl font-bold text-primary">{formatPrecio(total)}</p>
            <p className="text-xs text-gray-400 mt-1">+ IVA</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {errorForm && (
              <p className="text-red-600 text-sm font-mono text-right max-w-xs">{errorForm}</p>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={cancelarNuevo}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => setVista('pdf')}
                className="border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Vista PDF
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
              >
                {guardando ? 'Guardando...' : 'Guardar Presupuesto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

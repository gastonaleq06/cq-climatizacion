'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { descargarPDF } from '../generarPDF'
import { calcPrecioVentaInsumo } from '@/lib/pricing'

const ESTADOS = ['Pendiente', 'Aprobado', 'Enviado', 'Rechazado']

const BADGE_COLOR = {
  Pendiente: 'bg-yellow-100 text-yellow-700',
  Aprobado: 'bg-green-100 text-green-700',
  Enviado: 'bg-blue-100 text-blue-700',
  Rechazado: 'bg-red-100 text-red-700',
}

function itemVacio() {
  return {
    _key: Math.random().toString(36).slice(2) + Date.now().toString(36),
    _type: 'manual',
    servicio_nombre: '',
    descripcion: '',
    cantidad: 1,
    precio_unitario: '',
  }
}

function formatPrecio(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0)
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR')
}

export default function EditarPresupuesto() {
  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [presupuesto, setPresupuesto] = useState(null)
  const [clienteObj, setClienteObj] = useState(null)
  const [estado, setEstado] = useState('Pendiente')
  const [items, setItems] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [exito, setExito] = useState(false)

  // Kits y variables globales
  const [varsGlobales, setVarsGlobales] = useState(null)
  const [kits, setKits] = useState([])
  const [kitSelId, setKitSelId] = useState('')
  const [kitCantidad, setKitCantidad] = useState(1)
  const [mostrarKitPanel, setMostrarKitPanel] = useState(false)

  const total = useMemo(() =>
    items.reduce((sum, it) => {
      return sum + (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0)
    }, 0),
  [items])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: p, error: errP },
        { data: its, error: errI },
        { data: vars },
        { data: kitsData },
        { data: cliList },
      ] = await Promise.all([
        supabase.from('presupuestos').select('*').eq('id', id).single(),
        supabase.from('presupuestos_items').select('*').eq('presupuesto_id', id).order('id'),
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
        supabase.from('clientes').select('id, nombre_empresa, cuit_empresa, direccion_obra'),
      ])

      if (errP) throw errP
      if (errI) throw errI

      setPresupuesto(p)
      setEstado(p.estado)

      if (p.cliente && cliList) {
        const match = cliList.find(c => c.nombre_empresa === p.cliente) || null
        setClienteObj(match)
      }
      setItems(
        (its || []).map(it => ({
          _key: String(it.id),
          _type: 'manual',
          servicio_nombre: it.servicio_nombre,
          descripcion: it.descripcion || '',
          cantidad: it.cantidad,
          precio_unitario: String(it.precio_unitario),
        }))
      )
      if (vars) setVarsGlobales(vars)
      if (kitsData) setKits(kitsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  function agregarKit() {
    const kit = kits.find(k => String(k.id) === kitSelId)
    if (!kit) return
    const qty = parseFloat(kitCantidad) || 1

    // Calcula el precio unitario del kit sumando sus insumos + mano de obra
    const precioUnit = (kit.kit_insumos || []).reduce((sum, ki) => {
      const ins = ki.catalogo_insumos
      if (!ins || !varsGlobales) return sum
      return sum + (ki.cantidad || 0) * calcPrecioVentaInsumo(ins, varsGlobales)
    }, 0) + (kit.mano_obra_base || 0)

    setItems(prev => [...prev, {
      _key: Math.random().toString(36).slice(2) + Date.now().toString(36),
      _type: 'kit',
      _kitNombre: kit.nombre + (kit.capacidad ? ` (${kit.capacidad})` : ''),
      servicio_nombre: kit.nombre + (kit.capacidad ? ` (${kit.capacidad})` : ''),
      descripcion: null,
      cantidad: qty,
      precio_unitario: String(precioUnit.toFixed(2)),
    }])
    setMostrarKitPanel(false)
    setKitSelId('')
    setKitCantidad(1)
  }

  function agregarItem() {
    setItems(prev => [...prev, itemVacio()])
  }

  function eliminarItem(key) {
    setItems(prev => prev.filter(it => it._key !== key))
  }

  function actualizarItem(key, field, value) {
    setItems(prev => prev.map(it => it._key !== key ? it : { ...it, [field]: value }))
  }

  function buildPdfData() {
    return {
      numero: presupuesto?.id,
      fecha: presupuesto?.fecha
        ? new Date(presupuesto.fecha + 'T12:00:00').toLocaleDateString('es-AR')
        : '—',
      cliente: presupuesto?.cliente || '—',
      clienteObj: clienteObj ?? null,
      obra: presupuesto?.obra || '',
      items: items.map(it => {
        const qty = parseFloat(it.cantidad) || 0
        const price = parseFloat(it.precio_unitario) || 0
        return {
          nombre: it.servicio_nombre || '—',
          marca: it.descripcion || '',
          cantidad: qty,
          subtotal: qty * price,
        }
      }),
      total,
      descripcionTareas: presupuesto?.descripcion_tareas || '',
    }
  }

  async function handleGuardar() {
    setErrorForm(null)
    setExito(false)

    if (items.length === 0) return setErrorForm('El presupuesto debe tener al menos un ítem.')

    for (const it of items) {
      if (!it.servicio_nombre.trim()) return setErrorForm('Cada ítem debe tener un nombre de servicio.')
      const qty = parseFloat(it.cantidad)
      const price = parseFloat(it.precio_unitario)
      if (isNaN(qty) || qty <= 0) return setErrorForm('La cantidad de cada ítem debe ser mayor a 0.')
      if (isNaN(price) || price < 0) return setErrorForm('El precio unitario de cada ítem debe ser válido.')
    }

    setGuardando(true)
    try {
      const { error: errP } = await supabase
        .from('presupuestos')
        .update({ estado, total })
        .eq('id', id)
      if (errP) throw errP

      const { error: errDel } = await supabase
        .from('presupuestos_items')
        .delete()
        .eq('presupuesto_id', id)
      if (errDel) throw errDel

      const payload = items.map(it => {
        const precio = parseFloat(it.precio_unitario) || 0
        const qty = parseFloat(it.cantidad)
        return {
          presupuesto_id: Number(id),
          servicio_nombre: it.servicio_nombre.trim(),
          descripcion: it.descripcion ? it.descripcion.trim() || null : null,
          cantidad: qty,
          precio_unitario: precio,
          subtotal: qty * precio,
        }
      })

      const { error: errI } = await supabase.from('presupuestos_items').insert(payload)
      if (errI) throw errI

      setExito(true)
      await fetchData()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p>Cargando presupuesto...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-4">
        <p className="font-semibold">Error al cargar el presupuesto</p>
        <p className="text-sm mt-1 font-mono">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/presupuestos')}
          className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
        >
          ← Volver
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Presupuesto #{id}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {presupuesto?.cliente} — {formatFecha(presupuesto?.fecha)}
          </p>
        </div>
      </div>

      {/* Estado */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Estado del Presupuesto</h3>
        <div className="flex items-center gap-4">
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ESTADOS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${BADGE_COLOR[estado] || 'bg-gray-100 text-gray-600'}`}>
            {estado}
          </span>
        </div>
      </div>

      {/* Ítems */}
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
              + Desde Kit
            </button>
            <button
              onClick={agregarItem}
              className="text-primary hover:text-primary-600 text-sm font-medium border border-primary/30 hover:border-primary/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Agregar Ítem
            </button>
          </div>
        </div>

        {/* Panel selector de kit */}
        {mostrarKitPanel && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
              Cargar Kit de Instalación
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-gray-500 mb-1">Kit</label>
                <select
                  value={kitSelId}
                  onChange={e => setKitSelId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Elegir kit —</option>
                  {kits.map(k => (
                    <option key={k.id} value={String(k.id)}>
                      {k.nombre}{k.capacidad ? ` (${k.capacidad})` : ''} — {k.kit_insumos?.length ?? 0} insumos
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs text-gray-500 mb-1">Cantidad de equipos</label>
                <input
                  type="number"
                  value={kitCantidad}
                  onChange={e => setKitCantidad(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
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
                  Cargar Kit
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

        <div className="space-y-4">
          {items.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              No hay ítems. Usá "+ Agregar Ítem" o "+ Desde Kit" para comenzar.
            </p>
          )}

          {items.map((it, idx) => {
            const precio = parseFloat(it.precio_unitario) || 0
            const subtotal = (parseFloat(it.cantidad) || 0) * precio
            return (
              <div key={it._key} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      Ítem #{idx + 1}
                    </span>
                    {it._type === 'kit' && (
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                        Kit
                      </span>
                    )}
                  </div>
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
                    placeholder="Ej: Instalación Split 3000 fg"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
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

      {/* Total y guardar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Total del Presupuesto</p>
            <p className="text-4xl font-bold text-primary">{formatPrecio(total)}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {exito && <p className="text-green-600 text-sm font-medium">Cambios guardados correctamente.</p>}
            {errorForm && <p className="text-red-600 text-sm font-mono text-right max-w-xs">{errorForm}</p>}
            <div className="flex gap-3 flex-wrap justify-end">
              <button
                onClick={() => router.push('/presupuestos')}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Volver
              </button>
              <button
                onClick={async () => {
                  setGenerandoPDF(true)
                  try { await descargarPDF(buildPdfData()) }
                  catch (err) { alert('Error al generar el PDF: ' + err.message) }
                  finally { setGenerandoPDF(false) }
                }}
                disabled={generandoPDF || guardando || loading}
                className="border border-primary/40 hover:border-primary text-primary hover:bg-primary/5 font-medium px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generandoPDF ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar PDF
                  </>
                )}
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando || generandoPDF}
                className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-lg shadow-primary/30"
              >
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

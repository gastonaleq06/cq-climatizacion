'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calcPrecioVentaInsumo } from '@/lib/pricing'

const CATEGORIAS_INSUMOS = [
  'Cañería de cobre',
  'Ménsulas',
  'Cables',
  'Aislación',
  'Mano de Obra',
  'Otro',
]

const esCobre = (cat) => cat === 'Cañería de cobre'

const FORM_INSUMO_VACIO = {
  categoria: '',
  nombre: '',
  unidad: '',
  moneda: 'ARS',
  precio_base: '',
  peso_kg: '',
}

const FORM_KIT_VACIO = {
  nombre: '',
  capacidad: '',
  mano_obra_base: '',
}

const VARS_VACIO = {
  dolar: '',
  precio_cobre_usd_kg: '',
  beneficio_cobre: '',
  beneficio_general: '',
}

function formatARS(val) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0)
}

export default function CatalogoPrecios() {
  const [tabActiva, setTabActiva] = useState('variables')

  // ── Variables globales ──────────────────────────────────────────
  const [vars, setVars] = useState(VARS_VACIO)
  const [varsLoading, setVarsLoading] = useState(true)
  const [varsError, setVarsError] = useState(null)
  const [guardandoVars, setGuardandoVars] = useState(false)
  const [varsSaved, setVarsSaved] = useState(false)

  // ── Insumos ─────────────────────────────────────────────────────
  const [insumos, setInsumos] = useState([])
  const [insumosLoading, setInsumosLoading] = useState(true)
  const [insumosError, setInsumosError] = useState(null)

  // ── Modal insumo ─────────────────────────────────────────────────
  const [modalInsumoAbierto, setModalInsumoAbierto] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idEditando, setIdEditando] = useState(null)
  const [formInsumo, setFormInsumo] = useState(FORM_INSUMO_VACIO)
  const [guardandoInsumo, setGuardandoInsumo] = useState(false)
  const [errorFormInsumo, setErrorFormInsumo] = useState(null)
  const [eliminandoInsumoId, setEliminandoInsumoId] = useState(null)

  // ── Kits ─────────────────────────────────────────────────────────
  const [kits, setKits] = useState([])
  const [kitsLoading, setKitsLoading] = useState(true)
  const [kitsError, setKitsError] = useState(null)
  const [kitsExpandidos, setKitsExpandidos] = useState(new Set())
  const [eliminandoKitId, setEliminandoKitId] = useState(null)

  // ── Modal kit ────────────────────────────────────────────────────
  const [modalKitAbierto, setModalKitAbierto] = useState(false)
  const [formKit, setFormKit] = useState(FORM_KIT_VACIO)
  const [kitSeleccionados, setKitSeleccionados] = useState({}) // { insumoId: cantidadStr }
  const [guardandoKit, setGuardandoKit] = useState(false)
  const [errorFormKit, setErrorFormKit] = useState(null)

  // ── Fetchers ─────────────────────────────────────────────────────
  async function fetchVars() {
    setVarsLoading(true)
    setVarsError(null)
    try {
      const { data, error } = await supabase
        .from('variables_globales')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setVars({
          dolar: data.dolar?.toString() ?? '',
          precio_cobre_usd_kg: data.precio_cobre_usd_kg?.toString() ?? '',
          beneficio_cobre: data.beneficio_cobre?.toString() ?? '',
          beneficio_general: data.beneficio_general?.toString() ?? '',
        })
      }
    } catch (err) {
      setVarsError('Error al cargar variables: ' + err.message)
    } finally {
      setVarsLoading(false)
    }
  }

  async function fetchInsumos() {
    setInsumosLoading(true)
    setInsumosError(null)
    try {
      const { data, error } = await supabase
        .from('catalogo_insumos')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true })
      if (error) throw error
      setInsumos(data)
    } catch (err) {
      setInsumosError(err.message)
    } finally {
      setInsumosLoading(false)
    }
  }

  async function fetchKits() {
    setKitsLoading(true)
    setKitsError(null)
    try {
      const { data, error } = await supabase
        .from('plantillas_kits')
        .select(`
          id, nombre, capacidad, mano_obra_base,
          kit_insumos (
            id, cantidad, insumo_id,
            catalogo_insumos ( id, categoria, nombre, unidad, precio_base, peso_kg, moneda )
          )
        `)
        .order('nombre', { ascending: true })
      if (error) throw error
      setKits(data)
    } catch (err) {
      setKitsError(err.message)
    } finally {
      setKitsLoading(false)
    }
  }

  useEffect(() => {
    fetchVars()
    fetchInsumos()
    fetchKits()
  }, [])

  // ── Cálculo de precios ───────────────────────────────────────────
  const varsParseados = {
    dolar: parseFloat(vars.dolar) || 0,
    precio_cobre_usd_kg: parseFloat(vars.precio_cobre_usd_kg) || 0,
    beneficio_cobre: parseFloat(vars.beneficio_cobre) || 0,
    beneficio_general: parseFloat(vars.beneficio_general) || 0,
  }

  function calcCostoMaterialesKit(kit) {
    return (kit.kit_insumos || []).reduce((sum, item) => {
      return sum + calcPrecioVentaInsumo(item.catalogo_insumos, varsParseados) * (item.cantidad || 0)
    }, 0)
  }

  // Costo en vivo mientras se arma el kit en el modal
  const costoKitVivo = Object.entries(kitSeleccionados).reduce((sum, [insumoId, qty]) => {
    const insumo = insumos.find((i) => i.id.toString() === insumoId)
    if (!insumo) return sum
    return sum + calcPrecioVentaInsumo(insumo, varsParseados) * (parseFloat(qty) || 0)
  }, 0)

  // ── Handlers vars ────────────────────────────────────────────────
  async function handleGuardarVars() {
    setGuardandoVars(true)
    setVarsError(null)
    try {
      const { error } = await supabase
        .from('variables_globales')
        .upsert({
          id: 1,
          dolar: parseFloat(vars.dolar) || 0,
          precio_cobre_usd_kg: parseFloat(vars.precio_cobre_usd_kg) || 0,
          beneficio_cobre: parseFloat(vars.beneficio_cobre) || 0,
          beneficio_general: parseFloat(vars.beneficio_general) || 0,
        })
        .eq('id', 1)
      if (error) throw error
      setVarsSaved(true)
      setTimeout(() => setVarsSaved(false), 2500)
    } catch (err) {
      setVarsError('No se pudieron guardar las variables. Intentá de nuevo.')
    } finally {
      setGuardandoVars(false)
    }
  }

  // ── Helpers insumos ──────────────────────────────────────────────
  const insumosAgrupados = insumos.reduce((acc, insumo) => {
    const cat = insumo.categoria || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(insumo)
    return acc
  }, {})

  function abrirModalNuevoInsumo() {
    setModoEdicion(false)
    setIdEditando(null)
    setFormInsumo(FORM_INSUMO_VACIO)
    setErrorFormInsumo(null)
    setModalInsumoAbierto(true)
  }

  function abrirModalEdicionInsumo(insumo) {
    setModoEdicion(true)
    setIdEditando(insumo.id)
    setFormInsumo({
      categoria: insumo.categoria || '',
      nombre: insumo.nombre || '',
      unidad: insumo.unidad || '',
      moneda: insumo.moneda || 'ARS',
      precio_base: insumo.precio_base?.toString() ?? '',
      peso_kg: insumo.peso_kg?.toString() ?? '',
    })
    setErrorFormInsumo(null)
    setModalInsumoAbierto(true)
  }

  async function handleGuardarInsumo(e) {
    e.preventDefault()
    if (!formInsumo.categoria || !formInsumo.nombre.trim() || !formInsumo.unidad.trim()) {
      setErrorFormInsumo('Categoría, nombre y unidad son obligatorios.')
      return
    }
    if (esCobre(formInsumo.categoria)) {
      if (!formInsumo.peso_kg || isNaN(parseFloat(formInsumo.peso_kg))) {
        setErrorFormInsumo('El peso (Kg/m) es obligatorio para Cañería de cobre.')
        return
      }
    } else if (!formInsumo.precio_base || isNaN(parseFloat(formInsumo.precio_base))) {
      setErrorFormInsumo('El precio base es obligatorio.')
      return
    }
    setGuardandoInsumo(true)
    setErrorFormInsumo(null)
    try {
      const payload = {
        categoria: formInsumo.categoria,
        nombre: formInsumo.nombre.trim(),
        unidad: formInsumo.unidad.trim(),
        moneda: esCobre(formInsumo.categoria) ? null : formInsumo.moneda,
        precio_base: esCobre(formInsumo.categoria) ? null : parseFloat(formInsumo.precio_base),
        peso_kg: esCobre(formInsumo.categoria) ? parseFloat(formInsumo.peso_kg) : null,
      }
      if (modoEdicion) {
        const { error } = await supabase.from('catalogo_insumos').update(payload).eq('id', idEditando)
        if (error) throw error
      } else {
        const { error } = await supabase.from('catalogo_insumos').insert([payload])
        if (error) throw error
      }
      await fetchInsumos()
      setModalInsumoAbierto(false)
    } catch (err) {
      setErrorFormInsumo(err.message)
    } finally {
      setGuardandoInsumo(false)
    }
  }

  async function handleEliminarInsumo(id) {
    if (!window.confirm('¿Eliminar este insumo?')) return
    setEliminandoInsumoId(id)
    try {
      const { error } = await supabase.from('catalogo_insumos').delete().eq('id', id)
      if (error) throw error
      await fetchInsumos()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoInsumoId(null)
    }
  }

  // ── Handlers kits ────────────────────────────────────────────────
  function toggleKitExpand(id) {
    setKitsExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleInsumo(insumoId) {
    const id = insumoId.toString()
    setKitSeleccionados((prev) => {
      if (id in prev) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: '1' }
    })
  }

  function setCantidadInsumo(insumoId, value) {
    setKitSeleccionados((prev) => ({ ...prev, [insumoId.toString()]: value }))
  }

  function abrirModalNuevoKit() {
    setFormKit(FORM_KIT_VACIO)
    setKitSeleccionados({})
    setErrorFormKit(null)
    setModalKitAbierto(true)
  }

  async function handleGuardarKit(e) {
    e.preventDefault()
    if (!formKit.nombre.trim()) {
      setErrorFormKit('El nombre del kit es obligatorio.')
      return
    }
    const seleccionados = Object.entries(kitSeleccionados).filter(
      ([, qty]) => parseFloat(qty) > 0
    )
    if (seleccionados.length === 0) {
      setErrorFormKit('Seleccioná al menos un insumo con cantidad mayor a 0.')
      return
    }
    setGuardandoKit(true)
    setErrorFormKit(null)
    try {
      // 1. Crear el kit y obtener su id
      const { data: kitData, error: kitError } = await supabase
        .from('plantillas_kits')
        .insert([{
          nombre: formKit.nombre.trim(),
          capacidad: formKit.capacidad.trim() || null,
          mano_obra_base: parseFloat(formKit.mano_obra_base) || 0,
        }])
        .select('id')
        .single()
      if (kitError) throw kitError

      // 2. Insertar los insumos del kit
      const itemsPayload = seleccionados.map(([insumoId, qty]) => ({
        kit_id: kitData.id,
        insumo_id: parseInt(insumoId),
        cantidad: parseFloat(qty),
      }))
      const { error: itemsError } = await supabase.from('kit_insumos').insert(itemsPayload)
      if (itemsError) throw itemsError

      await fetchKits()
      setModalKitAbierto(false)
    } catch (err) {
      setErrorFormKit(err.message)
    } finally {
      setGuardandoKit(false)
    }
  }

  async function handleEliminarKit(id) {
    if (!window.confirm('¿Eliminar este kit y todos sus insumos?')) return
    setEliminandoKitId(id)
    try {
      await supabase.from('kit_insumos').delete().eq('kit_id', id)
      const { error } = await supabase.from('plantillas_kits').delete().eq('id', id)
      if (error) throw error
      await fetchKits()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    } finally {
      setEliminandoKitId(null)
    }
  }

  // ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 className="text-2xl font-bold text-primary mb-1">Catálogo de Precios</h2>
      <p className="text-gray-500 mb-6 text-sm">Motor de costeo paramétrico con variables globales</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {[
          { key: 'variables', label: 'Variables e Insumos' },
          { key: 'kits', label: 'Inventario Split / Kits' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTabActiva(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              tabActiva === tab.key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: Variables e Insumos ══════════════════════════════ */}
      {tabActiva === 'variables' && (
        <div className="space-y-10">

          {/* Variables Globales */}
          <section>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Variables Globales</h3>
                <p className="text-xs text-gray-400 mt-0.5">Parámetros base para el cálculo automático de precios</p>
              </div>
              <button
                onClick={handleGuardarVars}
                disabled={guardandoVars || varsLoading}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  varsSaved
                    ? 'bg-green-600 text-white shadow-green-600/30'
                    : 'bg-primary hover:bg-primary-600 text-white shadow-primary/30'
                }`}
              >
                {guardandoVars ? 'Guardando...' : varsSaved ? '✓ Guardado' : 'Actualizar Variables'}
              </button>
            </div>

            {varsError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
                {varsError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { key: 'dolar', label: 'Precio Dólar', suffix: 'ARS/USD' },
                { key: 'precio_cobre_usd_kg', label: 'Precio Cobre', suffix: 'U$S/Kg' },
                { key: 'beneficio_cobre', label: 'Beneficio Cobre', suffix: '%' },
                { key: 'beneficio_general', label: 'Beneficio General', suffix: '%' },
              ].map(({ key, label, suffix }) => (
                <div key={key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">{label}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vars[key]}
                      onChange={(e) => setVars((prev) => ({ ...prev, [key]: e.target.value }))}
                      disabled={varsLoading}
                      className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-mono font-semibold text-base focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      placeholder="0"
                      step="any"
                      min="0"
                    />
                    <span className="text-gray-400 text-xs shrink-0 font-medium">{suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tabla Insumos */}
          <section>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Insumos</h3>
                <p className="text-xs text-gray-400 mt-0.5">Precios calculados en tiempo real con las variables activas</p>
              </div>
              <button
                onClick={abrirModalNuevoInsumo}
                className="bg-primary hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-primary/30"
              >
                + Nuevo Insumo
              </button>
            </div>

            {insumosError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
                {insumosError}
              </div>
            )}

            {insumosLoading ? (
              <div className="text-center py-14 text-gray-400">
                <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">Cargando insumos...</p>
              </div>
            ) : insumos.length === 0 ? (
              <div className="text-center py-14 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <p className="text-sm">No hay insumos cargados. Agregá el primero con el botón de arriba.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200">
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Unidad</th>
                      <th className="px-4 py-3 text-left">Base / Peso</th>
                      <th className="px-4 py-3 text-right text-primary font-semibold">Precio de Venta</th>
                      <th className="px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(insumosAgrupados).map(([cat, items]) => (
                      <Fragment key={cat}>
                        <tr className="bg-primary/5">
                          <td colSpan={5} className="px-4 py-2 text-xs font-bold text-primary uppercase tracking-widest">
                            {cat}
                          </td>
                        </tr>
                        {items.map((insumo) => (
                          <tr key={insumo.id} className="bg-white hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{insumo.nombre}</td>
                            <td className="px-4 py-3 text-gray-500">{insumo.unidad}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {esCobre(insumo.categoria)
                                ? `${insumo.peso_kg ?? '—'} Kg/m`
                                : `${insumo.moneda === 'USD' ? 'U$S ' : '$ '}${insumo.precio_base ?? '—'}`}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                              {formatARS(calcPrecioVentaInsumo(insumo, varsParseados))}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => abrirModalEdicionInsumo(insumo)}
                                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleEliminarInsumo(insumo.id)}
                                  disabled={eliminandoInsumoId === insumo.id}
                                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                                >
                                  {eliminandoInsumoId === insumo.id ? '...' : 'Eliminar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══ TAB 2: Inventario Split / Kits ══════════════════════════ */}
      {tabActiva === 'kits' && (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Gestión de Kits de Instalación</h3>
              <p className="text-xs text-gray-400 mt-0.5">Recetas de insumos agrupadas por tipo de equipo</p>
            </div>
            <button
              onClick={abrirModalNuevoKit}
              className="bg-primary hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-primary/30"
            >
              + Nuevo Kit
            </button>
          </div>

          {kitsError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
              {kitsError}
            </div>
          )}

          {kitsLoading ? (
            <div className="text-center py-14 text-gray-400">
              <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Cargando kits...</p>
            </div>
          ) : kits.length === 0 ? (
            <div className="text-center py-20 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">No hay kits creados todavía</p>
              <p className="text-xs text-gray-400 mt-1">Creá el primero con el botón de arriba</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {kits.map((kit) => {
                const costoMateriales = calcCostoMaterialesKit(kit)
                const costoMO = kit.mano_obra_base || 0
                const total = costoMateriales + costoMO
                const expandido = kitsExpandidos.has(kit.id)
                const cantItems = kit.kit_insumos?.length ?? 0

                return (
                  <div key={kit.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    {/* Cabecera de la card */}
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-base leading-tight">{kit.nombre}</h4>
                          {kit.capacidad && (
                            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {kit.capacidad}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEliminarKit(kit.id)}
                          disabled={eliminandoKitId === kit.id}
                          className="shrink-0 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                        >
                          {eliminandoKitId === kit.id ? '...' : 'Eliminar'}
                        </button>
                      </div>

                      {/* Desglose de costos */}
                      <div className="space-y-1.5 mt-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Materiales</span>
                          <span className="font-mono text-gray-700">{formatARS(costoMateriales)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Mano de Obra</span>
                          <span className="font-mono text-gray-700">{formatARS(costoMO)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="text-sm font-semibold text-gray-900">Total Kit</span>
                          <span className="font-mono font-bold text-gray-900">{formatARS(total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle de detalle */}
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => toggleKitExpand(kit.id)}
                        className="w-full px-5 py-2.5 text-xs font-medium text-gray-400 hover:text-primary hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span>{cantItems} insumo{cantItems !== 1 ? 's' : ''}</span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${expandido ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {expandido && (
                        <div className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-2">
                          {(kit.kit_insumos || []).length === 0 ? (
                            <p className="text-xs text-gray-400">Sin insumos registrados.</p>
                          ) : (
                            (kit.kit_insumos || []).map((item) => {
                              const insumo = item.catalogo_insumos
                              const subtotal = calcPrecioVentaInsumo(insumo, varsParseados) * (item.cantidad || 0)
                              return (
                                <div key={item.id} className="flex items-baseline justify-between gap-2 text-xs">
                                  <span className="text-gray-600 truncate">
                                    {insumo?.nombre ?? '—'}
                                    <span className="text-gray-400 ml-1">× {item.cantidad} {insumo?.unidad}</span>
                                  </span>
                                  <span className="font-mono text-gray-700 shrink-0">{formatARS(subtotal)}</span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ Modal Insumo ════════════════════════════════════════════ */}
      {modalInsumoAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-primary">
                {modoEdicion ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h2>
              <button
                onClick={() => setModalInsumoAbierto(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarInsumo} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Categoría *</label>
                <select
                  name="categoria"
                  value={formInsumo.categoria}
                  onChange={(e) => setFormInsumo((p) => ({ ...p, categoria: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccioná una categoría</option>
                  {CATEGORIAS_INSUMOS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formInsumo.nombre}
                  onChange={(e) => setFormInsumo((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Caño 1/2 pulgada"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Unidad *</label>
                <input
                  type="text"
                  value={formInsumo.unidad}
                  onChange={(e) => setFormInsumo((p) => ({ ...p, unidad: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: metro, unidad, kg"
                />
              </div>
              {formInsumo.categoria && esCobre(formInsumo.categoria) && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Peso (Kg/m) *</label>
                  <input
                    type="number"
                    value={formInsumo.peso_kg}
                    onChange={(e) => setFormInsumo((p) => ({ ...p, peso_kg: e.target.value }))}
                    step="any" min="0"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: 0.085"
                  />
                  <p className="text-xs text-gray-400 mt-1">Precio = Peso × Precio Cobre + Beneficio Cobre</p>
                </div>
              )}
              {formInsumo.categoria && !esCobre(formInsumo.categoria) && (
                <>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Moneda *</label>
                    <select
                      value={formInsumo.moneda}
                      onChange={(e) => setFormInsumo((p) => ({ ...p, moneda: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="ARS">ARS — Pesos argentinos</option>
                      <option value="USD">USD — Dólares</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Precio Base Unitario *</label>
                    <input
                      type="number"
                      value={formInsumo.precio_base}
                      onChange={(e) => setFormInsumo((p) => ({ ...p, precio_base: e.target.value }))}
                      step="any" min="0"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ej: 1500"
                    />
                    {formInsumo.moneda === 'USD' && (
                      <p className="text-xs text-gray-400 mt-1">Se convertirá usando el Precio Dólar configurado.</p>
                    )}
                  </div>
                </>
              )}
              {errorFormInsumo && <p className="text-red-600 text-sm">{errorFormInsumo}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalInsumoAbierto(false)}
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoInsumo}
                  className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
                  {guardandoInsumo ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Kit ═══════════════════════════════════════════════ */}
      {modalKitAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-primary">Nuevo Kit de Instalación</h2>
              <button
                onClick={() => setModalKitAbierto(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="form-kit" onSubmit={handleGuardarKit}>

                {/* Datos base */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="sm:col-span-1">
                    <label className="block text-sm text-gray-500 mb-1">Nombre del Kit *</label>
                    <input
                      type="text"
                      value={formKit.nombre}
                      onChange={(e) => setFormKit((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Ej: Split 3000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Capacidad</label>
                    <input
                      type="text"
                      value={formKit.capacidad}
                      onChange={(e) => setFormKit((p) => ({ ...p, capacidad: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Ej: 3000 frigorías"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Mano de Obra Base ($)</label>
                    <input
                      type="number"
                      value={formKit.mano_obra_base}
                      onChange={(e) => setFormKit((p) => ({ ...p, mano_obra_base: e.target.value }))}
                      step="any" min="0"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Ej: 50000"
                    />
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-gray-100 mb-5" />

                {/* Checklist de insumos */}
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Seleccioná los insumos del kit</h4>

                {insumosLoading ? (
                  <p className="text-sm text-gray-400">Cargando insumos...</p>
                ) : insumos.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay insumos disponibles. Cargalos en la pestaña "Variables e Insumos".</p>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(insumosAgrupados).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{cat}</p>
                        <div className="space-y-1.5">
                          {items.map((insumo) => {
                            const id = insumo.id.toString()
                            const checked = id in kitSeleccionados
                            const precioUnit = calcPrecioVentaInsumo(insumo, varsParseados)
                            const qty = kitSeleccionados[id] ?? ''
                            const subtotal = parseFloat(qty) > 0 ? precioUnit * parseFloat(qty) : 0

                            return (
                              <div
                                key={insumo.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                                  checked
                                    ? 'bg-primary/5 border border-primary/20'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                                onClick={() => toggleInsumo(insumo.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {}}
                                  className="w-4 h-4 accent-primary shrink-0 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 leading-tight">{insumo.nombre}</p>
                                  <p className="text-xs text-gray-400">{insumo.unidad} · {formatARS(precioUnit)} c/u</p>
                                </div>

                                {checked && (
                                  <div
                                    className="flex items-center gap-2 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="number"
                                      value={qty}
                                      onChange={(e) => setCantidadInsumo(insumo.id, e.target.value)}
                                      min="0"
                                      step="any"
                                      className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                                      placeholder="Cant."
                                    />
                                    <span className="text-xs text-gray-400 w-10 truncate">{insumo.unidad}</span>
                                    <span className="text-xs font-mono font-semibold text-gray-700 w-28 text-right">
                                      {parseFloat(qty) > 0 ? formatARS(subtotal) : '—'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Footer con costo en vivo */}
            <div className="border-t border-gray-200 px-6 py-4 shrink-0 bg-gray-50/60 rounded-b-xl">
              {errorFormKit && (
                <p className="text-red-600 text-sm mb-3">{errorFormKit}</p>
              )}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Costo total de materiales</p>
                  <p className="text-xl font-bold font-mono text-gray-900">{formatARS(costoKitVivo)}</p>
                  {Object.keys(kitSeleccionados).length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Object.keys(kitSeleccionados).length} insumo{Object.keys(kitSeleccionados).length !== 1 ? 's' : ''} seleccionado{Object.keys(kitSeleccionados).length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalKitAbierto(false)}
                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="form-kit"
                    disabled={guardandoKit}
                    className="bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm shadow-sm shadow-primary/30"
                  >
                    {guardandoKit ? 'Guardando...' : 'Crear Kit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

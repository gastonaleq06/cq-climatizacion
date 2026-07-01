'use client'

import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function fmt(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0)
}

const CARTA = `De acuerdo con lo solicitado, se envía la cotización correspondiente.
Nuestros campos de acción:
✓ Ingeniería en Climatización: Consultoría y desarrollo en proyectos (edificios, residencias, shoppings, colegios, clínicas, etc.).
✓ Especialización en Sistemas HVAC (sistema VRF, sistemas 1 a 1, entre otros).
✓ Especialización Sistemas de Agua (Chiller).
✓ Provisión, fabricación y montaje de conductos de aire para climatización, ventilación y jacketing.
✓ Mantenimiento de equipos.
✓ Presurización de escaleras.
✓ Tratamiento de aire para salas blancas (laboratorios, clínicas, entre otros).
✓ Preinstalaciones para edificios, residencias e instituciones.
CQ INGENIERIA EN CLIMATIZACION una Organización orientada a la satisfacción de sus Clientes ofreciendo soluciones eficientes, que trabaja con elevados estándares de calidad para la construcción y mantenimiento de relaciones de largo plazo tomando decisiones basadas en la Sustentabilidad y la Mejora Continua.
+ 20 años aportando soluciones en ingeniería en climatización`

const LABEL = {
  fontSize: '10px',
  fontWeight: '700',
  color: '#FF7900',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '8px',
}

const PAGE = {
  width: '794px',
  height: '1123px',
  backgroundColor: '#ffffff',
  padding: '48px',
  boxSizing: 'border-box',
  position: 'relative',
  overflow: 'hidden',
}

const DIVIDER = {
  height: '4px',
  background: 'linear-gradient(to right, #FF7900, #ffcc99)',
  borderRadius: '2px',
}

const ACCENT_BOTTOM = {
  position: 'absolute',
  bottom: '0',
  left: '0',
  right: '0',
  height: '6px',
  background: 'linear-gradient(to right, #FF7900, #ffcc99)',
}

// ── Paginación dinámica de la Propuesta Económica ──────────────────────────
// PAGE es de 794×1123 con padding 48 en cada borde: el contenido útil es
// 698×1027. Los bloques (tabla+total, descripción, exclusiones+condiciones)
// se apilan en una columna flex con separación GAP; si no entran todos en
// una hoja, se reparten en tantas hojas como sea necesario sin cortar un
// bloque a la mitad, salvo que el bloque por sí solo ya exceda una hoja
// completa (caso típico: descripcionTareas muy larga), en cuyo caso ese
// bloque específico se divide por texto como último recurso.

const PAGE_CONTENT_W = 794 - 48 * 2
const PAGE_CONTENT_H = 1123 - 48 * 2
const GAP = 24

const TEXTBOX_STYLE = {
  fontSize: '12px',
  color: '#333',
  lineHeight: '1.9',
  whiteSpace: 'pre-line',
  padding: '18px 20px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
  border: '1px solid #ebebeb',
}

// Crea un medidor DOM invisible para conocer, sin usar React, el alto real
// que ocuparía el bloque "Descripción de las Tareas" con un texto dado.
// Reutiliza los mismos objetos de estilo (LABEL, TEXTBOX_STYLE) que la JSX
// real, así el alto medido coincide con el alto que se vería en el PDF.
function crearMedidorTexto(anchoPx) {
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.top = '0'
  wrapper.style.left = '-9999px'
  wrapper.style.width = `${anchoPx}px`
  wrapper.style.visibility = 'hidden'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.boxSizing = 'border-box'

  const label = document.createElement('div')
  Object.assign(label.style, LABEL)
  label.textContent = 'Descripción de las Tareas'

  const box = document.createElement('div')
  Object.assign(box.style, TEXTBOX_STYLE)
  box.style.boxSizing = 'border-box'

  wrapper.appendChild(label)
  wrapper.appendChild(box)
  document.body.appendChild(wrapper)

  return {
    medir(texto) {
      box.textContent = texto
      return wrapper.getBoundingClientRect().height
    },
    destruir() {
      wrapper.remove()
    },
  }
}

// Encuentra, por búsqueda binaria sobre la cantidad de caracteres, el mayor
// prefijo de `texto` que entra en `alturaMaxima` sin partir una palabra.
function partirTexto(texto, alturaMaxima, medidor) {
  if (medidor.medir(texto) <= alturaMaxima) return { primera: texto, resto: '' }

  let lo = 0
  let hi = texto.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const h = medidor.medir(texto.slice(0, mid))
    if (h <= alturaMaxima) lo = mid
    else hi = mid - 1
  }
  let corte = lo || 1

  const hastaCorte = texto.slice(0, corte)
  const ultimoSalto = Math.max(hastaCorte.lastIndexOf('\n'), hastaCorte.lastIndexOf(' '))
  if (ultimoSalto > 0) corte = ultimoSalto + 1

  return {
    primera: texto.slice(0, corte).trimEnd(),
    resto: texto.slice(corte).trimStart(),
  }
}

// Reparte los bloques en páginas: cada página acumula bloques mientras
// entren en `disponible`; si un bloque no cabe en el espacio restante de
// una página con contenido, pasa entero a una página nueva. Si ni siquiera
// entra en una página vacía, se divide (solo si es divisible) o se coloca
// igual para no perder contenido.
function empaquetarBloques(bloquesIniciales, disponible, gap, medidor) {
  const cola = [...bloquesIniciales]
  const paginas = []
  let pagina = []
  let usado = 0
  let parte = 0

  while (cola.length) {
    const b = cola[0]
    const necesita = b.height + gap

    if (usado + necesita <= disponible) {
      pagina.push(b)
      usado += necesita
      cola.shift()
      continue
    }

    if (pagina.length > 0) {
      paginas.push(pagina)
      pagina = []
      usado = 0
      continue
    }

    // Página vacía y el bloque no entra solo.
    if (b.splittable) {
      const alturaMax = disponible - gap
      const { primera, resto } = partirTexto(b.texto, alturaMax, medidor)
      pagina.push({ ...b, key: `${b.key}-${parte++}`, texto: primera, height: medidor.medir(primera) })
      paginas.push(pagina)
      pagina = []
      usado = 0
      if (resto) cola[0] = { ...b, texto: resto, height: medidor.medir(resto) }
      else cola.shift()
      continue
    }

    console.warn(`[PlantillaPDF] El bloque "${b.type}" excede el alto de una página y no es divisible; puede recortarse visualmente.`)
    pagina.push(b)
    paginas.push(pagina)
    pagina = []
    usado = 0
    cola.shift()
  }

  if (pagina.length) paginas.push(pagina)
  return paginas
}

// ── Bloques de contenido de la Propuesta Económica ─────────────────────────

function MiniHeaderEconomico({ numStr, fecha }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontWeight: '800', fontSize: '17px', color: '#1a1a1a' }}>Propuesta Económica</div>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          Cotización N° #{numStr} — {fecha}
        </div>
      </div>
      <div style={DIVIDER} />
    </div>
  )
}

function ItemsBlock({ items, total }) {
  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '22px' }}>
        <thead>
          <tr style={{ backgroundColor: '#FF7900' }}>
            {[
              { label: 'Ítem',    w: '48px',  align: 'center' },
              { label: 'Cant.',   w: '56px',  align: 'center' },
              { label: 'Preinstalación / Servicio', w: undefined, align: 'left' },
              { label: 'Subtotal', w: '130px', align: 'right' },
            ].map(({ label, w, align }) => (
              <th key={label} style={{
                padding: '10px 14px',
                textAlign: align,
                color: '#fff',
                fontWeight: '700',
                fontSize: '11px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                width: w,
              }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #ebebeb' }}>
              <td style={{ padding: '11px 14px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>
                {i + 1}
              </td>
              <td style={{ padding: '11px 14px', textAlign: 'center', color: '#555', fontSize: '12px' }}>
                {item.cantidad}
              </td>
              <td style={{ padding: '11px 14px', lineHeight: '1.5' }}>
                <div style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '13px' }}>{item.nombre}</div>
                {item.marca && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Marca: {item.marca}</div>
                )}
              </td>
              <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', fontSize: '12px', color: '#1a1a1a' }}>
                {fmt(item.subtotal)}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#bbb', fontSize: '12px' }}>
                Sin ítems cargados
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '290px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px',
            backgroundColor: '#FF7900', borderRadius: '8px', color: '#fff',
          }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.03em' }}>PRECIO TOTAL</div>
              <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>más IVA</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '16px' }}>
              {fmt(total)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DescripcionBlock({ texto }) {
  return (
    <div>
      <div style={LABEL}>Descripción de las Tareas</div>
      <div style={TEXTBOX_STYLE}>{texto}</div>
    </div>
  )
}

function ExclusionesCondicionesBlock() {
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={LABEL}>Exclusiones</div>
        <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.9', padding: '14px 18px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ebebeb' }}>
          <div style={{ marginBottom: '4px' }}>Quedan excluidos de la presente oferta:</div>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', lineHeight: '2' }}>
            <li>Trabajos de pintura y reparación de mampostería,</li>
            <li>Cortes de vidrios,</li>
            <li>Cañería colectora de desagües de unidades exteriores.</li>
          </ul>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={LABEL}>Condiciones Comerciales</div>
        <div style={{ fontSize: '12px', color: '#333', lineHeight: '2', padding: '14px 18px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ebebeb' }}>
          <div><strong>Validez de la oferta:</strong> 5 días.</div>
          <div><strong>Lugar de entrega:</strong> Salta capital.</div>
          <div><strong>Precios:</strong> Los precios cotizados no incluyen I.V.A. Dólar: Banco Nación tipo vendedor.</div>
          <div><strong>Condición de pago:</strong> Anticipo financiero del 50% y Certificaciones mensuales.</div>
        </div>
      </div>
    </div>
  )
}

function BloqueContenido({ bloque }) {
  if (bloque.type === 'items') return <ItemsBlock items={bloque.items} total={bloque.total} />
  if (bloque.type === 'descripcion') return <DescripcionBlock texto={bloque.texto} />
  return <ExclusionesCondicionesBlock />
}

function PaginaEconomica({ numStr, fecha, bloques }) {
  return (
    <div style={PAGE}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
        <MiniHeaderEconomico numStr={numStr} fecha={fecha} />
        {bloques.map(b => (
          <div key={b.key}>
            <BloqueContenido bloque={b} />
          </div>
        ))}
      </div>
      <div style={ACCENT_BOTTOM} />
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

const PlantillaPDF = forwardRef(function PlantillaPDF({ presupuesto }, ref) {
  const { numero, fecha, cliente, obra, items = [], total, descripcionTareas, clienteObj } = presupuesto

  const numStr = String(numero || 'S/N').padStart(3, '0')

  const headerRef = useRef(null)
  const itemsRef = useRef(null)
  const descripcionRef = useRef(null)
  const exclusionesRef = useRef(null)

  // El portal de medición (más abajo) solo debe montarse en el cliente: si se
  // renderizara igual en el primer paso de hidratación, su contenido no
  // coincidiría con el HTML del servidor. `mounted` arranca en false tanto en
  // servidor como en el primer render del cliente, y useLayoutEffect lo pasa
  // a true antes del pintado, así que no hay parpadeo visible.
  const [mounted, setMounted] = useState(false)
  const [paginasEco, setPaginasEco] = useState(null)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!mounted) return
    const headerH = headerRef.current?.getBoundingClientRect().height ?? 0
    const itemsH = itemsRef.current?.getBoundingClientRect().height ?? 0
    const exclusionesH = exclusionesRef.current?.getBoundingClientRect().height ?? 0
    const descripcionH = descripcionRef.current?.getBoundingClientRect().height ?? 0

    const disponible = PAGE_CONTENT_H - headerH

    const bloques = [
      { key: 'items', type: 'items', height: itemsH, items, total, splittable: false },
    ]
    if (descripcionTareas) {
      bloques.push({ key: 'descripcion', type: 'descripcion', height: descripcionH, texto: descripcionTareas, splittable: true })
    }
    bloques.push({ key: 'exclusiones', type: 'exclusiones', height: exclusionesH, splittable: false })

    const medidor = crearMedidorTexto(PAGE_CONTENT_W)
    try {
      setPaginasEco(empaquetarBloques(bloques, disponible, GAP, medidor))
    } finally {
      medidor.destruir()
    }
  }, [mounted, items, total, descripcionTareas, numStr, fecha])

  return (
    <div ref={ref} style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a1a' }}>

      {/* ══════════════════ PÁGINA 1 — INSTITUCIONAL ══════════════════ */}
      <div style={PAGE}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <img
            src="/logo.png"
            alt="CQ en Climatización"
            style={{ height: '68px', objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '30px', fontWeight: '800', color: '#FF7900', letterSpacing: '-0.5px', lineHeight: '1' }}>
              COTIZACIÓN
            </div>
            <div style={{ fontSize: '14px', color: '#555', marginTop: '6px' }}>
              N° <strong style={{ color: '#1a1a1a' }}>#{numStr}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>
              Fecha: <strong style={{ color: '#1a1a1a' }}>{fecha}</strong>
            </div>
          </div>
        </div>

        <div style={{ ...DIVIDER, marginBottom: '28px' }} />

        {/* Emisor + Atención */}
        <div style={{ display: 'flex', marginBottom: '28px' }}>
          <div style={{ flex: 1, marginRight: '20px', backgroundColor: '#f7f7f7', borderRadius: '8px', padding: '16px 20px' }}>
            <div style={LABEL}>Emisor</div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>CQ INGENIERIA EN CLIMATIZACION</div>
            <div style={{ color: '#555', lineHeight: '1.9', fontSize: '12px' }}>
              <div>Ing. Cesar Rodrigo Quispe</div>
              <div>Los Durazneros 1054, B° Tres Cerritos, Salta Capital</div>
              <div>Salta, Argentina</div>
              <div>empresa@cqingclima.com</div>
              <div>TEL: 3873125555</div>
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: '#fff8f2', border: '1.5px solid #FFD4A8', borderRadius: '8px', padding: '16px 20px' }}>
            <div style={LABEL}>Atención</div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{clienteObj?.nombre_empresa || cliente || '—'}</div>
            <div style={{ color: '#555', lineHeight: '1.9', fontSize: '12px' }}>
              {clienteObj?.cuit_empresa && <div>CUIT: {clienteObj.cuit_empresa}</div>}
              {clienteObj?.direccion_obra && <div>{clienteObj.direccion_obra}</div>}
              {obra && <div>Obra: {obra}</div>}
            </div>
          </div>
        </div>

        {/* Carta de presentación */}
        <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '24px 28px', marginBottom: '28px' }}>
          <div style={LABEL}>Estimado/a cliente</div>
          <div style={{ fontSize: '13px', color: '#333', lineHeight: '2', whiteSpace: 'pre-line' }}>
            {CARTA}
          </div>
        </div>

        <div style={ACCENT_BOTTOM} />
      </div>

      {/* ══════════════════ PÁGINA(S) 2+ — PROPUESTA ECONÓMICA ══════════════════ */}
      {paginasEco?.map((bloquesPagina, i) => (
        <PaginaEconomica key={i} numStr={numStr} fecha={fecha} bloques={bloquesPagina} />
      ))}

      {/* Medición oculta de bloques (fuera del árbol paginado a propósito:
          generarPDF.js itera sobre los hijos directos de este componente
          tratando a cada uno como una página del PDF). */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 0, left: '-9999px', width: `${PAGE_CONTENT_W}px`, visibility: 'hidden', pointerEvents: 'none' }}>
          <div ref={headerRef}><MiniHeaderEconomico numStr={numStr} fecha={fecha} /></div>
          <div ref={itemsRef}><ItemsBlock items={items} total={total} /></div>
          {descripcionTareas && <div ref={descripcionRef}><DescripcionBlock texto={descripcionTareas} /></div>}
          <div ref={exclusionesRef}><ExclusionesCondicionesBlock /></div>
        </div>,
        document.body
      )}
    </div>
  )
})

export default PlantillaPDF

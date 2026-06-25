'use client'

import { forwardRef } from 'react'

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

const PlantillaPDF = forwardRef(function PlantillaPDF({ presupuesto }, ref) {
  const { numero, fecha, cliente, obra, items = [], total, descripcionTareas, clienteObj } = presupuesto

  const numStr = String(numero || 'S/N').padStart(3, '0')

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
              {clienteObj?.contacto_nombre && <div>Contacto: {clienteObj.contacto_nombre}</div>}
              {clienteObj?.contacto_telefono && <div>Tel: {clienteObj.contacto_telefono}</div>}
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

      {/* ══════════════════ PÁGINA 2 — PROPUESTA ECONÓMICA ══════════════════ */}
      <div style={PAGE}>

        {/* Mini-header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontWeight: '800', fontSize: '17px', color: '#1a1a1a' }}>Propuesta Económica</div>
          <div style={{ fontSize: '11px', color: '#aaa' }}>
            Cotización N° #{numStr} — {fecha}
          </div>
        </div>

        <div style={{ ...DIVIDER, marginBottom: '22px' }} />

        {/* Tabla de ítems */}
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

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
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

        {/* Descripción de las tareas */}
        {descripcionTareas && (
          <div style={{ marginBottom: '32px' }}>
            <div style={LABEL}>Descripción de las Tareas</div>
            <div style={{
              fontSize: '12px', color: '#333', lineHeight: '1.9',
              whiteSpace: 'pre-line', padding: '18px 20px',
              backgroundColor: '#f9f9f9', borderRadius: '8px',
              border: '1px solid #ebebeb',
            }}>
              {descripcionTareas}
            </div>
          </div>
        )}

        {/* Exclusiones */}
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

        {/* Condiciones Comerciales */}
        <div style={{ marginBottom: '20px' }}>
          <div style={LABEL}>Condiciones Comerciales</div>
          <div style={{ fontSize: '12px', color: '#333', lineHeight: '2', padding: '14px 18px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ebebeb' }}>
            <div><strong>Validez de la oferta:</strong> 5 días.</div>
            <div><strong>Lugar de entrega:</strong> Salta capital.</div>
            <div><strong>Precios:</strong> Los precios cotizados no incluyen I.V.A. Dólar: Banco Nación tipo vendedor.</div>
            <div><strong>Condición de pago:</strong> Anticipo financiero del 50% y Certificaciones mensuales.</div>
          </div>
        </div>

        <div style={ACCENT_BOTTOM} />
      </div>
    </div>
  )
})

export default PlantillaPDF

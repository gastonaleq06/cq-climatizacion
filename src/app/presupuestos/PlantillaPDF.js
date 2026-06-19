'use client'

import { forwardRef } from 'react'

function fmt(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0)
}

const PlantillaPDF = forwardRef(function PlantillaPDF({ presupuesto }, ref) {
  const { numero, fecha, validez, cliente, items, subtotal, iva, total, terminos } = presupuesto

  return (
    <div
      ref={ref}
      style={{
        width: '794px',
        minHeight: '1123px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '13px',
        color: '#1a1a1a',
        padding: '48px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <img
          src="/logo.png"
          alt="CQ Ingeniería en Climatización"
          style={{ height: '72px', objectFit: 'contain' }}
          crossOrigin="anonymous"
        />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '34px', fontWeight: '800', color: '#FF7900', letterSpacing: '-0.5px', lineHeight: '1' }}>
            PRESUPUESTO
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '6px' }}>
            N° <strong style={{ color: '#1a1a1a' }}>#{String(numero).padStart(3, '0')}</strong>
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
            Fecha: <strong style={{ color: '#1a1a1a' }}>{fecha}</strong>
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
            Validez: <strong style={{ color: '#1a1a1a' }}>{validez}</strong>
          </div>
        </div>
      </div>

      {/* ── DIVIDER NARANJA ── */}
      <div style={{
        height: '4px',
        background: 'linear-gradient(to right, #FF7900, #ffcc99)',
        borderRadius: '2px',
        marginBottom: '28px',
      }} />

      {/* ── EMISOR + CLIENTE ── */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '28px' }}>
        <div style={{
          flex: 1,
          backgroundColor: '#f7f7f7',
          borderRadius: '8px',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#FF7900', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Emisor
          </div>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
            CQ Ingeniería en Climatización
          </div>
          <div style={{ color: '#555', lineHeight: '1.8', fontSize: '12px' }}>
            <div>CUIT: 30-99999999-9</div>
            <div>Ingresos Brutos: 12345678</div>
            <div>Buenos Aires, Argentina</div>
            <div>Tel: (011) 4999-0000</div>
          </div>
        </div>

        <div style={{
          flex: 1,
          backgroundColor: '#fff8f2',
          border: '1.5px solid #FFD4A8',
          borderRadius: '8px',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#FF7900', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Cliente
          </div>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
            {cliente.nombre}
          </div>
          <div style={{ color: '#555', lineHeight: '1.8', fontSize: '12px' }}>
            <div>{cliente.empresa}</div>
            <div>CUIT: {cliente.cuit}</div>
            {cliente.direccion && <div>{cliente.direccion}</div>}
          </div>
        </div>
      </div>

      {/* ── TABLA DE ÍTEMS ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ backgroundColor: '#FF7900' }}>
            <th style={{ padding: '11px 16px', textAlign: 'left', color: '#fff', fontWeight: '700', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Descripción
            </th>
            <th style={{ padding: '11px 16px', textAlign: 'center', color: '#fff', fontWeight: '700', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', width: '70px' }}>
              Cant.
            </th>
            <th style={{ padding: '11px 16px', textAlign: 'right', color: '#fff', fontWeight: '700', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', width: '140px' }}>
              P. Unitario
            </th>
            <th style={{ padding: '11px 16px', textAlign: 'right', color: '#fff', fontWeight: '700', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', width: '140px' }}>
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={i}
              style={{
                backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa',
                borderBottom: '1px solid #ebebeb',
              }}
            >
              <td style={{ padding: '11px 16px', lineHeight: '1.5' }}>
                <div style={{ fontWeight: '500', color: '#1a1a1a' }}>{item.descripcion}</div>
                {item.detalle && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{item.detalle}</div>
                )}
              </td>
              <td style={{ padding: '11px 16px', textAlign: 'center', color: '#555' }}>
                {item.cantidad}
              </td>
              <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#555', fontSize: '12px' }}>
                {fmt(item.precioUnitario)}
              </td>
              <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', fontSize: '12px' }}>
                {fmt(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTALES ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '36px' }}>
        <div style={{ width: '290px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>
            <span style={{ color: '#666' }}>Subtotal</span>
            <span style={{ fontFamily: 'monospace', color: '#333' }}>{fmt(subtotal)}</span>
          </div>
          {iva > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>
              <span style={{ color: '#666' }}>IVA (21%)</span>
              <span style={{ fontFamily: 'monospace', color: '#333' }}>{fmt(iva)}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '13px 18px',
            marginTop: '10px',
            backgroundColor: '#FF7900',
            borderRadius: '8px',
            color: '#fff',
          }}>
            <span style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '0.03em' }}>TOTAL</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '16px' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* ── FOOTER / TÉRMINOS ── */}
      <div style={{ borderTop: '2px solid #ebebeb', paddingTop: '22px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#FF7900', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Términos y Condiciones
        </div>
        <ul style={{ margin: '0 0 0 0', paddingLeft: '18px', color: '#666', fontSize: '11px', lineHeight: '2' }}>
          {terminos.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>

        {/* Líneas de firma */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '52px' }}>
          <div style={{ width: '210px', textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #aaa', paddingTop: '8px', fontSize: '11px', color: '#888' }}>
              Firma del Cliente
            </div>
            <div style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>Aclaración y DNI</div>
          </div>
          <div style={{ width: '210px', textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #aaa', paddingTop: '8px', fontSize: '11px', color: '#888' }}>
              Firma y Sello
            </div>
            <div style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>CQ Ingeniería en Climatización</div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default PlantillaPDF

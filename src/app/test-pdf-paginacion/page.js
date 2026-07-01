'use client'

// Página TEMPORAL solo para verificar visualmente la paginación dinámica
// de PlantillaPDF con una descripción de tareas extremadamente larga.
// No requiere Supabase ni autenticación. Borrar después de verificar.

import PlantillaPDF from '../presupuestos/PlantillaPDF'

const parrafo =
  'Se incluye la colocación completa de cañería de cobre con aislación térmica de alta densidad, ' +
  'soportes metálicos galvanizados para unidad exterior, conexiones eléctricas certificadas, bandeja ' +
  'de desagüe con pendiente correcta, sellado de perforaciones con espuma expansiva y silicona, ' +
  'prueba de estanqueidad con nitrógeno, carga de gas refrigerante según especificación del fabricante, ' +
  'puesta en marcha y prueba de funcionamiento en frío y calor, capacitación básica al usuario final. '

const descripcionTareasLarga = Array.from({ length: 40 }, (_, i) => `${i + 1}) ${parrafo}`).join('\n\n')

const mockPresupuesto = {
  numero: 999,
  fecha: '01/07/2026',
  cliente: 'Cliente de Prueba SA',
  clienteObj: {
    nombre_empresa: 'Cliente de Prueba SA',
    cuit_empresa: '30-12345678-9',
    direccion_obra: 'Av. Siempre Viva 742, Salta',
  },
  obra: 'Obra de prueba paginación',
  items: [
    { nombre: 'Split 3000 frigorías', marca: 'Daikin', cantidad: 2, subtotal: 1500000 },
    { nombre: 'Split 4500 frigorías', marca: 'Midea', cantidad: 1, subtotal: 950000 },
    { nombre: 'Cañería de cobre 1/4-1/2', marca: '', cantidad: 12, subtotal: 84000 },
  ],
  total: 2534000,
  descripcionTareas: descripcionTareasLarga,
}

export default function TestPdfPaginacion() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '24px' }}>
      <PlantillaPDF presupuesto={mockPresupuesto} />
    </div>
  )
}

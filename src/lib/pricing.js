// Motor de costeo compartido.
// vars debe tener las mismas claves que la tabla variables_globales:
//   dolar, precio_cobre_usd_kg, beneficio_cobre, beneficio_general
export function calcPrecioVentaInsumo(insumo, vars) {
  if (!insumo || !vars) return 0
  if (insumo.categoria === 'Cañería de cobre') {
    const base = (insumo.peso_kg || 0) * (vars.precio_cobre_usd_kg || 0) * (vars.dolar || 0)
    return base * (1 + (vars.beneficio_cobre || 0) / 100)
  }
  const base =
    insumo.moneda === 'USD'
      ? (insumo.precio_base || 0) * (vars.dolar || 0)
      : insumo.precio_base || 0
  return base * (1 + (vars.beneficio_general || 0) / 100)
}

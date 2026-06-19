-- Rollback RBAC: eliminar políticas restrictivas y restaurar acceso a usuarios autenticados

-- =====================
-- Tabla: nomina
-- =====================
DROP POLICY IF EXISTS nomina_admin_jefe_all ON nomina;

DROP POLICY IF EXISTS nomina_authenticated_all ON nomina;

CREATE POLICY nomina_authenticated_all
  ON nomina
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =====================
-- Tabla: empleados
-- =====================
DROP POLICY IF EXISTS empleados_admin_jefe_all ON empleados;

DROP POLICY IF EXISTS empleados_authenticated_all ON empleados;

CREATE POLICY empleados_authenticated_all
  ON empleados
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

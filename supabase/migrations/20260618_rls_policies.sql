-- ============================================================
-- RLS POLICIES - CQ Climatización
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- PASO 1: Habilitar RLS en todas las tablas
-- ============================================================

ALTER TABLE empleados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras               ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_obras    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario          ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina              ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_items  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASO 2: Eliminar políticas previas (incluye las "Always True")
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'empleados', 'obras', 'clientes', 'asignacion_obras',
        'inventario', 'nomina', 'presupuestos', 'presupuestos_items', 'profiles'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END;
$$;

-- ============================================================
-- PASO 3: Crear políticas estrictas (solo usuarios autenticados)
-- ============================================================

-- empleados
CREATE POLICY "empleados_authenticated_all"
  ON empleados FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- obras
CREATE POLICY "obras_authenticated_all"
  ON obras FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- clientes
CREATE POLICY "clientes_authenticated_all"
  ON clientes FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- asignacion_obras
CREATE POLICY "asignacion_obras_authenticated_all"
  ON asignacion_obras FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- inventario
CREATE POLICY "inventario_authenticated_all"
  ON inventario FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- nomina
CREATE POLICY "nomina_authenticated_all"
  ON nomina FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- presupuestos
CREATE POLICY "presupuestos_authenticated_all"
  ON presupuestos FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- presupuestos_items
CREATE POLICY "presupuestos_items_authenticated_all"
  ON presupuestos_items FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- PASO 4: Tabla profiles — cada usuario solo ve/edita su propio perfil
-- ============================================================

-- Crear tabla profiles si no existe
CREATE TABLE IF NOT EXISTS profiles (
  id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Lectura: solo el propio perfil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Inserción: solo puede insertar su propio registro
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Actualización: solo puede editar su propio registro
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Sin eliminación directa (se borra en cascada con auth.users)

-- ============================================================
-- PASO 5: Trigger para crear perfil automáticamente al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- VERIFICACIÓN: listar todas las políticas creadas
-- ============================================================

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

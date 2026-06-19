-- ============================================================
-- RBAC - Control de Acceso Basado en Roles
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- PASO 1: Agregar columna rol a profiles (default 'tecnico')
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rol TEXT NOT NULL DEFAULT 'tecnico';

-- ============================================================
-- PASO 2: Establecer rol = 'admin' al usuario propietario
-- ============================================================

UPDATE public.profiles
  SET rol = 'admin'
  WHERE id = '760c7ee9-bea8-47fa-91cf-a32da4640148';

-- Si el perfil aún no existe (primer login pendiente), insertarlo directamente:
INSERT INTO public.profiles (id, email, rol)
  SELECT '760c7ee9-bea8-47fa-91cf-a32da4640148', email, 'admin'
  FROM auth.users
  WHERE id = '760c7ee9-bea8-47fa-91cf-a32da4640148'
ON CONFLICT (id) DO UPDATE SET rol = 'admin';

-- ============================================================
-- PASO 3: Función auxiliar con SECURITY DEFINER
--         Evita recursión RLS al consultar profiles dentro de políticas
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- PASO 4: Eliminar políticas authenticated_all de nomina y empleados
-- ============================================================

DROP POLICY IF EXISTS "nomina_authenticated_all"    ON public.nomina;
DROP POLICY IF EXISTS "empleados_authenticated_all" ON public.empleados;

-- ============================================================
-- PASO 5: Nuevas políticas — solo admin y jefe pueden acceder
-- ============================================================

CREATE POLICY "nomina_admin_jefe_all"
  ON public.nomina FOR ALL
  TO authenticated
  USING     (public.get_my_rol() IN ('admin', 'jefe'))
  WITH CHECK (public.get_my_rol() IN ('admin', 'jefe'));

CREATE POLICY "empleados_admin_jefe_all"
  ON public.empleados FOR ALL
  TO authenticated
  USING     (public.get_my_rol() IN ('admin', 'jefe'))
  WITH CHECK (public.get_my_rol() IN ('admin', 'jefe'));

-- ============================================================
-- PASO 6: Actualizar trigger para asignar rol='tecnico' a nuevos usuarios
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, rol)
  VALUES (NEW.id, NEW.email, 'tecnico')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- VERIFICACIÓN: políticas activas en nomina y empleados
-- ============================================================

SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('nomina', 'empleados')
ORDER BY tablename, policyname;

-- ============================================================
-- Módulo Vehículos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vehiculos (
  id                          SERIAL PRIMARY KEY,
  patente                     TEXT NOT NULL,
  marca                       TEXT NOT NULL,
  modelo                      TEXT NOT NULL,
  anio                        INTEGER,
  fecha_venc_seguro           DATE,
  fecha_venc_revision_tecnica DATE,
  estado                      TEXT NOT NULL DEFAULT 'Activo',
  observaciones               TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehiculos_mantenimientos (
  id           SERIAL PRIMARY KEY,
  vehiculo_id  INTEGER NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  tipo         TEXT NOT NULL,
  descripcion  TEXT,
  km           INTEGER,
  costo        NUMERIC,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas de vencimientos
CREATE INDEX IF NOT EXISTS idx_vehiculos_venc_seguro
  ON public.vehiculos (fecha_venc_seguro);

CREATE INDEX IF NOT EXISTS idx_vehiculos_venc_revision
  ON public.vehiculos (fecha_venc_revision_tecnica);

-- ============================================================
-- RLS — mismo patrón "authenticated_all" que las demás tablas
-- ============================================================

ALTER TABLE public.vehiculos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos_mantenimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehiculos_authenticated_all"
  ON public.vehiculos FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "vehiculos_mantenimientos_authenticated_all"
  ON public.vehiculos_mantenimientos FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

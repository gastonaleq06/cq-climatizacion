-- Renombra precio_cobre_kg → precio_cobre_usd_kg
-- El cobre ahora se cotiza en USD/kg y se convierte con la variable `dolar`
ALTER TABLE public.variables_globales
  RENAME COLUMN precio_cobre_kg TO precio_cobre_usd_kg;

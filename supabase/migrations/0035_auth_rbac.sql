-- 1. Crear el tipo enumerado para los roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usuario_rol') THEN
        CREATE TYPE usuario_rol AS ENUM ('admin', 'coordinador', 'rrhh', 'consultor');
    END IF;
END$$;

-- 2. Tabla de perfiles vinculada a la autenticación de Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nombre text,
  email text UNIQUE NOT NULL,
  rol usuario_rol DEFAULT 'consultor' NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en perfiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpiar las políticas de perfiles previas por si este script se corre múltiples veces
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados leen perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin gestiona todos los perfiles" ON public.profiles;

-- 3. Trigger para crear perfil en auth.users update/insert
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email, rol)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'consultor');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Función de Seguridad para evitar recursión infinita en perfiles
-- El modificador SECURITY DEFINER instruye a Postgres a saltarse RLS.
-- Es CRÍTICO que la función use auth.uid() directamente.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.usuario_rol AS $$
DECLARE
  user_role public.usuario_rol;
BEGIN
  -- Intentar obtener el rol.
  SELECT rol INTO user_role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Políticas RLS para perfiles

-- TODOS los usuarios autenticados pueden ver la lista de perfiles (necesario para la UI y evitar recursión)
CREATE POLICY "Usuarios autenticados leen perfiles" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

-- Solo los Administradores pueden gestionar (Insert/Update/Delete) todos los perfiles
-- Separamos las politicas para evitar que un SELECT llame a get_user_role y cause recursión.
DROP POLICY IF EXISTS "Admin inserta perfiles" ON public.profiles;
CREATE POLICY "Admin inserta perfiles" ON public.profiles FOR INSERT WITH CHECK ( public.get_user_role() = 'admin' );

DROP POLICY IF EXISTS "Admin actualiza perfiles" ON public.profiles;
CREATE POLICY "Admin actualiza perfiles" ON public.profiles FOR UPDATE USING ( public.get_user_role() = 'admin' );

DROP POLICY IF EXISTS "Admin borra perfiles" ON public.profiles;
CREATE POLICY "Admin borra perfiles" ON public.profiles FOR DELETE USING ( public.get_user_role() = 'admin' );

-- 5. Modificar Políticas RLS para config_formulas

-- Eliminar políticas anteriores si existieran (opcional, por seguridad)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.config_formulas;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.config_formulas;
DROP POLICY IF EXISTS "Enable update for auth users" ON public.config_formulas;

-- Solo Admin edita fórmulas globales
DROP POLICY IF EXISTS "Admin edita formulas" ON public.config_formulas;
CREATE POLICY "Admin edita formulas" 
ON public.config_formulas FOR ALL 
USING ( public.get_user_role() = 'admin' );

-- Otros roles solo pueden consultar las fórmulas para cálculos locales
DROP POLICY IF EXISTS "Lectura de formulas para usuarios autenticados" ON public.config_formulas;
CREATE POLICY "Lectura de formulas para usuarios autenticados" 
ON public.config_formulas FOR SELECT 
TO authenticated 
USING (true);

-- 6. Política para config_presupuesto (Factor Lluvia y duracion proyecto)
DROP POLICY IF EXISTS "Enable read for all" ON public.config_presupuesto;
DROP POLICY IF EXISTS "Enable all access" ON public.config_presupuesto;

DROP POLICY IF EXISTS "Lectura general config_presupuesto" ON public.config_presupuesto;
CREATE POLICY "Lectura general config_presupuesto" 
ON public.config_presupuesto FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Admin y Coordinador gestionan configuracion" ON public.config_presupuesto;
CREATE POLICY "Admin y Coordinador gestionan configuracion" 
ON public.config_presupuesto FOR UPDATE 
USING ( public.get_user_role() IN ('admin', 'coordinador') );

DROP POLICY IF EXISTS "Admin y Coordinador gestionan configuracion insert" ON public.config_presupuesto;
CREATE POLICY "Admin y Coordinador gestionan configuracion insert" 
ON public.config_presupuesto FOR INSERT 
WITH CHECK ( public.get_user_role() IN ('admin', 'coordinador') );


-- 7. Seguridad para Salarios, Dotación y Salud Ocupacional (RRHH y Admin)

-- Dotacion
DROP POLICY IF EXISTS "Enable all for dotacion" ON public.dotacion;
DROP POLICY IF EXISTS "RRHH y Admin gestionan dotacion" ON public.dotacion;
CREATE POLICY "RRHH y Admin gestionan dotacion" 
ON public.dotacion FOR ALL 
USING ( public.get_user_role() IN ('admin', 'rrhh') );

DROP POLICY IF EXISTS "Coordinadores ven dotacion" ON public.dotacion;
CREATE POLICY "Coordinadores ven dotacion" 
ON public.dotacion FOR SELECT 
USING ( public.get_user_role() = 'coordinador' );

-- Mano de Obra
DROP POLICY IF EXISTS "Enable read access for all users" ON public.mano_obra;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.mano_obra;
DROP POLICY IF EXISTS "Enable update for all users" ON public.mano_obra;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.mano_obra;
DROP POLICY IF EXISTS "RRHH y Admin gestionan mano de obra" ON public.mano_obra;
CREATE POLICY "RRHH y Admin gestionan mano de obra" 
ON public.mano_obra FOR ALL 
USING ( public.get_user_role() IN ('admin', 'rrhh') );

DROP POLICY IF EXISTS "Coordinadores ven mano de obra" ON public.mano_obra;
CREATE POLICY "Coordinadores ven mano de obra" 
ON public.mano_obra FOR SELECT 
USING ( public.get_user_role() = 'coordinador' );

-- Certificaciones Alturas
DROP POLICY IF EXISTS "Enable all" ON public.certificacion_alturas;
DROP POLICY IF EXISTS "RRHH y Admin gestionan certificaciones alturas" ON public.certificacion_alturas;
CREATE POLICY "RRHH y Admin gestionan certificaciones alturas" 
ON public.certificacion_alturas FOR ALL 
USING ( public.get_user_role() IN ('admin', 'rrhh') );

DROP POLICY IF EXISTS "Coordinadores ven certificaciones alturas" ON public.certificacion_alturas;
CREATE POLICY "Coordinadores ven certificaciones alturas" 
ON public.certificacion_alturas FOR SELECT 
USING ( public.get_user_role() = 'coordinador' );

-- Certificados Confinados
DROP POLICY IF EXISTS "Enable all" ON public.certificados_confinados;
DROP POLICY IF EXISTS "RRHH y Admin gestionan certificados confinados" ON public.certificados_confinados;
CREATE POLICY "RRHH y Admin gestionan certificados confinados" 
ON public.certificados_confinados FOR ALL 
USING ( public.get_user_role() IN ('admin', 'rrhh') );

DROP POLICY IF EXISTS "Coordinadores ven certificados confinados" ON public.certificados_confinados;
CREATE POLICY "Coordinadores ven certificados confinados" 
ON public.certificados_confinados FOR SELECT 
USING ( public.get_user_role() = 'coordinador' );

-- Examenes Medicos
DROP POLICY IF EXISTS "Enable all" ON public.examenes_medicos;
DROP POLICY IF EXISTS "RRHH y Admin gestionan examenes medicos" ON public.examenes_medicos;
CREATE POLICY "RRHH y Admin gestionan examenes medicos" 
ON public.examenes_medicos FOR ALL 
USING ( public.get_user_role() IN ('admin', 'rrhh') );

DROP POLICY IF EXISTS "Coordinadores ven examenes medicos" ON public.examenes_medicos;
CREATE POLICY "Coordinadores ven examenes medicos" 
ON public.examenes_medicos FOR SELECT 
USING ( public.get_user_role() = 'coordinador' );


-- 8. Seguridad para APU y Cuadro Económico (Admin y Coordinador)

-- APU_ITEMS
DROP POLICY IF EXISTS "Enable full access for apu_items" ON public.apu_items;
DROP POLICY IF EXISTS "Ingenieria de costos acceso total" ON public.apu_items;
CREATE POLICY "Ingenieria de costos acceso total" 
ON public.apu_items FOR ALL 
USING ( public.get_user_role() IN ('admin', 'coordinador') );

-- CUADRO_ECONOMICO (No tiene tabla aún, pero la política está lista por si acaso)
-- CREATE POLICY "Ingenieria de costos acceso total ce" 
-- ON public.cuadro_economico FOR ALL 
-- USING ( (SELECT rol FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'coordinador') );

-- CREATE POLICY "Lectura general para consultores ce" 
-- ON public.cuadro_economico FOR SELECT 
-- TO authenticated 
-- USING (true);

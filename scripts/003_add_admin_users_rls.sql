-- Crear tabla admin_users si no existe
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen para recrearlas
DROP POLICY IF EXISTS "admin_users_select_own" ON admin_users;
DROP POLICY IF EXISTS "admin_users_insert_any" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update_service_only" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete_service_only" ON admin_users;
DROP POLICY IF EXISTS "admin_users_check_exists" ON admin_users;

-- Política: Permitir ver solo el conteo (para verificar si hay admins en setup)
CREATE POLICY "admin_users_check_exists" ON admin_users 
  FOR SELECT 
  USING (true);

-- Política: Permitir insertar a usuarios autenticados su propio registro
CREATE POLICY "admin_users_insert_any" ON admin_users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Política: Nadie puede actualizar directamente
CREATE POLICY "admin_users_update_service_only" ON admin_users 
  FOR UPDATE 
  USING (false);

-- Política: Nadie puede eliminar directamente
CREATE POLICY "admin_users_delete_service_only" ON admin_users 
  FOR DELETE 
  USING (false);

-- Habilitar RLS en la tabla eps (si no está habilitado)
ALTER TABLE eps ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública: la encuesta necesita leer las EPS activas
DROP POLICY IF EXISTS "eps_select" ON eps;
CREATE POLICY "eps_select" ON eps FOR SELECT USING (true);

-- Política de inserción para admins autenticados
DROP POLICY IF EXISTS "eps_insert_admin" ON eps;
CREATE POLICY "eps_insert_admin" ON eps FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Política de actualización para admins (permite toggle activo y editar nombre)
DROP POLICY IF EXISTS "eps_update_admin" ON eps;
CREATE POLICY "eps_update_admin" ON eps FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

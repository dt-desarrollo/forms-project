-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS encuestas CASCADE;
DROP TABLE IF EXISTS sedes CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;
DROP TABLE IF EXISTS departamentos CASCADE;

-- Tabla de departamentos
CREATE TABLE departamentos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

-- Tabla de municipios
CREATE TABLE municipios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  departamento_id INTEGER NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE
);

-- Tabla de sedes
CREATE TABLE sedes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  municipio_id INTEGER NOT NULL REFERENCES municipios(id) ON DELETE CASCADE
);

-- Tabla de respuestas de encuesta
CREATE TABLE encuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_atencion DATE NOT NULL,
  departamento_id INTEGER NOT NULL REFERENCES departamentos(id),
  municipio_id INTEGER NOT NULL REFERENCES municipios(id),
  sede_id INTEGER NOT NULL REFERENCES sedes(id),
  eps TEXT NOT NULL,
  tipo_afiliado TEXT NOT NULL,
  recomendaciones_uso_seguro INTEGER NOT NULL,
  comodidad_limpieza INTEGER NOT NULL,
  medicamentos_oportunos INTEGER NOT NULL,
  atencion_personal INTEGER NOT NULL,
  claridad_informacion INTEGER NOT NULL,
  servicio_humanizado INTEGER NOT NULL,
  localizacion_acceso INTEGER NOT NULL,
  horario_atencion INTEGER NOT NULL,
  tiempo_solicitar_medicamentos INTEGER NOT NULL,
  experiencia_global INTEGER NOT NULL,
  recomendaria_ips INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE encuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;

-- Políticas para encuestas
CREATE POLICY "encuestas_insert" ON encuestas FOR INSERT WITH CHECK (true);
CREATE POLICY "encuestas_select" ON encuestas FOR SELECT USING (true);

-- Políticas para ubicaciones (solo lectura pública)
CREATE POLICY "departamentos_select" ON departamentos FOR SELECT USING (true);
CREATE POLICY "municipios_select" ON municipios FOR SELECT USING (true);
CREATE POLICY "sedes_select" ON sedes FOR SELECT USING (true);

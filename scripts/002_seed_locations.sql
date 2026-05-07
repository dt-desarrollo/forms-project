-- Insertar departamentos de ejemplo (puedes agregar más según tu Excel)
INSERT INTO departamentos (nombre) VALUES 
  ('Santander'),
  ('Norte de Santander'),
  ('Cesar'),
  ('Magdalena'),
  ('Atlántico')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar municipios (relacionados con departamentos)
-- Santander
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Bucaramanga', id FROM departamentos WHERE nombre = 'Santander'
ON CONFLICT DO NOTHING;
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Floridablanca', id FROM departamentos WHERE nombre = 'Santander'
ON CONFLICT DO NOTHING;
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Girón', id FROM departamentos WHERE nombre = 'Santander'
ON CONFLICT DO NOTHING;
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Piedecuesta', id FROM departamentos WHERE nombre = 'Santander'
ON CONFLICT DO NOTHING;

-- Norte de Santander
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Cúcuta', id FROM departamentos WHERE nombre = 'Norte de Santander'
ON CONFLICT DO NOTHING;
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Ocaña', id FROM departamentos WHERE nombre = 'Norte de Santander'
ON CONFLICT DO NOTHING;
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Pamplona', id FROM departamentos WHERE nombre = 'Norte de Santander'
ON CONFLICT DO NOTHING;

-- Cesar
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Valledupar', id FROM departamentos WHERE nombre = 'Cesar'
ON CONFLICT DO NOTHING;
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Aguachica', id FROM departamentos WHERE nombre = 'Cesar'
ON CONFLICT DO NOTHING;

-- Magdalena
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Santa Marta', id FROM departamentos WHERE nombre = 'Magdalena'
ON CONFLICT DO NOTHING;

-- Atlántico
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Barranquilla', id FROM departamentos WHERE nombre = 'Atlántico'
ON CONFLICT DO NOTHING;
INSERT INTO municipios (nombre, departamento_id) 
SELECT 'Soledad', id FROM departamentos WHERE nombre = 'Atlántico'
ON CONFLICT DO NOTHING;

-- Insertar sedes (relacionadas con municipios)
-- Bucaramanga
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Principal Bucaramanga', id FROM municipios WHERE nombre = 'Bucaramanga'
ON CONFLICT DO NOTHING;
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Centro Bucaramanga', id FROM municipios WHERE nombre = 'Bucaramanga'
ON CONFLICT DO NOTHING;
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Cabecera', id FROM municipios WHERE nombre = 'Bucaramanga'
ON CONFLICT DO NOTHING;

-- Floridablanca
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Floridablanca Centro', id FROM municipios WHERE nombre = 'Floridablanca'
ON CONFLICT DO NOTHING;
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Cañaveral', id FROM municipios WHERE nombre = 'Floridablanca'
ON CONFLICT DO NOTHING;

-- Girón
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Girón Principal', id FROM municipios WHERE nombre = 'Girón'
ON CONFLICT DO NOTHING;

-- Piedecuesta
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Piedecuesta', id FROM municipios WHERE nombre = 'Piedecuesta'
ON CONFLICT DO NOTHING;

-- Cúcuta
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Cúcuta Centro', id FROM municipios WHERE nombre = 'Cúcuta'
ON CONFLICT DO NOTHING;
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Cúcuta Norte', id FROM municipios WHERE nombre = 'Cúcuta'
ON CONFLICT DO NOTHING;

-- Ocaña
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Ocaña', id FROM municipios WHERE nombre = 'Ocaña'
ON CONFLICT DO NOTHING;

-- Pamplona
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Pamplona', id FROM municipios WHERE nombre = 'Pamplona'
ON CONFLICT DO NOTHING;

-- Valledupar
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Valledupar Centro', id FROM municipios WHERE nombre = 'Valledupar'
ON CONFLICT DO NOTHING;
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Valledupar Norte', id FROM municipios WHERE nombre = 'Valledupar'
ON CONFLICT DO NOTHING;

-- Aguachica
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Aguachica', id FROM municipios WHERE nombre = 'Aguachica'
ON CONFLICT DO NOTHING;

-- Santa Marta
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Santa Marta Centro', id FROM municipios WHERE nombre = 'Santa Marta'
ON CONFLICT DO NOTHING;
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Rodadero', id FROM municipios WHERE nombre = 'Santa Marta'
ON CONFLICT DO NOTHING;

-- Barranquilla
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Barranquilla Centro', id FROM municipios WHERE nombre = 'Barranquilla'
ON CONFLICT DO NOTHING;
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Barranquilla Norte', id FROM municipios WHERE nombre = 'Barranquilla'
ON CONFLICT DO NOTHING;

-- Soledad
INSERT INTO sedes (nombre, municipio_id)
SELECT 'Sede Soledad', id FROM municipios WHERE nombre = 'Soledad'
ON CONFLICT DO NOTHING;

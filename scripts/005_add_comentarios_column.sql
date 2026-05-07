-- Add comentarios column to encuestas table
ALTER TABLE encuestas 
ADD COLUMN IF NOT EXISTS comentarios TEXT DEFAULT NULL;

-- Add a comment to describe the column
COMMENT ON COLUMN encuestas.comentarios IS 'Optional comments or suggestions from the user';

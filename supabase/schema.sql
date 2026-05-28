-- ============================================================
-- GRUPO EL OMBÚ — Firmas Digitales
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

-- 1. CLIENTES (importados del CSV)
CREATE TABLE IF NOT EXISTS clients (
  id          INTEGER PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  tipo        TEXT,
  telefono    TEXT,
  email       TEXT,
  contacto    TEXT,
  direccion   TEXT,
  localidad   TEXT,
  provincia   TEXT,
  vendedor    TEXT,
  iva         TEXT,
  cuit        TEXT,
  nota        TEXT,
  estado      TEXT    DEFAULT 'Pendiente',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LISTAS DE PRECIOS (PDFs por cliente)
CREATE TABLE IF NOT EXISTS price_lists (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name       TEXT    NOT NULL,
  description     TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'signed')),
  -- URLs en Cloudinary
  pdf_url         TEXT    NOT NULL,
  signed_pdf_url  TEXT,
  -- Token único para el link del cliente
  token           TEXT    NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  -- Timestamps
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  signed_at       TIMESTAMPTZ,
  -- Metadatos de firma
  signer_ip       TEXT,
  signer_ua       TEXT
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_price_lists_token     ON price_lists(token);
CREATE INDEX IF NOT EXISTS idx_price_lists_client_id ON price_lists(client_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_status    ON price_lists(status);
CREATE INDEX IF NOT EXISTS idx_clients_nombre        ON clients USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_clients_vendedor      ON clients(vendedor);
CREATE INDEX IF NOT EXISTS idx_clients_tipo          ON clients(tipo);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

-- Admins autenticados tienen acceso total
CREATE POLICY "admin_all_clients" ON clients
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_price_lists" ON price_lists
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Público puede leer una lista por su token (para la página de firma)
CREATE POLICY "public_read_by_token" ON price_lists
  FOR SELECT USING (true);

-- Público puede actualizar (firmar) usando el token — solo campos permitidos
-- La validación real se hace en el API route
CREATE POLICY "public_sign_by_token" ON price_lists
  FOR UPDATE USING (status = 'pending');

-- ============================================================
-- FUNCIÓN helper: stats rápidas para el dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_clients',    (SELECT COUNT(*) FROM clients),
    'with_lists',       (SELECT COUNT(DISTINCT client_id) FROM price_lists),
    'total_signed',     (SELECT COUNT(*) FROM price_lists WHERE status = 'signed'),
    'total_pending',    (SELECT COUNT(*) FROM price_lists WHERE status = 'pending')
  )
$$ LANGUAGE SQL SECURITY DEFINER;

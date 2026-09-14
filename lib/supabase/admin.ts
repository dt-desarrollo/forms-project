import { createServerClient } from "@supabase/ssr"

/**
 * Cliente Supabase con service-role para uso EXCLUSIVO en el servidor.
 * Ignora RLS, por lo que solo debe usarse dentro de route handlers / server
 * actions que ya validaron la petición (p. ej. tras verificar el CAPTCHA).
 * Nunca se debe importar desde código de cliente.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno")
  }

  return createServerClient(url, serviceRoleKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

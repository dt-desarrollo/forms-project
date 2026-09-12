import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

// Campos de identificación requeridos (deben ser enteros positivos)
const ID_FIELDS = [
  "departamento_id",
  "municipio_id",
  "sede_id",
  "eps_id",
  "tipo_afiliado_id",
] as const

// Preguntas de calificación requeridas (enteros dentro de la escala válida)
const RATING_FIELDS = [
  "recomendaciones_uso_seguro",
  "comodidad_limpieza",
  "medicamentos_oportunos",
  "atencion_personal",
  "claridad_informacion",
  "servicio_humanizado",
  "localizacion_acceso",
  "horario_atencion",
  "tiempo_solicitar_medicamentos",
] as const

// Preguntas de calificación opcionales
const OPTIONAL_RATING_FIELDS = ["experiencia_global", "recomendaria_ips"] as const

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0
}

function isRating(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5
}

async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  // Degradación elegante: si aún no se configuran las claves de Turnstile,
  // no se bloquea el envío (la validación de datos del servidor sigue activa).
  if (!secret) return true

  if (typeof token !== "string" || token.length === 0) return false

  const body = new URLSearchParams()
  body.append("secret", secret)
  body.append("response", token)
  if (ip) body.append("remoteip", ip)

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")

  // 1) Verificación anti-bot (CAPTCHA)
  const captchaOk = await verifyTurnstile(payload.turnstileToken, ip)
  if (!captchaOk) {
    return NextResponse.json(
      { error: "No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo." },
      { status: 403 },
    )
  }

  // 2) Validación estricta del contenido (bloquea envíos con datos basura)
  for (const field of ID_FIELDS) {
    if (!isPositiveInt(payload[field])) {
      return NextResponse.json({ error: "Faltan campos requeridos o son inválidos" }, { status: 400 })
    }
  }
  for (const field of RATING_FIELDS) {
    if (!isRating(payload[field])) {
      return NextResponse.json({ error: "Faltan calificaciones requeridas o son inválidas" }, { status: 400 })
    }
  }
  for (const field of OPTIONAL_RATING_FIELDS) {
    if (payload[field] != null && !isRating(payload[field])) {
      return NextResponse.json({ error: "Calificación fuera de rango" }, { status: 400 })
    }
  }

  const fechaAtencion = typeof payload.fecha_atencion === "string" ? payload.fecha_atencion : null
  if (!fechaAtencion || Number.isNaN(Date.parse(fechaAtencion))) {
    return NextResponse.json({ error: "Fecha de atención inválida" }, { status: 400 })
  }

  const comentarios =
    typeof payload.comentarios === "string" ? payload.comentarios.slice(0, 2000) : null
  const eps = typeof payload.eps === "string" ? payload.eps.slice(0, 200) : ""
  const tipoAfiliado =
    typeof payload.tipo_afiliado === "string" ? payload.tipo_afiliado.slice(0, 200) : ""

  // 3) Insert con service-role (solo se llega aquí tras pasar las validaciones)
  const insertData: Record<string, unknown> = {
    fecha_atencion: fechaAtencion,
    eps,
    tipo_afiliado: tipoAfiliado,
    comentarios,
  }
  for (const field of [...ID_FIELDS, ...RATING_FIELDS]) {
    insertData[field] = payload[field]
  }
  for (const field of OPTIONAL_RATING_FIELDS) {
    insertData[field] = payload[field] ?? null
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("encuestas").insert([insertData])

  if (error) {
    console.error("[v0] Error insertando encuesta:", error.message)
    return NextResponse.json({ error: "No se pudo guardar la encuesta" }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

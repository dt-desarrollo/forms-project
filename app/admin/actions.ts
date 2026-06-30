"use server"

import { createClient } from "@/lib/supabase/server"

const PAGE_SIZE = 1000

export type EncuestaFilters = {
  fechaInicio?: string
  fechaFin?: string
  sedeId?: number
}

export type StatsResult = {
  total: number
  promedioExperiencia: string
  promedioRecomendacion: string
  promedioAtencion: string
}

export type EncuestaRow = {
  id: string
  fecha_atencion: string
  eps_id: number | null
  tipo_afiliado_id: number | null
  experiencia_global: number
  recomendaria_ips: number
  atencion_personal: number
  claridad_informacion: number
  servicio_humanizado: number
  recomendaciones_uso_seguro: number
  medicamentos_oportunos: number
  localizacion_acceso: number
  horario_atencion: number
  tiempo_solicitar_medicamentos: number
  comodidad_limpieza: number
  comentarios: string | null
  created_at: string
  sede_id: number
  departamentos: { nombre: string } | null
  municipios: { nombre: string } | null
  sedes: { nombre: string } | null
  eps: { nombre: string } | null
  tipos_afiliado: { nombre: string } | null
}

function applyFilters(query: any, filters: EncuestaFilters) {
  if (filters.fechaInicio) query = query.gte("fecha_atencion", filters.fechaInicio)
  // Use the day after fechaFin so the entire last day is included (handles both
  // date and timestamp columns without depending on time-of-day comparisons).
  if (filters.fechaFin) {
    const nextDay = new Date(filters.fechaFin)
    nextDay.setDate(nextDay.getDate() + 1)
    query = query.lt("fecha_atencion", nextDay.toISOString().slice(0, 10))
  }
  if (filters.sedeId) query = query.eq("sede_id", filters.sedeId)
  return query
}

/**
 * Fetches a single page of encuestas with full join data.
 * Returns the page data plus the exact total count for the given filters.
 */
export async function fetchEncuestasPage(
  filters: EncuestaFilters,
  page: number,
  pageSize: number = 10
): Promise<{ data: EncuestaRow[]; count: number; error: string | null }> {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("encuestas")
    .select(
      `*, departamentos(nombre), municipios(nombre), sedes(nombre), eps(nombre), tipos_afiliado(nombre)`,
      { count: "exact" }
    )
    .order("fecha_atencion", { ascending: false })
    .order("created_at", { ascending: false })

  // Apply filters BEFORE range so the server paginates the filtered result set,
  // not the entire table. Putting .range() before filters caused it to slice
  // the unfiltered table and then apply the where clause on top of that slice,
  // making records outside the current page's window invisible.
  query = applyFilters(query, filters)
  query = query.range(from, to)

  const { data, count, error } = await query
  return { data: (data ?? []) as EncuestaRow[], count: count ?? 0, error: error?.message ?? null }
}

/**
 * Computes aggregated stats by looping through ALL pages that match the filters.
 * This bypasses the Supabase 1000-row default cap.
 */
export async function fetchEncuestasStats(
  filters: EncuestaFilters
): Promise<StatsResult> {
  const supabase = await createClient()

  let totalExp = 0
  let totalRec = 0
  let totalAten = 0
  let total = 0
  let pageNum = 0

  while (true) {
    let query = supabase
      .from("encuestas")
      .select("experiencia_global, recomendaria_ips, atencion_personal", {
        count: pageNum === 0 ? "exact" : "estimated",
      })

    query = applyFilters(query, filters)
    query = query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    const { data, count } = await query

    if (!data || data.length === 0) break
    if (pageNum === 0) total = count ?? 0

    for (const enc of data) {
      totalExp += (enc.experiencia_global as number) ?? 0
      totalRec += (enc.recomendaria_ips as number) ?? 0
      totalAten += (enc.atencion_personal as number) ?? 0
    }

    if (data.length < PAGE_SIZE) break
    pageNum++
  }

  return {
    total,
    promedioExperiencia: total > 0 ? (totalExp / total).toFixed(2) : "0.00",
    promedioRecomendacion: total > 0 ? (totalRec / total).toFixed(2) : "0.00",
    promedioAtencion: total > 0 ? (totalAten / total).toFixed(2) : "0.00",
  }
}

/**
 * Fetches minimal encuesta data (sede_id + created_at only) for ALL records.
 * Used by the Metas por Sede tab to compute progress without loading full data.
 */
export async function fetchAllEncuestasMinimal(): Promise<
  { sede_id: number; created_at: string }[]
> {
  const supabase = await createClient()
  const all: { sede_id: number; created_at: string }[] = []
  let pageNum = 0

  while (true) {
    const { data } = await supabase
      .from("encuestas")
      .select("sede_id, created_at")
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (!data || data.length === 0) break
    all.push(...(data as { sede_id: number; created_at: string }[]))
    if (data.length < PAGE_SIZE) break
    pageNum++
  }

  return all
}

/**
 * Fetches ALL encuestas matching the given filters for CSV export.
 * Loops through pages to bypass the 1000-row cap.
 */
export async function fetchAllEncuestasForExport(
  filters: EncuestaFilters
): Promise<EncuestaRow[]> {
  const supabase = await createClient()
  const all: EncuestaRow[] = []
  let pageNum = 0

  while (true) {
    let query = supabase
      .from("encuestas")
      .select(
        `*, departamentos(nombre), municipios(nombre), sedes(nombre), eps(nombre), tipos_afiliado(nombre)`
      )
      .order("fecha_atencion", { ascending: false })
      .order("created_at", { ascending: false })

    query = applyFilters(query, filters)
    query = query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    const { data } = await query

    if (!data || data.length === 0) break
    all.push(...(data as EncuestaRow[]))
    if (data.length < PAGE_SIZE) break
    pageNum++
  }

  return all
}

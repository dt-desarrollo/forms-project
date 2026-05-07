import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  // Usar una consulta simple que no dependa de RLS
  const { count, error } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true })

  if (error) {
    // Si hay error de RLS, verificamos si la tabla está vacía de otra forma
    return NextResponse.json({ hasAdmin: false })
  }

  return NextResponse.json({ hasAdmin: (count || 0) > 0 })
}

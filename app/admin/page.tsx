import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/admin/logout-button"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import {
  fetchEncuestasPage,
  fetchEncuestasStats,
  fetchAllEncuestasMinimal,
} from "@/app/admin/actions"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Verificar si es admin
  const { data: adminData } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!adminData) {
    redirect("/auth/login")
  }

  // Fetch everything in parallel: first page + stats over all records + minimal sede data
  const [
    { data: encuestasInicial, count: totalCount },
    statsInicial,
    sedeEncuestasData,
    { data: sedes },
    { data: sedesMetas },
    { data: departamentos },
    { data: municipios },
    { data: sedesCompletas },
    { data: epsData },
  ] = await Promise.all([
    fetchEncuestasPage({}, 1, 10),
    fetchEncuestasStats({}),
    fetchAllEncuestasMinimal(),
    supabase.from("sedes").select("id, nombre").order("nombre"),
    supabase.from("sedes_metas").select(`*, sedes(nombre)`),
    supabase.from("departamentos").select("id, nombre").order("nombre"),
    supabase
      .from("municipios")
      .select("id, nombre, departamento_id, departamentos(nombre)")
      .order("nombre"),
    supabase
      .from("sedes")
      .select("id, nombre, municipio_id, activo, municipios(nombre, departamento_id)")
      .order("nombre"),
    supabase.from("eps").select("id, nombre, activo").order("nombre"),
  ])

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Panel de Resultados
            </h1>
            <p className="text-muted-foreground">
              Estadísticas y resultados de las encuestas de satisfacción
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/encuesta">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ir a Encuesta
              </Link>
            </Button>
            <LogoutButton />
          </div>
        </div>

        <AdminDashboard
          initialEncuestas={encuestasInicial}
          initialTotal={totalCount}
          initialStats={statsInicial}
          sedeEncuestasData={sedeEncuestasData}
          sedes={sedes || []}
          sedesMetas={sedesMetas || []}
          departamentos={departamentos || []}
          municipios={(municipios || []) as any}
          sedesCompletas={(sedesCompletas || []) as any}
          eps={(epsData || []) as any}
        />
      </div>
    </main>
  )
}

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/admin/logout-button"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

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

  // Obtener encuestas con información de ubicación, EPS y tipo afiliado
  const { data: encuestas, error: encuestasError } = await supabase
    .from("encuestas")
    .select(`
      *,
      departamentos(nombre),
      municipios(nombre),
      sedes(nombre),
      eps(nombre),
      tipos_afiliado(nombre)
    `)
    .order("created_at", { ascending: false })

  if (encuestasError) {
    console.error("Error fetching surveys:", encuestasError)
  }

  // Obtener lista de sedes
  const { data: sedes, error: sedesError } = await supabase
    .from("sedes")
    .select("id, nombre")
    .order("nombre")

  if (sedesError) {
    console.error("Error fetching sedes:", sedesError)
  }

  // Obtener metas por sede
  const { data: sedesMetas, error: metasError } = await supabase
    .from("sedes_metas")
    .select(`
      *,
      sedes(nombre)
    `)

  if (metasError) {
    console.error("Error fetching metas:", metasError)
  }

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
          encuestas={encuestas || []} 
          sedes={sedes || []}
          sedesMetas={sedesMetas || []}
        />
      </div>
    </main>
  )
}

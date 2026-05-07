import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function GraciasPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Gracias por su respuesta
            </h1>
            <p className="text-muted-foreground">
              Su encuesta ha sido enviada exitosamente. Su opinión es muy importante para mejorar nuestros servicios.
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href="/encuesta">
              Realizar otra encuesta
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

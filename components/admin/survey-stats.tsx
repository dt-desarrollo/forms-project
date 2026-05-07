import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Star, ThumbsUp, Users } from "lucide-react"

interface StatsProps {
  stats: {
    total: number
    promedioExperiencia: string
    promedioRecomendacion: string
    promedioAtencion: string
  }
}

export function SurveyStats({ stats }: StatsProps) {
  const statCards = [
    {
      title: "Total Encuestas",
      value: stats.total.toString(),
      description: "Encuestas completadas",
      icon: ClipboardList,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Experiencia Global",
      value: stats.promedioExperiencia,
      description: "Promedio de 1-5",
      icon: Star,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Recomendación",
      value: stats.promedioRecomendacion,
      description: "Promedio de 1-4",
      icon: ThumbsUp,
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Atención Personal",
      value: stats.promedioAtencion,
      description: "Promedio de 1-4",
      icon: Users,
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { ClipboardList } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Encuesta {
  id: string
  fecha_atencion: string
  eps: string
  tipo_afiliado: string
  experiencia_global: number
  recomendaria_ips: number
  created_at: string
  departamentos: { nombre: string } | null
  municipios: { nombre: string } | null
  sedes: { nombre: string } | null
}

interface SurveyTableProps {
  encuestas: Encuesta[]
}

function getRatingBadge(value: number, max: number = 4) {
  const percentage = (value / max) * 100
  if (percentage >= 75) {
    return <Badge variant="default" className="bg-emerald-600">Excelente</Badge>
  } else if (percentage >= 50) {
    return <Badge variant="default" className="bg-blue-600">Bueno</Badge>
  } else if (percentage >= 25) {
    return <Badge variant="secondary">Regular</Badge>
  } else {
    return <Badge variant="destructive">Malo</Badge>
  }
}

export function SurveyTable({ encuestas }: SurveyTableProps) {
  if (!encuestas || encuestas.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <ClipboardList className="h-5 w-5" />
        </EmptyMedia>
        <EmptyTitle>No hay encuestas</EmptyTitle>
        <EmptyDescription>
          Aún no se han registrado encuestas en el sistema.
        </EmptyDescription>
      </Empty>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha Atención</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>EPS</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Experiencia</TableHead>
            <TableHead>Recomienda</TableHead>
            <TableHead className="text-right">Registrado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {encuestas.map((encuesta) => (
            <TableRow key={encuesta.id}>
              <TableCell className="font-medium">
                {format(new Date(encuesta.fecha_atencion), "dd MMM yyyy", { locale: es })}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {encuesta.sedes?.nombre || "N/A"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {encuesta.municipios?.nombre}, {encuesta.departamentos?.nombre}
                  </span>
                </div>
              </TableCell>
              <TableCell>{encuesta.eps}</TableCell>
              <TableCell>
                <Badge variant="outline">{encuesta.tipo_afiliado}</Badge>
              </TableCell>
              <TableCell>{getRatingBadge(encuesta.experiencia_global, 5)}</TableCell>
              <TableCell>{getRatingBadge(encuesta.recomendaria_ips, 4)}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {format(new Date(encuesta.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

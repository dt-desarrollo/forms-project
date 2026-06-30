"use client"

import { useState, useMemo, useEffect, useTransition, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { AdminConfig } from "@/components/admin/admin-config"
import {
  ClipboardList,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Target,
  Star,
  ThumbsUp,
  Users,
  Search,
  Settings,
  Loader2,
} from "lucide-react"
import { format, parseISO, startOfWeek, endOfWeek, differenceInWeeks, addWeeks, startOfMonth, endOfMonth, differenceInCalendarMonths } from "date-fns"
import { es } from "date-fns/locale"
import {
  fetchEncuestasPage,
  fetchEncuestasStats,
  fetchAllEncuestasForExport,
  type EncuestaFilters,
  type StatsResult,
  type EncuestaRow,
} from "@/app/admin/actions"

/**
 * Renders a timestamp string client-side only to avoid server/client timezone
 * hydration mismatches. The server renders an empty string; the client fills
 * it in after mount. suppressHydrationWarning suppresses the harmless diff.
 */
function ClientTimestamp({ iso, fmt = "dd/MM/yyyy HH:mm" }: { iso: string; fmt?: string }) {
  const [text, setText] = useState("")
  useEffect(() => {
    setText(format(parseISO(iso), fmt, { locale: es }))
  }, [iso, fmt])
  return <span suppressHydrationWarning>{text}</span>
}

// Re-export EncuestaRow as Encuesta for internal use
type Encuesta = EncuestaRow

interface Sede {
  id: number
  nombre: string
}

interface SedeMeta {
  id: number
  sede_id: number
  meta_total: number
  fecha_inicio: string
  fecha_fin: string
  sedes: { nombre: string } | null
}

interface MunicipioConDepto {
  id: number
  nombre: string
  departamento_id: number
  departamentos: { nombre: string } | null
}

interface SedeCompleta {
  id: number
  nombre: string
  municipio_id: number
  activo: boolean
  municipios: { nombre: string; departamento_id: number } | null
}

interface Departamento {
  id: number
  nombre: string
}

interface AdminDashboardProps {
  initialEncuestas: Encuesta[]
  initialTotal: number
  initialStats: StatsResult
  /** Minimal records (sede_id + created_at) for all encuestas — used by the Metas tab */
  sedeEncuestasData: { sede_id: number; created_at: string }[]
  sedes: Sede[]
  sedesMetas: SedeMeta[]
  departamentos: Departamento[]
  municipios: MunicipioConDepto[]
  sedesCompletas: SedeCompleta[]
}

const ITEMS_PER_PAGE = 10

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

function getTotalWeeks(startDate: Date, endDate: Date): number {
  return differenceInWeeks(endDate, startDate) + 1
}

export function AdminDashboard({
  initialEncuestas,
  initialTotal,
  initialStats,
  sedeEncuestasData,
  sedes,
  sedesMetas,
  departamentos,
  municipios,
  sedesCompletas,
}: AdminDashboardProps) {
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("")
  const [filtroFechaFin, setFiltroFechaFin] = useState("")
  const [filtroSede, setFiltroSede] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [busquedaSede, setBusquedaSede] = useState("")

  // Server-driven state
  const [encuestasPage, setEncuestasPage] = useState<Encuesta[]>(initialEncuestas)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [stats, setStats] = useState<StatsResult>(initialStats)

  // Transition states
  const [isTablePending, startTableTransition] = useTransition()
  const [isStatsPending, startStatsTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const currentFilters = useCallback((): EncuestaFilters => ({
    fechaInicio: filtroFechaInicio || undefined,
    fechaFin: filtroFechaFin || undefined,
    sedeId: filtroSede !== "all" ? parseInt(filtroSede) : undefined,
  }), [filtroFechaInicio, filtroFechaFin, filtroSede])

  /** Fetch a specific page without refreshing stats */
  const loadPage = useCallback((page: number, filters: EncuestaFilters) => {
    startTableTransition(async () => {
      const result = await fetchEncuestasPage(filters, page, ITEMS_PER_PAGE)
      setEncuestasPage(result.data)
      setTotalCount(result.count)
      setCurrentPage(page)
    })
  }, [])

  /** Fetch new page + new stats when filters change */
  const applyFilters = useCallback((filters: EncuestaFilters) => {
    startTableTransition(async () => {
      const result = await fetchEncuestasPage(filters, 1, ITEMS_PER_PAGE)
      setEncuestasPage(result.data)
      setTotalCount(result.count)
      setCurrentPage(1)
    })
    startStatsTransition(async () => {
      const newStats = await fetchEncuestasStats(filters)
      setStats(newStats)
    })
  }, [])

  // Re-fetch when filters change
  useEffect(() => {
    applyFilters(currentFilters())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroFechaInicio, filtroFechaFin, filtroSede])

  const handlePageChange = (page: number) => {
    loadPage(page, currentFilters())
  }

  const limpiarFiltros = () => {
    setFiltroFechaInicio("")
    setFiltroFechaFin("")
    setFiltroSede("all")
  }

  // Calcular progreso por sede usando sedeEncuestasData (todos los registros, sin límite)
  const progresoSedes = useMemo(() => {
    const hoy = new Date()

    return sedesMetas.map((meta) => {
      const encuestasSede = sedeEncuestasData.filter((enc) => enc.sede_id === meta.sede_id)

      const metaMensual = meta.meta_total
      const fechaInicio = new Date(meta.fecha_inicio)
      const fechaFin = new Date(meta.fecha_fin)
      const totalMeses = differenceInCalendarMonths(fechaFin, fechaInicio) + 1
      const metaAnual = metaMensual * totalMeses

      const inicioMesActual = startOfMonth(hoy)
      const finMesActual = endOfMonth(hoy)
      const realizadasMesActual = encuestasSede.filter((enc) => {
        const fecha = new Date(enc.created_at)
        return fecha >= inicioMesActual && fecha <= finMesActual
      }).length

      const totalRealizadasAnual = encuestasSede.length
      const pendientesAnual = Math.max(0, metaAnual - totalRealizadasAnual)
      const porcentajeMensual = metaMensual > 0 ? (realizadasMesActual / metaMensual) * 100 : 0

      const totalSemanas = getTotalWeeks(fechaInicio, fechaFin)
      const semanasPorMes = totalMeses > 0 ? totalSemanas / totalMeses : 1
      const metaSemanal = Math.ceil(metaMensual / semanasPorMes)

      const semanas: { semana: number; realizadas: number; meta: number; fechaInicio: Date; fechaFin: Date }[] = []
      const primerLunes = startOfWeek(fechaInicio, { weekStartsOn: 1 })
      for (let i = 0; i < totalSemanas; i++) {
        const semanaInicio = addWeeks(primerLunes, i)
        const semanaFin = endOfWeek(semanaInicio, { weekStartsOn: 1 })
        const encuestasSemana = encuestasSede.filter((enc) => {
          const fecha = new Date(enc.created_at)
          return fecha >= semanaInicio && fecha <= semanaFin
        })
        semanas.push({
          semana: i + 1,
          realizadas: encuestasSemana.length,
          meta: metaSemanal,
          fechaInicio: semanaInicio,
          fechaFin: semanaFin,
        })
      }

      return {
        sede: meta.sedes?.nombre || "Desconocida",
        sedeId: meta.sede_id,
        metaTotal: metaAnual,
        metaMensual,
        realizadasMesActual,
        realizadas: totalRealizadasAnual,
        pendientes: pendientesAnual,
        porcentaje: porcentajeMensual.toFixed(1),
        semanas,
      }
    })
  }, [sedeEncuestasData, sedesMetas])

  const progresoSedesFiltradas = useMemo(() => {
    if (!busquedaSede.trim()) return progresoSedes
    const termino = busquedaSede.toLowerCase().trim()
    return progresoSedes.filter((p) => p.sede.toLowerCase().includes(termino))
  }, [progresoSedes, busquedaSede])

  // Exportar a CSV — fetches ALL records from server
  const exportarExcel = async () => {
    setIsExporting(true)
    try {
      const allEncuestas = await fetchAllEncuestasForExport(currentFilters())

      const headers = [
        "ID",
        "Fecha Atención",
        "Departamento",
        "Municipio",
        "Sede",
        "EPS",
        "Tipo Afiliado",
        "Atención Personal",
        "Claridad Información",
        "Servicio Humanizado",
        "Recomendaciones Uso Seguro",
        "Medicamentos Oportunos",
        "Localización Acceso",
        "Horario Atención",
        "Tiempo Solicitar Medicamentos",
        "Comodidad Limpieza",
        "Experiencia Global",
        "Recomendaría IPS",
        "Comentarios",
        "Fecha Registro",
      ]

      const rows = allEncuestas.map((enc) => [
        enc.id,
        enc.fecha_atencion,
        enc.departamentos?.nombre || "",
        enc.municipios?.nombre || "",
        enc.sedes?.nombre || "",
        enc.eps?.nombre || "",
        enc.tipos_afiliado?.nombre || "",
        enc.atencion_personal || "",
        enc.claridad_informacion || "",
        enc.servicio_humanizado || "",
        enc.recomendaciones_uso_seguro || "",
        enc.medicamentos_oportunos || "",
        enc.localizacion_acceso || "",
        enc.horario_atencion || "",
        enc.tiempo_solicitar_medicamentos || "",
        enc.comodidad_limpieza || "",
        enc.experiencia_global || "",
        enc.recomendaria_ips || "",
        enc.comentarios || "",
        enc.created_at,
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `encuestas_${format(new Date(), "yyyy-MM-dd")}.csv`
      link.click()
    } finally {
      setIsExporting(false)
    }
  }

  // Exportar progreso por sede
  const exportarProgresoSedes = () => {
    const headers = ["Sede", "Meta Total", "Realizadas", "Pendientes", "Porcentaje"]
    const rows = progresoSedes.map((p) => [
      p.sede,
      p.metaTotal,
      p.realizadas,
      p.pendientes,
      `${p.porcentaje}%`,
    ])
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `progreso_sedes_${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
  }

  const exportarProgresoSemanal = (sedeId: number) => {
    const progreso = progresoSedes.find((p) => p.sedeId === sedeId)
    if (!progreso) return
    const headers = ["Semana", "Fecha Inicio", "Fecha Fin", "Meta", "Realizadas", "Diferencia"]
    const rows = progreso.semanas.map((s) => [
      `Semana ${s.semana}`,
      format(s.fechaInicio, "dd/MM/yyyy"),
      format(s.fechaFin, "dd/MM/yyyy"),
      s.meta,
      s.realizadas,
      s.realizadas - s.meta,
    ])
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `progreso_semanal_${progreso.sede}_${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
  }

  const statCards = [
    {
      title: "Total Encuestas",
      value: isStatsPending ? "..." : stats.total.toString(),
      description: "Encuestas completadas",
      icon: ClipboardList,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Experiencia Global",
      value: isStatsPending ? "..." : stats.promedioExperiencia,
      description: "Promedio de 1-5",
      icon: Star,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Recomendación",
      value: isStatsPending ? "..." : stats.promedioRecomendacion,
      description: "Promedio de 1-4",
      icon: ThumbsUp,
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Atención Personal",
      value: isStatsPending ? "..." : stats.promedioAtencion,
      description: "Promedio de 1-4",
      icon: Users,
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
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

      <Tabs defaultValue="encuestas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="encuestas">Encuestas</TabsTrigger>
          <TabsTrigger value="metas">Metas por Sede</TabsTrigger>
          <TabsTrigger value="configuracion">
            <Settings data-icon="inline-start" />
            Configuracion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encuestas" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
                  <Input
                    id="fecha-inicio"
                    type="date"
                    value={filtroFechaInicio}
                    onChange={(e) => setFiltroFechaInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha-fin">Fecha Fin</Label>
                  <Input
                    id="fecha-fin"
                    type="date"
                    value={filtroFechaFin}
                    onChange={(e) => setFiltroFechaFin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sede">Sede</Label>
                  <Select
                    value={filtroSede}
                    onValueChange={(value) => setFiltroSede(value)}
                  >
                    <SelectTrigger id="sede">
                      <SelectValue placeholder="Todas las sedes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sedes</SelectItem>
                      {sedes.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id.toString()}>
                          {sede.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={limpiarFiltros} className="flex-1">
                    Limpiar
                  </Button>
                  <Button onClick={exportarExcel} disabled={isExporting} className="flex-1">
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isExporting ? "Exportando..." : "Exportar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de encuestas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Encuestas
                {isTablePending && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription>
                Mostrando {encuestasPage.length} de {totalCount} encuestas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {encuestasPage.length === 0 && !isTablePending ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <ClipboardList className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>No hay encuestas</EmptyTitle>
                  <EmptyDescription>
                    No se encontraron encuestas con los filtros aplicados.
                  </EmptyDescription>
                </Empty>
              ) : (
                <>
                  <div className={`overflow-x-auto transition-opacity ${isTablePending ? "opacity-50" : "opacity-100"}`}>
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
                        {encuestasPage.map((encuesta) => (
                          <TableRow key={encuesta.id}>
                            <TableCell className="font-medium">
                              {format(parseISO(encuesta.fecha_atencion), "dd MMM yyyy", { locale: es })}
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
                            <TableCell>{encuesta.eps?.nombre || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{encuesta.tipos_afiliado?.nombre || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>{getRatingBadge(encuesta.experiencia_global, 5)}</TableCell>
                            <TableCell>{getRatingBadge(encuesta.recomendaria_ips, 4)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              <ClientTimestamp iso={encuesta.created_at} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || isTablePending}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || isTablePending}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Progreso por Sede
                  </CardTitle>
                  <CardDescription>
                    Seguimiento de metas anuales por sede ({progresoSedesFiltradas.length} de {progresoSedes.length} sedes). El progreso y el contador muestran el mes actual; completadas y pendientes son totales anuales.
                  </CardDescription>
                </div>
                <Button onClick={exportarProgresoSedes} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Resumen
                </Button>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar sede..."
                  value={busquedaSede}
                  onChange={(e) => setBusquedaSede(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {progresoSedes.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <Target className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin metas configuradas</EmptyTitle>
                  <EmptyDescription>
                    No hay metas de encuestas configuradas para las sedes.
                  </EmptyDescription>
                </Empty>
              ) : progresoSedesFiltradas.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <Search className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin resultados</EmptyTitle>
                  <EmptyDescription>
                    No se encontraron sedes que coincidan con &quot;{busquedaSede}&quot;.
                  </EmptyDescription>
                </Empty>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {progresoSedesFiltradas.map((progreso) => (
                    <AccordionItem key={progreso.sedeId} value={progreso.sedeId}>
                      <AccordionTrigger className="hover:no-underline px-4 rounded-lg hover:bg-muted/50">
                        <div className="flex flex-1 items-center justify-between pr-4">
                          <div className="text-left">
                            <p className="font-semibold text-sm">{progreso.sede}</p>
                            <p className="text-xs text-muted-foreground">
                              {progreso.realizadasMesActual} de {progreso.metaMensual} encuestas (mes actual)
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-3 text-xs">
                              <span className="text-emerald-600 font-medium">Completadas (año): {progreso.realizadas}</span>
                              <span className="text-amber-600 font-medium">Pendientes (año): {progreso.pendientes}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-emerald-600 transition-all"
                                  style={{ width: `${Math.min(100, parseFloat(progreso.porcentaje))}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium w-10 text-right">{progreso.porcentaje}%</span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4">
                        <div className="flex justify-between items-center mb-3 sm:hidden text-xs">
                          <span className="text-emerald-600 font-medium">Completadas (año): {progreso.realizadas}</span>
                          <span className="text-amber-600 font-medium">Pendientes (año): {progreso.pendientes}</span>
                        </div>
                        <div className="flex justify-end mb-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportarProgresoSemanal(progreso.sedeId)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Exportar semanal
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Semana</TableHead>
                                <TableHead>Periodo</TableHead>
                                <TableHead className="text-center">Meta</TableHead>
                                <TableHead className="text-center">Realizadas</TableHead>
                                <TableHead className="text-center">Diferencia</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {progreso.semanas.map((semana) => {
                                const diferencia = semana.realizadas - semana.meta
                                const grupoColor = [
                                  "bg-blue-500",
                                  "bg-emerald-500",
                                  "bg-amber-500",
                                  "bg-rose-500",
                                  "bg-violet-500",
                                  "bg-cyan-500",
                                ][Math.floor((semana.semana - 1) / 4) % 6]
                                return (
                                  <TableRow key={semana.semana}>
                                    <TableCell className="font-medium">
                                      <span className="flex items-center gap-2">
                                        <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${grupoColor}`} />
                                        Semana {semana.semana}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {format(semana.fechaInicio, "dd/MM")} - {format(semana.fechaFin, "dd/MM")}
                                    </TableCell>
                                    <TableCell className="text-center">{semana.meta}</TableCell>
                                    <TableCell className="text-center">{semana.realizadas}</TableCell>
                                    <TableCell className="text-center">
                                      <span className={diferencia >= 0 ? "text-emerald-600" : "text-red-600"}>
                                        {diferencia >= 0 ? "+" : ""}{diferencia}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {diferencia >= 0 ? (
                                        <Badge variant="default" className="bg-emerald-600">Cumplida</Badge>
                                      ) : (
                                        <Badge variant="destructive">Pendiente</Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracion">
          <AdminConfig
            departamentos={departamentos}
            municipios={municipios}
            sedes={sedesCompletas}
            sedesMetas={sedesMetas}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

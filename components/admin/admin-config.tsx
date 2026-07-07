"use client"

import { useState, useTransition, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { MapPin, Building2, Landmark, Plus, Pencil, Search, Target, CalendarDays, CheckCircle2, AlertCircle, HeartPulse } from "lucide-react"
import { toast } from "sonner"
import type { Departamento, Municipio, Sede, Eps } from "@/lib/types"
import { crearEps, toggleEpsActivo } from "@/app/admin/actions"

interface SedeMeta {
  id: number
  sede_id: number
  meta_total: number
  fecha_inicio: string
  fecha_fin: string
}

interface AdminConfigProps {
  departamentos: Departamento[]
  municipios: MunicipioConDepto[]
  sedes: SedeCompleta[]
  sedesMetas: SedeMeta[]
  eps: Eps[]
}

interface MunicipioConDepto extends Municipio {
  departamentos: { nombre: string } | null
}

interface SedeCompleta extends Sede {
  municipios: { nombre: string; departamento_id: number } | null
  departamentos?: { nombre: string } | null
}

// ---- Departamentos ----

function DepartamentosTab({ departamentos: initialDeps }: { departamentos: Departamento[] }) {
  const supabase = createClient()
  const [departamentos, setDepartamentos] = useState(initialDeps)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [isPending, startTransition] = useTransition()

  const depsFiltrados = departamentos.filter((d) =>
    d.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleCrear = () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    if (departamentos.some((d) => d.nombre.toLowerCase() === nombre.toLowerCase())) {
      toast.error("Ya existe un departamento con ese nombre")
      return
    }

    startTransition(async () => {
      const { data, error } = await supabase
        .from("departamentos")
        .insert({ nombre })
        .select()
        .single()

      if (error) {
        toast.error("Error al crear departamento: " + error.message)
        return
      }
      setDepartamentos((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevoNombre("")
      toast.success(`Departamento "${nombre}" creado exitosamente`)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Nuevo departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nuevo-dep">Nombre</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="nuevo-dep"
                  placeholder="Ej: Santander"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrear()}
                />
                <Button onClick={handleCrear} disabled={!nuevoNombre.trim() || isPending}>
                  {isPending ? <Spinner className="mr-2 size-4" /> : <Plus data-icon="inline-start" />}
                  Crear
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Departamentos ({departamentos.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {depsFiltrados.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon"><Landmark className="size-5" /></EmptyMedia>
              <EmptyTitle>Sin departamentos</EmptyTitle>
              <EmptyDescription>No se encontraron departamentos.</EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depsFiltrados.map((dep) => (
                  <TableRow key={dep.id}>
                    <TableCell className="font-medium">{dep.nombre}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{dep.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Municipios ----

function MunicipiosTab({
  municipios,
  departamentos,
  onMunicipioCreado,
}: {
  municipios: MunicipioConDepto[]
  departamentos: Departamento[]
  onMunicipioCreado: (nuevo: MunicipioConDepto) => void
}) {
  const supabase = createClient()
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [deptoSeleccionado, setDeptoSeleccionado] = useState<string>("")
  const [busqueda, setBusqueda] = useState("")
  const [filtroDep, setFiltroDep] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  const munisFiltrados = municipios.filter((m) => {
    const matchBusqueda = m.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchDep = filtroDep === "all" || m.departamento_id === parseInt(filtroDep)
    return matchBusqueda && matchDep
  })

  const handleCrear = () => {
    const nombre = nuevoNombre.trim()
    if (!nombre || !deptoSeleccionado) return

    const deptoId = parseInt(deptoSeleccionado)
    if (municipios.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase() && m.departamento_id === deptoId)) {
      toast.error("Ya existe un municipio con ese nombre en ese departamento")
      return
    }

    startTransition(async () => {
      const { data, error } = await supabase
        .from("municipios")
        .insert({ nombre, departamento_id: deptoId })
        .select()
        .single()

      if (error) {
        toast.error("Error al crear municipio: " + error.message)
        return
      }

      const deptoNombre = departamentos.find((d) => d.id === deptoId)?.nombre ?? ""
      const newMuni: MunicipioConDepto = {
        ...data,
        departamentos: { nombre: deptoNombre },
      }
      onMunicipioCreado(newMuni)
      setNuevoNombre("")
      setDeptoSeleccionado("")
      toast.success(`Municipio "${nombre}" creado exitosamente`)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Nuevo municipio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Departamento</FieldLabel>
              <Select value={deptoSeleccionado} onValueChange={setDeptoSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento..." />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="nuevo-muni">Nombre</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="nuevo-muni"
                  placeholder="Ej: Bucaramanga"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrear()}
                />
                <Button
                  onClick={handleCrear}
                  disabled={!nuevoNombre.trim() || !deptoSeleccionado || isPending}
                >
                  {isPending ? <Spinner className="mr-2 size-4" /> : <Plus data-icon="inline-start" />}
                  Crear
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Municipios ({municipios.length})</CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar municipio..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroDep} onValueChange={setFiltroDep}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {munisFiltrados.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon"><MapPin className="size-5" /></EmptyMedia>
              <EmptyTitle>Sin municipios</EmptyTitle>
              <EmptyDescription>No se encontraron municipios.</EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {munisFiltrados.map((muni) => (
                  <TableRow key={muni.id}>
                    <TableCell className="font-medium">{muni.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {muni.departamentos?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{muni.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Sedes ----

interface EditSedeDialogProps {
  sede: SedeCompleta | null
  open: boolean
  onClose: () => void
  onSaved: (updated: SedeCompleta) => void
}

function EditSedeDialog({ sede, open, onClose, onSaved }: EditSedeDialogProps) {
  const supabase = createClient()
  const [nombre, setNombre] = useState(sede?.nombre ?? "")
  const [isPending, startTransition] = useTransition()

  // Sync name when sede changes
  useState(() => {
    setNombre(sede?.nombre ?? "")
  })

  const handleSave = () => {
    const nombreTrimmed = nombre.trim()
    if (!nombreTrimmed || !sede) return

    startTransition(async () => {
      const { error } = await supabase
        .from("sedes")
        .update({ nombre: nombreTrimmed })
        .eq("id", sede.id)

      if (error) {
        toast.error("Error al actualizar sede: " + error.message)
        return
      }
      onSaved({ ...sede, nombre: nombreTrimmed })
      toast.success("Sede actualizada")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar sede</DialogTitle>
          <DialogDescription>
            Modifica el nombre de la sede. No se puede eliminar porque está asociada a encuestas.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-sede-nombre">Nombre</FieldLabel>
            <Input
              id="edit-sede-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!nombre.trim() || isPending}>
            {isPending && <Spinner className="mr-2 size-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SedesTab({
  sedes: initialSedes,
  municipios,
  departamentos,
  onSedeCreada,
}: {
  sedes: SedeCompleta[]
  municipios: MunicipioConDepto[]
  departamentos: Departamento[]
  onSedeCreada: (nueva: SedeCompleta) => void
}) {
  const supabase = createClient()
  const [sedes, setSedes] = useState(initialSedes)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [muniSeleccionado, setMuniSeleccionado] = useState<string>("")
  const [deptoFiltroCrear, setDeptoFiltroCrear] = useState<string>("")
  const [busqueda, setBusqueda] = useState("")
  const [filtroDep, setFiltroDep] = useState<string>("all")
  const [editingSede, setEditingSede] = useState<SedeCompleta | null>(null)
  const [isPending, startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const munisPorDepto = municipios.filter(
    (m) => !deptoFiltroCrear || m.departamento_id === parseInt(deptoFiltroCrear)
  )

  const sedesFiltradas = sedes.filter((s) => {
    const matchBusqueda = s.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchDep =
      filtroDep === "all" ||
      s.municipios?.departamento_id === parseInt(filtroDep)
    return matchBusqueda && matchDep
  })

  const handleCrear = () => {
    const nombre = nuevoNombre.trim()
    if (!nombre || !muniSeleccionado) return

    const muniId = parseInt(muniSeleccionado)
    if (sedes.some((s) => s.nombre.toLowerCase() === nombre.toLowerCase() && s.municipio_id === muniId)) {
      toast.error("Ya existe una sede con ese nombre en ese municipio")
      return
    }

    startTransition(async () => {
      const { data, error } = await supabase
        .from("sedes")
        .insert({ nombre, municipio_id: muniId, activo: true })
        .select()
        .single()

      if (error) {
        toast.error("Error al crear sede: " + error.message)
        return
      }

      const muni = municipios.find((m) => m.id === muniId)
      const newSede: SedeCompleta = {
        ...data,
        municipios: muni
          ? { nombre: muni.nombre, departamento_id: muni.departamento_id }
          : null,
      }
      setSedes((prev) => [...prev, newSede].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      onSedeCreada(newSede)
      setNuevoNombre("")
      setMuniSeleccionado("")
      setDeptoFiltroCrear("")
      toast.success(`Sede "${nombre}" creada exitosamente`)
    })
  }

  const handleToggleActivo = (sede: SedeCompleta) => {
    setTogglingId(sede.id)
    startTransition(async () => {
      const { error } = await supabase
        .from("sedes")
        .update({ activo: !sede.activo })
        .eq("id", sede.id)

      if (error) {
        toast.error("Error al actualizar estado: " + error.message)
        setTogglingId(null)
        return
      }
      setSedes((prev) =>
        prev.map((s) => (s.id === sede.id ? { ...s, activo: !s.activo } : s))
      )
      toast.success(
        !sede.activo ? `Sede "${sede.nombre}" habilitada` : `Sede "${sede.nombre}" deshabilitada`
      )
      setTogglingId(null)
    })
  }

  const handleEditSaved = (updated: SedeCompleta) => {
    setSedes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Nueva sede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Departamento</FieldLabel>
              <Select
                value={deptoFiltroCrear}
                onValueChange={(v) => {
                  setDeptoFiltroCrear(v)
                  setMuniSeleccionado("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento..." />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Municipio</FieldLabel>
              <Select
                value={muniSeleccionado}
                onValueChange={setMuniSeleccionado}
                disabled={!deptoFiltroCrear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar municipio..." />
                </SelectTrigger>
                <SelectContent>
                  {munisPorDepto.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="nuevo-sede">Nombre de la sede</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="nuevo-sede"
                  placeholder="Ej: Bucaramanga Norte"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrear()}
                />
                <Button
                  onClick={handleCrear}
                  disabled={!nuevoNombre.trim() || !muniSeleccionado || isPending}
                >
                  {isPending ? <Spinner className="mr-2 size-4" /> : <Plus data-icon="inline-start" />}
                  Crear
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sedes ({sedes.length})</CardTitle>
          <CardDescription>
            Puedes editar el nombre y habilitar/deshabilitar. Las sedes deshabilitadas no aparecen en la encuesta.
          </CardDescription>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar sede..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroDep} onValueChange={setFiltroDep}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sedesFiltradas.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon"><Building2 className="size-5" /></EmptyMedia>
              <EmptyTitle>Sin sedes</EmptyTitle>
              <EmptyDescription>No se encontraron sedes.</EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Municipio</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sedesFiltradas.map((sede) => (
                  <TableRow key={sede.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{sede.nombre}</span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          {sede.municipios?.nombre ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {sede.municipios?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={sede.activo}
                          onCheckedChange={() => handleToggleActivo(sede)}
                          disabled={togglingId === sede.id}
                          aria-label={sede.activo ? "Deshabilitar sede" : "Habilitar sede"}
                        />
                        <Badge
                          variant={sede.activo ? "default" : "secondary"}
                          className={sede.activo ? "bg-emerald-600" : ""}
                        >
                          {sede.activo ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSede(sede)}
                      >
                        <Pencil data-icon="inline-start" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditSedeDialog
        sede={editingSede}
        open={!!editingSede}
        onClose={() => setEditingSede(null)}
        onSaved={handleEditSaved}
      />
    </div>
  )
}

// ---- Metas ----

interface MetaFormState {
  sede_id: number
  meta_total: string
  fecha_inicio: string
  fecha_fin: string
}

interface MetaDialogProps {
  open: boolean
  onClose: () => void
  sede: SedeCompleta | null
  existingMeta: SedeMeta | null
  onSaved: (meta: SedeMeta) => void
}

function MetaDialog({ open, onClose, sede, existingMeta, onSaved }: MetaDialogProps) {
  const supabase = createClient()
  const [form, setForm] = useState<MetaFormState>({
    sede_id: sede?.id ?? 0,
    meta_total: existingMeta ? String(existingMeta.meta_total) : "",
    fecha_inicio: existingMeta?.fecha_inicio ?? "",
    fecha_fin: existingMeta?.fecha_fin ?? "",
  })
  const [isPending, startTransition] = useTransition()

  // Sync form when props change
  const isEditing = !!existingMeta

  const handleChange = (field: keyof MetaFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isValid =
    !!form.meta_total &&
    !isNaN(Number(form.meta_total)) &&
    Number(form.meta_total) >= 0 &&
    !!form.fecha_inicio &&
    !!form.fecha_fin &&
    form.fecha_fin >= form.fecha_inicio

  const handleSave = () => {
    if (!isValid || !sede) return

    startTransition(async () => {
      const payload = {
        sede_id: sede.id,
        meta_total: Number(form.meta_total),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
      }

      let result
      if (isEditing && existingMeta) {
        result = await supabase
          .from("sedes_metas")
          .update({ meta_total: payload.meta_total, fecha_inicio: payload.fecha_inicio, fecha_fin: payload.fecha_fin })
          .eq("id", existingMeta.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from("sedes_metas")
          .insert(payload)
          .select()
          .single()
      }

      if (result.error) {
        toast.error("Error al guardar meta: " + result.error.message)
        return
      }

      onSaved(result.data as SedeMeta)
      toast.success(isEditing ? "Meta actualizada" : `Meta creada para "${sede.nombre}"`)
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar meta" : "Crear meta"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Actualiza la meta de encuestas para ${sede?.nombre ?? ""}.`
              : `Define la meta de encuestas para ${sede?.nombre ?? ""}.`}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="meta-total">Meta total de encuestas</FieldLabel>
            <Input
              id="meta-total"
              type="number"
              min={0}
              placeholder="Ej: 250"
              value={form.meta_total}
              onChange={(e) => handleChange("meta_total", e.target.value)}
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="meta-inicio">Fecha de inicio</FieldLabel>
            <Input
              id="meta-inicio"
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => handleChange("fecha_inicio", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="meta-fin">Fecha de fin</FieldLabel>
            <Input
              id="meta-fin"
              type="date"
              value={form.fecha_fin}
              onChange={(e) => handleChange("fecha_fin", e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isPending}>
            {isPending && <Spinner className="mr-2 size-4" />}
            {isEditing ? "Guardar cambios" : "Crear meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MetasTab({
  sedes,
  sedesMetas: initialMetas,
}: {
  sedes: SedeCompleta[]
  sedesMetas: SedeMeta[]
}) {
  const [metas, setMetas] = useState(initialMetas)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<"all" | "con-meta" | "sin-meta">("all")
  const [dialogSede, setDialogSede] = useState<SedeCompleta | null>(null)
  const [dialogMeta, setDialogMeta] = useState<SedeMeta | null>(null)

  const metasBySede = useMemo(() => {
    const map = new Map<number, SedeMeta>()
    metas.forEach((m) => map.set(m.sede_id, m))
    return map
  }, [metas])

  const sedesFiltradas = useMemo(() => {
    return sedes.filter((s) => {
      const matchBusqueda = s.nombre.toLowerCase().includes(busqueda.toLowerCase())
      const tieneMeta = metasBySede.has(s.id)
      const matchEstado =
        filtroEstado === "all" ||
        (filtroEstado === "con-meta" && tieneMeta) ||
        (filtroEstado === "sin-meta" && !tieneMeta)
      return matchBusqueda && matchEstado
    })
  }, [sedes, busqueda, filtroEstado, metasBySede])

  const conMeta = sedes.filter((s) => metasBySede.has(s.id)).length
  const sinMeta = sedes.length - conMeta

  const handleOpenDialog = (sede: SedeCompleta) => {
    const meta = metasBySede.get(sede.id) ?? null
    setDialogSede(sede)
    setDialogMeta(meta)
  }

  const handleSaved = (meta: SedeMeta) => {
    setMetas((prev) => {
      const exists = prev.find((m) => m.id === meta.id)
      if (exists) return prev.map((m) => (m.id === meta.id ? meta : m))
      return [...prev, meta]
    })
    setDialogSede(null)
    setDialogMeta(null)
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Target className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total sedes</p>
              <p className="text-xl font-bold">{sedes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Con meta</p>
              <p className="text-xl font-bold text-emerald-600">{conMeta}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle className="size-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sin meta</p>
              <p className="text-xl font-bold text-amber-600">{sinMeta}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas por sede ({sedesFiltradas.length})</CardTitle>
          <CardDescription>
            Crea o edita la meta anual de encuestas para cada sede.
          </CardDescription>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar sede..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filtroEstado}
              onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="con-meta">Con meta</SelectItem>
                <SelectItem value="sin-meta">Sin meta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sedesFiltradas.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon"><Target className="size-5" /></EmptyMedia>
              <EmptyTitle>Sin resultados</EmptyTitle>
              <EmptyDescription>No se encontraron sedes.</EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sede</TableHead>
                  <TableHead className="hidden sm:table-cell">Municipio</TableHead>
                  <TableHead className="text-center">Meta</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Periodo</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sedesFiltradas.map((sede) => {
                  const meta = metasBySede.get(sede.id)
                  return (
                    <TableRow key={sede.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{sede.nombre}</span>
                          <span className="text-xs text-muted-foreground sm:hidden">
                            {sede.municipios?.nombre ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {sede.municipios?.nombre ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {meta ? (
                          <Badge variant="default" className="bg-emerald-600 tabular-nums">
                            {meta.meta_total.toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-amber-700 bg-amber-100">
                            Sin meta
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-sm text-muted-foreground">
                        {meta ? (
                          <span className="flex items-center justify-center gap-1">
                            <CalendarDays className="size-3" />
                            {meta.fecha_inicio} → {meta.fecha_fin}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={meta ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleOpenDialog(sede)}
                        >
                          {meta ? (
                            <><Pencil data-icon="inline-start" />Editar</>
                          ) : (
                            <><Plus data-icon="inline-start" />Crear</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MetaDialog
        open={!!dialogSede}
        onClose={() => { setDialogSede(null); setDialogMeta(null) }}
        sede={dialogSede}
        existingMeta={dialogMeta}
        onSaved={handleSaved}
      />
    </div>
  )
}

// ---- EPS ----

function EpsTab({ eps: initialEps }: { eps: Eps[] }) {
  const [epsList, setEpsList] = useState(initialEps)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<"all" | "activa" | "inactiva">("all")
  const [isPending, startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const epsFiltradas = epsList.filter((e) => {
    const matchBusqueda = e.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado =
      filtroEstado === "all" ||
      (filtroEstado === "activa" && e.activo) ||
      (filtroEstado === "inactiva" && !e.activo)
    return matchBusqueda && matchEstado
  })

  const handleCrear = () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    if (epsList.some((e) => e.nombre.toLowerCase() === nombre.toLowerCase())) {
      toast.error("Ya existe una EPS con ese nombre")
      return
    }

    startTransition(async () => {
      const { data, error } = await crearEps(nombre)

      if (error) {
        toast.error("Error al crear EPS: " + error)
        return
      }
      if (data) {
        setEpsList((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      }
      setNuevoNombre("")
      toast.success(`EPS "${nombre}" creada exitosamente`)
    })
  }

  const handleToggleActivo = (eps: Eps) => {
    setTogglingId(eps.id)
    startTransition(async () => {
      const { error } = await toggleEpsActivo(eps.id, !eps.activo)

      if (error) {
        toast.error("Error al actualizar estado: " + error)
        setTogglingId(null)
        return
      }
      setEpsList((prev) =>
        prev.map((e) => (e.id === eps.id ? { ...e, activo: !e.activo } : e))
      )
      toast.success(
        !eps.activo ? `EPS "${eps.nombre}" habilitada` : `EPS "${eps.nombre}" deshabilitada`
      )
      setTogglingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Nueva EPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nuevo-eps">Nombre</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="nuevo-eps"
                  placeholder="Ej: SURA"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrear()}
                />
                <Button onClick={handleCrear} disabled={!nuevoNombre.trim() || isPending}>
                  {isPending ? <Spinner className="mr-2 size-4" /> : <Plus data-icon="inline-start" />}
                  Crear
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">EPS ({epsList.length})</CardTitle>
          <CardDescription>
            Puedes habilitar o deshabilitar EPS. Las EPS deshabilitadas no aparecen en la encuesta.
          </CardDescription>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar EPS..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filtroEstado}
              onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="activa">Activas</SelectItem>
                <SelectItem value="inactiva">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {epsFiltradas.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon"><HeartPulse className="size-5" /></EmptyMedia>
              <EmptyTitle>Sin EPS</EmptyTitle>
              <EmptyDescription>No se encontraron EPS con los filtros aplicados.</EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epsFiltradas.map((eps) => (
                  <TableRow key={eps.id}>
                    <TableCell className="font-medium">{eps.nombre}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={eps.activo}
                          onCheckedChange={() => handleToggleActivo(eps)}
                          disabled={togglingId === eps.id}
                          aria-label={eps.activo ? "Deshabilitar EPS" : "Habilitar EPS"}
                        />
                        <Badge
                          variant={eps.activo ? "default" : "secondary"}
                          className={eps.activo ? "bg-emerald-600" : ""}
                        >
                          {eps.activo ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {eps.id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Main component ----

export function AdminConfig({ departamentos, municipios: initialMunicipios, sedes: initialSedes, sedesMetas, eps }: AdminConfigProps) {
  // Elevate municipios state so MunicipiosTab and SedesTab share the same list.
  const [municipios, setMunicipios] = useState(initialMunicipios)
  // Elevate sedes state so SedesTab and MetasTab share the same list.
  const [sedes, setSedes] = useState(initialSedes)

  const handleMunicipioCreado = (nuevo: MunicipioConDepto) => {
    setMunicipios((prev) =>
      [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre))
    )
  }

  const handleSedeCreada = (nueva: SedeCompleta) => {
    setSedes((prev) =>
      [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre))
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Configuracion</h2>
        <p className="text-sm text-muted-foreground">
          Administra los departamentos, municipios, sedes y EPS disponibles en la encuesta.
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="sedes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departamentos">
            <Landmark data-icon="inline-start" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="municipios">
            <MapPin data-icon="inline-start" />
            Municipios
          </TabsTrigger>
          <TabsTrigger value="sedes">
            <Building2 data-icon="inline-start" />
            Sedes
          </TabsTrigger>
          <TabsTrigger value="metas">
            <Target data-icon="inline-start" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="eps">
            <HeartPulse data-icon="inline-start" />
            EPS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departamentos">
          <DepartamentosTab departamentos={departamentos} />
        </TabsContent>
        <TabsContent value="municipios">
          <MunicipiosTab
            municipios={municipios}
            departamentos={departamentos}
            onMunicipioCreado={handleMunicipioCreado}
          />
        </TabsContent>
        <TabsContent value="sedes">
          <SedesTab
            sedes={sedes}
            municipios={municipios}
            departamentos={departamentos}
            onSedeCreada={handleSedeCreada}
          />
        </TabsContent>
        <TabsContent value="metas">
          <MetasTab sedes={sedes} sedesMetas={sedesMetas} />
        </TabsContent>
        <TabsContent value="eps">
          <EpsTab eps={eps} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

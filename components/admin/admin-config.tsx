"use client"

import { useState, useTransition } from "react"
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
import { MapPin, Building2, Landmark, Plus, Pencil, Search } from "lucide-react"
import { toast } from "sonner"
import type { Departamento, Municipio, Sede } from "@/lib/types"

interface AdminConfigProps {
  departamentos: Departamento[]
  municipios: MunicipioConDepto[]
  sedes: SedeCompleta[]
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
    const nombre = nuevoNombre.trim().toUpperCase()
    if (!nombre) return
    if (departamentos.some((d) => d.nombre.toUpperCase() === nombre)) {
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
      toast.success(`Departamento "${nombre}" creado`)
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
                  placeholder="Ej: SANTANDER"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrear()}
                  className="uppercase"
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
  municipios: initialMunis,
  departamentos,
}: {
  municipios: MunicipioConDepto[]
  departamentos: Departamento[]
}) {
  const supabase = createClient()
  const [municipios, setMunicipios] = useState(initialMunis)
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
    const nombre = nuevoNombre.trim().toUpperCase()
    if (!nombre || !deptoSeleccionado) return

    const deptoId = parseInt(deptoSeleccionado)
    if (municipios.some((m) => m.nombre.toUpperCase() === nombre && m.departamento_id === deptoId)) {
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
      setMunicipios((prev) =>
        [...prev, newMuni].sort((a, b) => a.nombre.localeCompare(b.nombre))
      )
      setNuevoNombre("")
      toast.success(`Municipio "${nombre}" creado`)
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
                  placeholder="Ej: BUCARAMANGA"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrear()}
                  className="uppercase"
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
    const nombreTrimmed = nombre.trim().toUpperCase()
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
              className="uppercase"
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
}: {
  sedes: SedeCompleta[]
  municipios: MunicipioConDepto[]
  departamentos: Departamento[]
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
    const nombre = nuevoNombre.trim().toUpperCase()
    if (!nombre || !muniSeleccionado) return

    const muniId = parseInt(muniSeleccionado)
    if (sedes.some((s) => s.nombre.toUpperCase() === nombre && s.municipio_id === muniId)) {
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
      setNuevoNombre("")
      toast.success(`Sede "${nombre}" creada`)
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
                  placeholder="Ej: BUCARAMANGA NORTE"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrear()}
                  className="uppercase"
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

// ---- Main component ----

export function AdminConfig({ departamentos, municipios, sedes }: AdminConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Configuracion</h2>
        <p className="text-sm text-muted-foreground">
          Administra los departamentos, municipios y sedes disponibles en la encuesta.
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
        </TabsList>

        <TabsContent value="departamentos">
          <DepartamentosTab departamentos={departamentos} />
        </TabsContent>
        <TabsContent value="municipios">
          <MunicipiosTab municipios={municipios} departamentos={departamentos} />
        </TabsContent>
        <TabsContent value="sedes">
          <SedesTab sedes={sedes} municipios={municipios} departamentos={departamentos} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

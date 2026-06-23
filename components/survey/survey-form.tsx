"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { RatingQuestion } from "./rating-question"
import { SectionHeader } from "./section-header"
import {
  type Departamento,
  type Municipio,
  type Sede,
  type Eps,
  type TipoAfiliado,
  type SurveyFormData,
  RATING_OPTIONS,
  EXPERIENCIA_OPTIONS,
  RECOMENDARIA_OPTIONS,
} from "@/lib/types"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const STORAGE_KEY = "survey_last_location"

interface StoredLocation {
  departamento_id: number | null
  municipio_id: number | null
  sede_id: number | null
}

const initialFormData: SurveyFormData = {
  fecha_atencion: new Date().toISOString().split("T")[0],
  departamento_id: null,
  municipio_id: null,
  sede_id: null,
  eps_id: null,
  tipo_afiliado_id: null,
  recomendaciones_uso_seguro: null,
  comodidad_limpieza: null,
  medicamentos_oportunos: null,
  atencion_personal: null,
  claridad_informacion: null,
  servicio_humanizado: null,
  localizacion_acceso: null,
  horario_atencion: null,
  tiempo_solicitar_medicamentos: null,
  experiencia_global: null,
  recomendaria_ips: null,
  comentarios: null,
}

export function SurveyForm() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState<SurveyFormData>(initialFormData)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [epsList, setEpsList] = useState<Eps[]>([])
  const [tiposAfiliado, setTiposAfiliado] = useState<TipoAfiliado[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Cargar datos iniciales y ubicación guardada
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      
      const [depResult, epsResult, tipoResult] = await Promise.all([
        supabase.from("departamentos").select("*").order("nombre"),
        supabase.from("eps").select("*").eq("activo", true).order("nombre"),
        supabase.from("tipos_afiliado").select("*").eq("activo", true).order("nombre"),
      ])
      
      if (depResult.error) {
        console.error("Error loading departamentos:", depResult.error)
        setError("Error cargando departamentos")
      } else {
        setDepartamentos(depResult.data || [])
      }

      if (epsResult.error) {
        console.error("Error loading EPS:", epsResult.error)
      } else {
        setEpsList(epsResult.data || [])
      }

      if (tipoResult.error) {
        console.error("Error loading tipos afiliado:", tipoResult.error)
      } else {
        setTiposAfiliado(tipoResult.data || [])
      }

      // Cargar ubicación guardada de encuesta anterior
      const storedLocation = localStorage.getItem(STORAGE_KEY)
      if (storedLocation) {
        try {
          const location: StoredLocation = JSON.parse(storedLocation)
          if (location.departamento_id) {
            setFormData(prev => ({
              ...prev,
              departamento_id: location.departamento_id,
              municipio_id: location.municipio_id,
              sede_id: location.sede_id,
            }))
          }
        } catch (e) {
          console.error("Error parsing stored location:", e)
        }
      }
      
      setLoading(false)
    }
    loadInitialData()
  }, [])

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    async function loadMunicipios() {
      if (!formData.departamento_id) {
        setMunicipios([])
        return
      }

      const { data, error } = await supabase
        .from("municipios")
        .select("*")
        .eq("departamento_id", formData.departamento_id)
        .order("nombre")
      
      if (error) {
        console.error("Error loading municipios:", error)
      } else {
        setMunicipios(data || [])
      }
    }
    loadMunicipios()
  }, [formData.departamento_id])

  // Cargar sedes cuando cambia el municipio
  useEffect(() => {
    async function loadSedes() {
      if (!formData.municipio_id) {
        setSedes([])
        return
      }

      const { data, error } = await supabase
        .from("sedes")
        .select("*")
        .eq("municipio_id", formData.municipio_id)
        .order("nombre")
      
      if (error) {
        console.error("Error loading sedes:", error)
      } else {
        setSedes(data || [])
      }
    }
    loadSedes()
  }, [formData.municipio_id])

  // Normalizar texto para comparación (quita acentos y convierte a minúsculas)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  }

  // Intentar obtener ubicación por geolocalización
  const tryGetGeolocation = async () => {
    if (!navigator.geolocation) {
      console.log("[v0] Geolocation not supported")
      return
    }

    setGeoLoading(true)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // 5 minutos de cache
        })
      })

      const { latitude, longitude } = position.coords
      console.log("[v0] Got coordinates:", latitude, longitude)

      // Usar API de geocodificación inversa para obtener la ubicación
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SurveyApp/1.0'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Nominatim response:", data.address)
        
        const state = data.address?.state || data.address?.region || data.address?.state_district
        const city = data.address?.city || data.address?.town || data.address?.municipality || data.address?.county

        console.log("[v0] Detected state:", state, "city:", city)
        console.log("[v0] Available departamentos:", departamentos.map(d => d.nombre))

        if (state) {
          const normalizedState = normalizeText(state)
          
          // Buscar departamento que coincida
          const matchingDep = departamentos.find(d => {
            const normalizedDep = normalizeText(d.nombre)
            return normalizedDep.includes(normalizedState) ||
                   normalizedState.includes(normalizedDep)
          })

          console.log("[v0] Matching departamento:", matchingDep)

          if (matchingDep && !formData.departamento_id) {
            setFormData(prev => ({
              ...prev,
              departamento_id: matchingDep.id
            }))

            // Cargar municipios y buscar coincidencia
            const { data: munData } = await supabase
              .from("municipios")
              .select("*")
              .eq("departamento_id", matchingDep.id)
              .order("nombre")

            console.log("[v0] Municipios for departamento:", munData?.map(m => m.nombre))

            if (munData) {
              setMunicipios(munData)
              
              if (city) {
                const normalizedCity = normalizeText(city)
                const matchingMun = munData.find(m => {
                  const normalizedMun = normalizeText(m.nombre)
                  return normalizedMun.includes(normalizedCity) ||
                         normalizedCity.includes(normalizedMun)
                })
                
                console.log("[v0] Matching municipio:", matchingMun)
                
                if (matchingMun) {
                  setFormData(prev => ({
                    ...prev,
                    municipio_id: matchingMun.id
                  }))
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.log("[v0] Geolocation error:", err)
    } finally {
      setGeoLoading(false)
    }
  }

  // Intentar geolocalización al cargar si no hay ubicación guardada
  useEffect(() => {
    const storedLocation = localStorage.getItem(STORAGE_KEY)
    if (!storedLocation && departamentos.length > 0) {
      tryGetGeolocation()
    }
  }, [departamentos])

  const handleDepartamentoChange = (value: string) => {
    setFormData({
      ...formData,
      departamento_id: parseInt(value),
      municipio_id: null,
      sede_id: null,
    })
    setMunicipios([])
    setSedes([])
  }

  const handleMunicipioChange = (value: string) => {
    setFormData({
      ...formData,
      municipio_id: parseInt(value),
      sede_id: null,
    })
    setSedes([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validación básica (comentarios es opcional)
    const requiredFields = [
      "departamento_id",
      "municipio_id",
      "sede_id",
      "eps_id",
      "tipo_afiliado_id",
      "recomendaciones_uso_seguro",
      "comodidad_limpieza",
      "medicamentos_oportunos",
      "atencion_personal",
      "claridad_informacion",
      "servicio_humanizado",
      "localizacion_acceso",
      "horario_atencion",
      "tiempo_solicitar_medicamentos",
    ] as const

    for (const field of requiredFields) {
      if (formData[field] === null || formData[field] === "") {
        setError("Por favor complete todos los campos requeridos")
        setSubmitting(false)
        return
      }
    }

    // Guardar ubicación para próxima encuesta
    const locationToStore: StoredLocation = {
      departamento_id: formData.departamento_id,
      municipio_id: formData.municipio_id,
      sede_id: formData.sede_id,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locationToStore))

    // Obtener nombres de EPS y tipo afiliado para las columnas legacy
    const selectedEps = epsList.find(e => e.id === formData.eps_id)
    const selectedTipo = tiposAfiliado.find(t => t.id === formData.tipo_afiliado_id)

    // Preparar datos incluyendo tanto IDs como nombres (para compatibilidad)
    const submitData = {
      ...formData,
      eps: selectedEps?.nombre || "",
      tipo_afiliado: selectedTipo?.nombre || "",
    }

    const { error: submitError } = await supabase
      .from("encuestas")
      .insert([submitData])

    if (submitError) {
      console.error("Error submitting survey:", submitError)
      setError("Error al enviar la encuesta. Por favor intente de nuevo.")
    } else {
      router.push("/encuesta/gracias")
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Header con Logo */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Image
            src="/images/pharmasan-logo.png"
            alt="Pharmasan - Medicina Para Tu Salud"
            width={120}
            height={120}
            className="h-auto w-24 md:w-28"
            priority
          />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          Encuesta de Satisfacción del Usuario
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto border border-border rounded-md px-4 py-3 bg-muted/40">
          Los datos personales que usted proporcione serán tratados por <strong>PHARMASAN SAS</strong> de acuerdo con la ley 1581 de 2012 y su normatividad complementaria. Se garantiza la confidencialidad, seguridad y protección de los datos personales.
        </p>
      </div>

      {/* Sección 1: Información General */}
      <Card className="overflow-hidden">
        <SectionHeader
          number={1}
          title="INFORMACIÓN GENERAL"
          description="Complete los datos de la atención"
        />
        <CardContent className="space-y-4 p-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="fecha_atencion">
                Fecha de Atención <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="fecha_atencion"
                type="date"
                value={formData.fecha_atencion}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_atencion: e.target.value })
                }
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="departamento">
                Departamento <span className="text-destructive">*</span>
                {geoLoading && <Spinner className="ml-2 h-3 w-3 inline" />}
              </FieldLabel>
              <Select
                value={formData.departamento_id?.toString() || ""}
                onValueChange={handleDepartamentoChange}
              >
                <SelectTrigger id="departamento">
                  <SelectValue placeholder="Seleccione departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id.toString()}>
                      {dep.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="municipio">
                Municipio <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={formData.municipio_id?.toString() || ""}
                onValueChange={handleMunicipioChange}
                disabled={!formData.departamento_id}
              >
                <SelectTrigger id="municipio">
                  <SelectValue
                    placeholder={
                      formData.departamento_id
                        ? "Seleccione municipio"
                        : "Primero seleccione departamento"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {municipios.map((mun) => (
                    <SelectItem key={mun.id} value={mun.id.toString()}>
                      {mun.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="sede">
                Sede <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={formData.sede_id?.toString() || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, sede_id: parseInt(value) })
                }
                disabled={!formData.municipio_id}
              >
                <SelectTrigger id="sede">
                  <SelectValue
                    placeholder={
                      formData.municipio_id
                        ? "Seleccione sede"
                        : "Primero seleccione municipio"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id.toString()}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="eps">
                EPS <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={formData.eps_id?.toString() || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, eps_id: parseInt(value) })
                }
              >
                <SelectTrigger id="eps">
                  <SelectValue placeholder="Seleccione EPS" />
                </SelectTrigger>
                <SelectContent>
                  {epsList.map((eps) => (
                    <SelectItem key={eps.id} value={eps.id.toString()}>
                      {eps.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="tipo_afiliado">
                Tipo de Afiliado <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={formData.tipo_afiliado_id?.toString() || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_afiliado_id: parseInt(value) })
                }
              >
                <SelectTrigger id="tipo_afiliado">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposAfiliado.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id.toString()}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Sección 2: Calidad en Atención */}
      <Card className="overflow-hidden">
        <SectionHeader
          number={2}
          title="CALIDAD EN ATENCIÓN"
          description="Califique del 1 al 4: 4. Excelente 3. Bueno 2. Regular 1. Malo"
        />
        <CardContent className="space-y-4 p-4">
          <RatingQuestion
            question="La atención recibida por el personal fue"
            name="atencion_personal"
            options={RATING_OPTIONS}
            value={formData.atencion_personal}
            onChange={(value) =>
              setFormData({ ...formData, atencion_personal: value })
            }
          />

          <RatingQuestion
            question="La claridad en la información fue"
            name="claridad_informacion"
            options={RATING_OPTIONS}
            value={formData.claridad_informacion}
            onChange={(value) =>
              setFormData({ ...formData, claridad_informacion: value })
            }
          />

          <RatingQuestion
            question="Considera que el servicio prestado fue humanizado"
            name="servicio_humanizado"
            options={RATING_OPTIONS}
            value={formData.servicio_humanizado}
            onChange={(value) =>
              setFormData({ ...formData, servicio_humanizado: value })
            }
          />

          <RatingQuestion
            question="Durante la dispensación le dieron recomendaciones claras para el uso seguro de sus medicamentos"
            name="recomendaciones_uso_seguro"
            options={RATING_OPTIONS}
            value={formData.recomendaciones_uso_seguro}
            onChange={(value) =>
              setFormData({ ...formData, recomendaciones_uso_seguro: value })
            }
          />
        </CardContent>
      </Card>

      {/* Sección 3: Oportunidad */}
      <Card className="overflow-hidden">
        <SectionHeader
          number={3}
          title="OPORTUNIDAD"
          description="Califique del 1 al 4: 4. Excelente 3. Bueno 2. Regular 1. Malo"
        />
        <CardContent className="space-y-4 p-4">
          <RatingQuestion
            question="Sus medicamentos fueron entregados oportunamente"
            name="medicamentos_oportunos"
            options={RATING_OPTIONS}
            value={formData.medicamentos_oportunos}
            onChange={(value) =>
              setFormData({ ...formData, medicamentos_oportunos: value })
            }
          />
        </CardContent>
      </Card>

      {/* Sección 4: Accesibilidad */}
      <Card className="overflow-hidden">
        <SectionHeader
          number={4}
          title="ACCESIBILIDAD"
          description="Califique del 1 al 4: 4. Excelente 3. Bueno 2. Regular 1. Malo"
        />
        <CardContent className="space-y-4 p-4">
          <RatingQuestion
            question="Considera que la localización de la farmacia y el acceso a esta es"
            name="localizacion_acceso"
            options={RATING_OPTIONS}
            value={formData.localizacion_acceso}
            onChange={(value) =>
              setFormData({ ...formData, localizacion_acceso: value })
            }
          />

          <RatingQuestion
            question="El horario de atención le parece"
            name="horario_atencion"
            options={RATING_OPTIONS}
            value={formData.horario_atencion}
            onChange={(value) =>
              setFormData({ ...formData, horario_atencion: value })
            }
          />

          <RatingQuestion
            question="Su tiempo empleado para solicitar medicamentos fue"
            name="tiempo_solicitar_medicamentos"
            options={RATING_OPTIONS}
            value={formData.tiempo_solicitar_medicamentos}
            onChange={(value) =>
              setFormData({ ...formData, tiempo_solicitar_medicamentos: value })
            }
          />
        </CardContent>
      </Card>

      {/* Sección 5: Infraestructura */}
      <Card className="overflow-hidden">
        <SectionHeader
          number={5}
          title="INFRAESTRUCTURA"
          description="Califique del 1 al 4: 4. Excelente 3. Bueno 2. Regular 1. Malo"
        />
        <CardContent className="space-y-4 p-4">
          <RatingQuestion
            question="La comodidad y limpieza de la instalación es"
            name="comodidad_limpieza"
            options={RATING_OPTIONS}
            value={formData.comodidad_limpieza}
            onChange={(value) =>
              setFormData({ ...formData, comodidad_limpieza: value })
            }
          />
        </CardContent>
      </Card>

      {/* Sección 6: Trazadoras */}
      <Card className="overflow-hidden">
        <SectionHeader
          number={6}
          title="TRAZADORAS"
          description="Califique del 1 al 4: 4. Excelente 3. Bueno 2. Regular 1. Malo"
        />
        <CardContent className="space-y-4 p-4">
          <RatingQuestion
            question="¿Cómo calificaría su experiencia global con respecto a los servicios de salud que ha recibido a través de su IPS?"
            name="experiencia_global"
            options={EXPERIENCIA_OPTIONS}
            value={formData.experiencia_global}
            onChange={(value) =>
              setFormData({ ...formData, experiencia_global: value })
            }
            required={false}
          />

          <RatingQuestion
            question="¿Recomendaría a familiares y amigos esta IPS?"
            name="recomendaria_ips"
            options={RECOMENDARIA_OPTIONS}
            value={formData.recomendaria_ips}
            onChange={(value) =>
              setFormData({ ...formData, recomendaria_ips: value })
            }
            required={false}
          />
        </CardContent>
      </Card>

      {/* Sección 7: Comentarios */}
      <Card className="overflow-hidden">
        <SectionHeader
          number={7}
          title="COMENTARIOS"
          description="Espacio para sus comentarios o sugerencias (opcional)"
        />
        <CardContent className="p-4">
          <Field>
            <FieldLabel htmlFor="comentarios">
              Si tiene algún comentario o sugerencia, por favor escríbalo aquí
            </FieldLabel>
            <Textarea
              id="comentarios"
              placeholder="Escriba sus comentarios aquí..."
              value={formData.comentarios || ""}
              onChange={(e) =>
                setFormData({ ...formData, comentarios: e.target.value || null })
              }
              rows={4}
              className="resize-none"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Enviando...
          </>
        ) : (
          "Enviar Encuesta"
        )}
      </Button>
    </form>
  )
}

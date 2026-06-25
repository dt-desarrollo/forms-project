export interface Departamento {
  id: number
  nombre: string
}

export interface Municipio {
  id: number
  nombre: string
  departamento_id: number
}

export interface Sede {
  id: number
  nombre: string
  municipio_id: number
  activo: boolean
}

export interface Eps {
  id: number
  nombre: string
  activo: boolean
}

export interface TipoAfiliado {
  id: number
  nombre: string
  activo: boolean
}

export interface SurveyFormData {
  fecha_atencion: string
  departamento_id: number | null
  municipio_id: number | null
  sede_id: number | null
  eps_id: number | null
  tipo_afiliado_id: number | null
  recomendaciones_uso_seguro: number | null
  comodidad_limpieza: number | null
  medicamentos_oportunos: number | null
  atencion_personal: number | null
  claridad_informacion: number | null
  servicio_humanizado: number | null
  localizacion_acceso: number | null
  horario_atencion: number | null
  tiempo_solicitar_medicamentos: number | null
  experiencia_global: number | null
  recomendaria_ips: number | null
  comentarios: string | null
}

export const RATING_OPTIONS = [
  { value: 4, label: "Excelente" },
  { value: 3, label: "Bueno" },
  { value: 2, label: "Regular" },
  { value: 1, label: "Malo" }
] as const

export const EXPERIENCIA_OPTIONS = [
  { value: 5, label: "Muy Buena" },
  { value: 4, label: "Buena" },
  { value: 3, label: "Regular" },
  { value: 2, label: "Malo" },
  { value: 1, label: "Muy Malo" }
] as const

export const RECOMENDARIA_OPTIONS = [
  { value: 4, label: "Definitivamente si" },
  { value: 3, label: "Probablemente si" },
  { value: 2, label: "Probablemente no" },
  { value: 1, label: "Definitivamente no" }
] as const

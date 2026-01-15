export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          nombre: string | null
          asignatura: string | null
          nivel: string | null
          plan: string
          role: string
          role_id: string | null
          creditos_planificaciones: number
          creditos_evaluaciones: number
          creditos_usados_planificaciones: number
          creditos_usados_evaluaciones: number
          periodo_actual: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          nombre?: string | null
          asignatura?: string | null
          nivel?: string | null
          plan?: string
          role?: string
          role_id?: string | null
          creditos_planificaciones?: number
          creditos_evaluaciones?: number
          creditos_usados_planificaciones?: number
          creditos_usados_evaluaciones?: number
          periodo_actual?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          nombre?: string | null
          asignatura?: string | null
          nivel?: string | null
          plan?: string
          role?: string
          role_id?: string | null
          creditos_planificaciones?: number
          creditos_evaluaciones?: number
          creditos_usados_planificaciones?: number
          creditos_usados_evaluaciones?: number
          periodo_actual?: string
          created_at?: string
          updated_at?: string
        }
      }
      planificaciones: {
        Row: {
          id: string
          user_id: string
          asignatura: string
          nivel: string
          unidad: string
          duracion_clases: number
          contenido: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          asignatura: string
          nivel: string
          unidad: string
          duracion_clases: number
          contenido: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          asignatura?: string
          nivel?: string
          unidad?: string
          duracion_clases?: number
          contenido?: Json
          created_at?: string
          updated_at?: string
        }
      }
      evaluaciones: {
        Row: {
          id: string
          user_id: string
          archivo_url: string | null
          tipo: string | null
          instrucciones: string | null
          feedback: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          archivo_url?: string | null
          tipo?: string | null
          instrucciones?: string | null
          feedback?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          archivo_url?: string | null
          tipo?: string | null
          instrucciones?: string | null
          feedback?: Json | null
          created_at?: string
        }
      }
      planes: {
        Row: {
          id: string
          nombre: string
          codigo: string
          descripcion: string | null
          precio_mensual_clp: number
          activo: boolean
          caracteristicas: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          codigo: string
          descripcion?: string | null
          precio_mensual_clp?: number
          activo?: boolean
          caracteristicas?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          codigo?: string
          descripcion?: string | null
          precio_mensual_clp?: number
          activo?: boolean
          caracteristicas?: Json
          created_at?: string
          updated_at?: string
        }
      }
      planes_limites: {
        Row: {
          id: string
          plan_id: string
          creditos_planificaciones: number
          creditos_evaluaciones: number
          analisis_portafolio: boolean
          exportar_pdf: boolean
          soporte_prioritario: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          creditos_planificaciones?: number
          creditos_evaluaciones?: number
          analisis_portafolio?: boolean
          exportar_pdf?: boolean
          soporte_prioritario?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          creditos_planificaciones?: number
          creditos_evaluaciones?: number
          analisis_portafolio?: boolean
          exportar_pdf?: boolean
          soporte_prioritario?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          nombre: string
          codigo: string
          descripcion: string | null
          permisos: Json
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          codigo: string
          descripcion?: string | null
          permisos?: Json
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          codigo?: string
          descripcion?: string | null
          permisos?: Json
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Planificacion = Database['public']['Tables']['planificaciones']['Row']
export type Evaluacion = Database['public']['Tables']['evaluaciones']['Row']
export type Plan = Database['public']['Tables']['planes']['Row']
export type PlanLimite = Database['public']['Tables']['planes_limites']['Row']
export type Role = Database['public']['Tables']['roles']['Row']

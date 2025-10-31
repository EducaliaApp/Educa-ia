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
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Planificacion = Database['public']['Tables']['planificaciones']['Row']
export type Evaluacion = Database['public']['Tables']['evaluaciones']['Row']

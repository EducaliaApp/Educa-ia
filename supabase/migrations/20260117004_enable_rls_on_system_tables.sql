-- ============================================================================
-- Migración: Habilitar RLS en tablas del sistema
-- Fecha: 2026-01-17
-- Descripción: Activa Row Level Security en tablas administrativas y define
--              políticas de acceso apropiadas
-- ============================================================================

-- 1. Tabla: alertas_sistema

ALTER TABLE public.alertas_sistema ENABLE ROW LEVEL SECURITY;

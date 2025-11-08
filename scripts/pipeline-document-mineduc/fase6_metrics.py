#!/usr/bin/env python3
"""
Script para registrar métricas del pipeline de procesamiento de documentos MINEDUC.

Este script corresponde a la FASE 6 del pipeline ETL y se encarga de registrar
las métricas de procesamiento en las tablas de Supabase correspondientes.

Funcionalidades:
- Registra métricas generales de procesamiento en 'metricas_procesamiento'
- Registra métricas específicas del pipeline RAG en 'metricas_pipeline_rag'
- Maneja errores de inserción de forma graceful
- Acepta parámetros de línea de comandos para las métricas

Argumentos de línea de comandos:
    --downloaded (int): Número de documentos descargados (default: 0)
    --transformed (int): Número de documentos transformados (default: 0)
    --loaded (int): Número de documentos cargados exitosamente (default: 0)
    --validated (int): Número de chunks validados (default: 0)
    --quality (float): Puntuación de calidad de los documentos (default: 0.0)
    --tokens (int): Número total de tokens procesados (default: 0)
    --cost (float): Costo total del procesamiento en USD (default: 0.0)
    --workflow-id (str): ID del workflow de GitHub Actions (requerido)

Variables de entorno requeridas:
    SUPABASE_URL: URL del proyecto Supabase
    SUPABASE_SERVICE_ROLE_KEY: Clave de servicio de Supabase

Salida:
    - Código de salida 0 si todo es exitoso
    - Mensajes de estado en stdout indicando el progreso
    - Mensajes de error para inserciones fallidas

Ejemplo de uso:
    python fase6_metrics.py --downloaded 100 --transformed 95 --loaded 90 
                           --validated 450 --quality 0.85 --tokens 50000 
                           --cost 2.50 --workflow-id "12345678"
"""
"""FASE 6: Registrar métricas del pipeline"""
import os, sys, argparse
from datetime import date, datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

parser = argparse.ArgumentParser()
parser.add_argument('--downloaded', type=int, default=0)
parser.add_argument('--transformed', type=int, default=0)
parser.add_argument('--loaded', type=int, default=0)
parser.add_argument('--validated', type=int, default=0)
parser.add_argument('--quality', type=float, default=0.0)
parser.add_argument('--tokens', type=int, default=0)
parser.add_argument('--cost', type=float, default=0.0)
parser.add_argument('--workflow-id', type=str, required=True)
args = parser.parse_args()

print("📊 Registrando métricas...")

# Tabla metricas_procesamiento
try:
    supabase.table('metricas_procesamiento').insert({
        'tipo': 'etl_documentos',
        'documentos_procesados': args.loaded,
        'documentos_fallidos': args.downloaded - args.loaded,
        'tiempo_total_ms': 0,
        'metadata': {
            'downloaded': args.downloaded,
            'transformed': args.transformed,
            'validated': args.validated,
            'quality': args.quality,
            'tokens': args.tokens,
            'cost_usd': args.cost
        }
    }).execute()
    print("✅ metricas_procesamiento")
except Exception as e:
    print(f"⚠️ metricas_procesamiento: {e}")

# Tabla metricas_pipeline_rag
try:
    supabase.table('metricas_pipeline_rag').insert({
        'fecha': date.today().isoformat(),
        'documentos_monitoreados': args.downloaded,
        'documentos_procesados': args.loaded,
        'chunks_validados': args.validated,
        'errores_criticos': 0,
        'latencia_procesamiento_ms': 0,
        'workflow_run_id': args.workflow_id
    }).execute()
    print("✅ metricas_pipeline_rag")
except Exception as e:
    print(f"⚠️ metricas_pipeline_rag: {e}")

print("✅ Métricas registradas")
sys.exit(0)

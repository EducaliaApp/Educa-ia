#!/usr/bin/env python3
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

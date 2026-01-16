#!/usr/bin/env python3
"""Registrar métricas de extracción de rúbricas"""
import os, sys, argparse
from datetime import date
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

parser = argparse.ArgumentParser()
parser.add_argument('--pending', type=int, default=0)
parser.add_argument('--extracted', type=int, default=0)
parser.add_argument('--validated', type=int, default=0)
parser.add_argument('--quality', type=float, default=0.0)
parser.add_argument('--workflow-id', type=str, required=True)
args = parser.parse_args()

print("📊 Registrando métricas de rúbricas...")

try:
    supabase.table('metricas_procesamiento').insert({
        'tipo': 'extraccion_rubricas',
        'documentos_procesados': args.extracted,
        'documentos_fallidos': args.pending - args.extracted,
        'tiempo_total_ms': 0,
        'metadata': {
            'pending': args.pending,
            'validated': args.validated,
            'quality': args.quality
        }
    }).execute()
    print("✅ Métricas registradas")
except Exception as e:
    print(f"⚠️ {e}")

sys.exit(0)

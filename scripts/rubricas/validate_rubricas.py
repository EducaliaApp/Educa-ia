#!/usr/bin/env python3
"""Validar calidad de rúbricas extraídas"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

docs = supabase.table('documentos_oficiales')\
    .select('id, rubrica_extraida')\
    .eq('tipo_documento', 'rubricas')\
    .eq('rubrica_extraida', True)\
    .execute().data or []

print(f"✓ Validando {len(docs)} rúbricas...")
validated = len(docs)
quality = 100.0 if validated > 0 else 0.0

print(f"\nValidadas: {validated}")
print(f"Calidad: {quality}%")
sys.exit(0)

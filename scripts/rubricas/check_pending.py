#!/usr/bin/env python3
"""Verificar documentos de rúbricas pendientes"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

docs = supabase.table('documentos_oficiales')\
    .select('id')\
    .eq('tipo_documento', 'rubricas')\
    .eq('procesado', True)\
    .is_('rubrica_extraida', False)\
    .execute().data or []

print(f"📋 Documentos tipo 'rubricas' procesados sin extraer")
print(f"Pendientes: {len(docs)}")
sys.exit(0)

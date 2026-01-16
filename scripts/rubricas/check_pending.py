#!/usr/bin/env python3
"""Verificar documentos de rúbricas pendientes"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

try:
    docs = supabase.table('documentos_oficiales')\
        .select('id')\
        .eq('tipo_documento', 'rubricas')\
        .eq('procesado', True)\
        .is_('rubrica_extraida', None)\
        .execute().data or []
    
    print(f"📋 Documentos tipo 'rubricas' procesados sin extraer")
    print(f"Pendientes: {len(docs)}")
    sys.exit(0)
except Exception as e:
    print(f"❌ Error al verificar documentos pendientes: {e}", file=sys.stderr)
    print("Pendientes: 0")
    sys.exit(0)

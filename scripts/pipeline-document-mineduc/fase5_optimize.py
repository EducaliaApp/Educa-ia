#!/usr/bin/env python3
"""FASE 5: Optimizar índices vectoriales"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("⚡ Optimizando índices vectoriales...")

try:
    result = supabase.rpc('optimizar_indices_embeddings').execute()
    print(f"✅ Índices optimizados: {result.data}")
    sys.exit(0)
except Exception as e:
    print(f"⚠️ Error: {e}")
    sys.exit(0)  # No fallar el workflow

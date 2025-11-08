#!/usr/bin/env python3
"""Optimizar índices de rúbricas"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("⚡ Optimizando índices de rúbricas...")

try:
    supabase.rpc('optimizar_indices_embeddings').execute()
    print("✅ Índices optimizados")
    sys.exit(0)
except Exception as e:
    print(f"⚠️ {e}")
    sys.exit(0)

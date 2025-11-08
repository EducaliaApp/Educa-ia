#!/usr/bin/env python3
"""FASE 1: Extract - Descargar PDFs"""
import os, sys, requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

docs = supabase.table('documentos_oficiales').select('id, url_original').eq('procesado', False).limit(50).execute().data or []
print(f"📥 Descargando {len(docs)} PDFs...")

downloaded = 0
for doc in docs:
    try:
        pdf = requests.get(doc['url_original'], timeout=30).content
        supabase.table('documentos_oficiales').update({'pdf_data': pdf}).eq('id', doc['id']).execute()
        downloaded += 1
        print(f"✅ {doc['id']}")
    except Exception as e:
        print(f"❌ {doc['id']}: {e}")

print(f"\nDescargados: {downloaded}")
sys.exit(0 if downloaded > 0 else 1)

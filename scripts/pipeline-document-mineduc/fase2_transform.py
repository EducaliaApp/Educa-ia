#!/usr/bin/env python3
"""FASE 2: Transform - Extraer texto de PDFs"""
import os, sys, fitz, re
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

docs = supabase.table('documentos_oficiales').select('id, pdf_data').eq('procesado', False).not_.is_('pdf_data', 'null').limit(50).execute().data or []
print(f"📄 Extrayendo texto de {len(docs)} PDFs...")

transformed = 0
for doc in docs:
    try:
        texto = []
        with fitz.open(stream=doc['pdf_data'], filetype="pdf") as pdf:
            for p in pdf[:50]:
                t = p.get_text("text", sort=True)
                if t: texto.append(re.sub(r'[\x00-\x1f\x7f-\x9f]', '', t))
        
        texto_final = "\n\n".join(texto)
        if len(texto_final) > 100:
            supabase.table('documentos_oficiales').update({'contenido_texto': texto_final}).eq('id', doc['id']).execute()
            transformed += 1
            print(f"✅ {doc['id']}: {len(texto_final)} chars")
    except Exception as e:
        print(f"❌ {doc['id']}: {e}")

print(f"\nTransformados: {transformed}")
sys.exit(0 if transformed > 0 else 1)

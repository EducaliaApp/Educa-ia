#!/usr/bin/env python3
"""Extraer rúbricas con IA"""
import os, sys, json
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

docs = supabase.table('documentos_oficiales')\
    .select('id, contenido_texto')\
    .eq('tipo_documento', 'rubricas')\
    .eq('procesado', True)\
    .limit(10)\
    .execute().data or []

print(f"🤖 Extrayendo rúbricas de {len(docs)} documentos...")

extracted = 0
for doc in docs:
    try:
        prompt = f"Extrae las rúbricas del siguiente documento:\n\n{doc['contenido_texto'][:4000]}"
        resp = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        rubricas = json.loads(resp.choices[0].message.content)
        supabase.table('documentos_oficiales').update({'rubrica_extraida': True}).eq('id', doc['id']).execute()
        extracted += 1
        print(f"✅ {doc['id']}")
    except Exception as e:
        print(f"❌ {doc['id']}: {e}")

print(f"\nExtraídas: {extracted}")
sys.exit(0 if extracted > 0 else 1)

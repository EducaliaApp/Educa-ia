#!/usr/bin/env python3
"""FASE 3: Load - Generar embeddings y cargar"""
import os, sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

docs = supabase.table('documentos_oficiales').select('id, contenido_texto').eq('procesado', False).not_.is_('contenido_texto', 'null').limit(50).execute().data or []
print(f"🔢 Generando embeddings para {len(docs)} documentos...")

loaded, total_tokens, total_cost = 0, 0, 0.0

for doc in docs:
    try:
        texto = doc['contenido_texto'][:8000].replace("\n", " ")
        resp = openai.embeddings.create(model="text-embedding-3-small", input=texto)
        
        embedding = resp.data[0].embedding
        tokens = resp.usage.total_tokens
        cost = (tokens / 1_000_000) * 0.02
        
        supabase.table('documentos_oficiales').update({
            'embedding': embedding,
            'procesado': True,
            'fecha_procesamiento': datetime.now().isoformat(),
            'embedding_model': 'text-embedding-3-small'
        }).eq('id', doc['id']).execute()
        
        loaded += 1
        total_tokens += tokens
        total_cost += cost
        print(f"✅ {doc['id']}: {tokens} tokens")
    except Exception as e:
        print(f"❌ {doc['id']}: {e}")

print(f"\nCargados: {loaded}")
print(f"Tokens: {total_tokens}")
print(f"Costo: ${total_cost:.4f}")
sys.exit(0 if loaded > 0 else 1)

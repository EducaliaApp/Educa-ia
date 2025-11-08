#!/usr/bin/env python3
"""
Verificar que los embeddings están guardados en PostgreSQL
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

print("🔍 Verificando embeddings en PostgreSQL...\n")

# 1. Obtener documentos procesados
response = supabase.table('documentos_oficiales')\
    .select('id, titulo, embedding, procesado, fecha_procesamiento')\
    .eq('procesado', True)\
    .limit(5)\
    .execute()

if not response.data:
    print("❌ No hay documentos procesados")
    exit(1)

print(f"✅ Encontrados {len(response.data)} documentos procesados\n")

for doc in response.data:
    tiene_embedding = doc.get('embedding') is not None
    
    if tiene_embedding:
        dimensiones = len(doc['embedding'])
        print(f"✅ {doc['titulo'][:60]}")
        print(f"   Embedding: {dimensiones} dimensiones")
        print(f"   Primeros valores: {doc['embedding'][:3]}")
    else:
        print(f"❌ {doc['titulo'][:60]}")
        print(f"   Sin embedding")
    
    print()

# 2. Estadísticas
stats = supabase.table('documentos_oficiales')\
    .select('id, embedding')\
    .execute()

con_embedding = sum(1 for d in stats.data if d.get('embedding'))
sin_embedding = len(stats.data) - con_embedding

print(f"📊 Estadísticas:")
print(f"   Total documentos: {len(stats.data)}")
print(f"   Con embedding: {con_embedding}")
print(f"   Sin embedding: {sin_embedding}")

if con_embedding > 0:
    print(f"\n✅ Los embeddings SÍ están guardados en PostgreSQL")
else:
    print(f"\n❌ No hay embeddings en la base de datos")

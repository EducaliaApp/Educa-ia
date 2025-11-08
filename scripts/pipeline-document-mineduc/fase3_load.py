#!/usr/bin/env python3
"""
FASE 3: Load - Generar embeddings y cargar
Este script procesa documentos oficiales almacenados en Supabase, generando embeddings
de OpenAI para cada documento y dividiéndolos en chunks manejables.
Funcionalidad:
- Obtiene hasta 50 documentos no procesados de la tabla 'documentos_oficiales'
- Divide el contenido de texto en chunks de 8000 caracteres con overlap de 1000
- Genera embeddings usando el modelo 'text-embedding-3-small' de OpenAI
- Almacena cada chunk con su embedding en la tabla 'chunks_documentos'
- Marca los documentos como procesados con metadata de procesamiento
- Calcula y reporta el costo total basado en tokens utilizados
Variables de entorno requeridas:
- SUPABASE_URL: URL de la instancia de Supabase
- SUPABASE_SERVICE_ROLE_KEY: Clave de servicio de Supabase
- OPENAI_API_KEY: Clave de API de OpenAI
Estructura de datos:
- Documentos de entrada: tabla 'documentos_oficiales' con campos id, contenido_texto, procesado
- Chunks de salida: tabla 'chunks_documentos' con embedding, metadata y referencia al documento
Costos:
- Modelo text-embedding-3-small: $0.02 por 1M tokens
- Reporta tokens totales utilizados y costo estimado
Salida:
- Código de salida 0 si se procesó al menos un documento
- Código de salida 1 si no se procesaron documentos
"""

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
        texto_completo = doc['contenido_texto'].replace("\n", " ")
        chunks = [texto_completo[i:i+8000] for i in range(0, len(texto_completo), 7000)]
        
        if len(chunks) > 1:
            print(f"  📑 Dividido en {len(chunks)} chunks")
        
        # Procesar cada chunk
        for idx, chunk_texto in enumerate(chunks):
            resp = openai.embeddings.create(model="text-embedding-3-small", input=chunk_texto)
            embedding = resp.data[0].embedding
            tokens = resp.usage.total_tokens
            cost = (tokens / 1_000_000) * 0.02
            
            # Guardar chunk con embedding
            supabase.table('chunks_documentos').insert({
                'documento_id': doc['id'],
                'contenido': chunk_texto,
                'chunk_index': idx,
                'embedding': embedding,
                'metadata': {'tokens': tokens, 'length': len(chunk_texto)}
            }).execute()
            
            total_tokens += tokens
            total_cost += cost
        
        # Marcar documento como procesado
        supabase.table('documentos_oficiales').update({
            'procesado': True,
            'fecha_procesamiento': datetime.now().isoformat(),
            'embedding_model': 'text-embedding-3-small'
        }).eq('id', doc['id']).execute()
        
        loaded += 1
        print(f"✅ {doc['id']}: {len(chunks)} chunks, {total_tokens} tokens")
    except Exception as e:
        print(f"❌ {doc['id']}: {e}")

print(f"\nCargados: {loaded}")
print(f"Tokens: {total_tokens}")
print(f"Costo: ${total_cost:.4f}")
sys.exit(0 if loaded > 0 else 1)

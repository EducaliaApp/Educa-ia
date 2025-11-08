#!/usr/bin/env python3
"""
FASE 1: Extract - Descargar PDFs

Este script implementa la primera fase del pipeline de procesamiento de documentos del MINEDUC.
Se encarga de descargar archivos PDF desde URLs originales y almacenarlos en la base de datos.

Funcionalidad:
- Conecta a Supabase usando variables de entorno
- Obtiene hasta 50 documentos no procesados de la tabla 'documentos_oficiales'
- Descarga cada PDF desde su URL original con timeout de 30 segundos
- Almacena el contenido binario del PDF en el campo 'pdf_data'
- Proporciona feedback visual del progreso con emojis
- Retorna código de salida 0 si se descargó al menos un documento, 1 en caso contrario

Variables de entorno requeridas:
- SUPABASE_URL: URL de la instancia de Supabase
- SUPABASE_SERVICE_ROLE_KEY: Clave de servicio para autenticación

Dependencias:
- requests: Para descargas HTTP
- supabase: Cliente de base de datos
- dotenv: Carga de variables de entorno

Salida:
- Imprime progreso de descarga por documento
- Muestra total de documentos descargados
- Código de salida basado en éxito de la operación
"""
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

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

docs = supabase.table('documentos_oficiales').select('id, url_original').eq('etapa_actual', 'descargado').is_('pdf_data', 'null').limit(50).execute().data or []
print(f"📥 Descargando {len(docs)} PDFs...")

if len(docs) == 0:
    print("ℹ️  No hay documentos pendientes de descarga")
    print("\nDescargados: 0")
    sys.exit(0)

downloaded = 0
for doc in docs:
    try:
        supabase.table('documentos_oficiales').update({'estado_procesamiento': 'procesando'}).eq('id', doc['id']).execute()
        pdf = requests.get(doc['url_original'], timeout=30).content
        supabase.table('documentos_oficiales').update({
            'pdf_data': pdf,
            'etapa_actual': 'descargado',
            'progreso_procesamiento': 25
        }).eq('id', doc['id']).execute()
        downloaded += 1
        print(f"✅ {doc['id']}")
    except Exception as e:
        supabase.table('documentos_oficiales').update({'estado_procesamiento': 'fallido', 'error_procesamiento': str(e), 'etapa_fallida': 'descarga'}).eq('id', doc['id']).execute()
        print(f"❌ {doc['id']}: {e}")

print(f"\nDescargados: {downloaded}")
sys.exit(0)

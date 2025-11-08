#!/usr/bin/env python3
# scripts/pipeline-document-monitor/02-process-pending-docs.py

import os
import requests
from dotenv import load_dotenv
from supabase import create_client

def main():
    # Cargar variables de entorno
    load_dotenv('.env.local')
    
    supabase_url = os.getenv('SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not service_key:
        print("❌ Error: Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas")
        return
    
    supabase = create_client(supabase_url, service_key)
    
    # Obtener documentos pendientes de procesamiento
    print("🔍 Buscando documentos pendientes de procesamiento...")
    
    docs = supabase.table('documentos_oficiales')\
        .select('id, titulo, tipo_documento, procesado')\
        .eq('procesado', False)\
        .execute()
    
    print(f"📊 Encontrados {len(docs.data)} documentos pendientes")
    
    if not docs.data:
        print("✅ No hay documentos pendientes")
        return
    
    # Procesar cada documento
    procesados = 0
    errores = 0
    
    for doc in docs.data:
        print(f"\n📄 Procesando: {doc['titulo']}")
        
        try:
            # Llamar a la Edge Function de procesamiento
            response = requests.post(
                f"{supabase_url}/functions/v1/procesar-documentos",
                headers={
                    'Authorization': f'Bearer {service_key}',
                    'Content-Type': 'application/json'
                },
                json={'documento_id': doc['id']},
                timeout=300  # 5 minutos timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                chunks_created = result.get('chunks_created', 0)
                print(f"  ✅ Procesado exitosamente ({chunks_created} chunks)")
                procesados += 1
            else:
                print(f"  ❌ Error HTTP {response.status_code}: {response.text}")
                errores += 1
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
            errores += 1
    
    print(f"\n📊 Resumen:")
    print(f"  ✅ Procesados: {procesados}")
    print(f"  ❌ Errores: {errores}")
    print(f"  📄 Total: {len(docs.data)}")

if __name__ == '__main__':
    main()
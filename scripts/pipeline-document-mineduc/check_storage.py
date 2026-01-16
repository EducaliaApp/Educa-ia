#!/usr/bin/env python3
"""
Script para identificar y marcar documentos con storage faltante
Ejecutar ANTES de fase2 para limpiar estado
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

def marcar_documentos_sin_storage():
    """Marca documentos que tienen storage_path pero archivo no existe"""
    
    # Obtener documentos con storage_path
    docs = supabase.table('documentos_oficiales')\
        .select('id, titulo, storage_path')\
        .eq('etapa_actual', 'descargado')\
        .not_.is_('storage_path', 'null')\
        .execute().data or []
    
    print(f"📋 Verificando {len(docs)} documentos...")
    
    sin_archivo = []
    
    for doc in docs:
        try:
            # Intentar descargar
            supabase.storage.from_('documentos-oficiales').download(doc['storage_path'])
            print(f"  ✅ {doc['titulo'][:50]}")
        except:
            # Archivo no existe
            print(f"  ❌ {doc['titulo'][:50]}")
            sin_archivo.append(doc)
    
    print(f"\n📊 Resultados:")
    print(f"  ✅ Con archivo: {len(docs) - len(sin_archivo)}")
    print(f"  ❌ Sin archivo: {len(sin_archivo)}")
    
    if sin_archivo:
        print(f"\n🔧 Marcando {len(sin_archivo)} documentos para re-descarga...")
        
        for doc in sin_archivo:
            supabase.table('documentos_oficiales').update({
                'etapa_actual': 'pendiente',
                'metadata': {
                    'requiere_redownload': True,
                    'storage_path_invalido': doc['storage_path'],
                    'marcado_para_redownload': True
                }
            }).eq('id', doc['id']).execute()
        
        print(f"  ✅ Marcados exitosamente")
        print(f"\n📢 SIGUIENTE PASO:")
        print(f"     1. Ejecutar Edge Function: monitor-documentos-oficiales")
        print(f"     2. Luego ejecutar fase2 nuevamente")

if __name__ == '__main__':
    marcar_documentos_sin_storage()

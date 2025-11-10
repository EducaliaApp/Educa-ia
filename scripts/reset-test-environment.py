#!/usr/bin/env python3
"""
Script para RESETEAR completamente documentos_oficiales
⚠️ SOLO PARA TESTING - Borra todos los datos
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

def reset_database():
    """Elimina todos los documentos oficiales y datos relacionados"""
    
    print("⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de documentos_oficiales")
    print("    Presiona Ctrl+C en los próximos 5 segundos para cancelar...")
    
    import time
    for i in range(5, 0, -1):
        print(f"    {i}...")
        time.sleep(1)
    
    print("\n🗑️  Iniciando reset de base de datos...")
    
    # 1. Obtener IDs de documentos oficiales
    print("  📋 Obteniendo IDs de documentos...")
    result = supabase.table('documentos_oficiales').select('id').execute()
    doc_ids = [doc['id'] for doc in result.data] if result.data else []
    
    print(f"  📊 Encontrados: {len(doc_ids)} documentos")
    
    if len(doc_ids) == 0:
        print("  ✅ Base de datos ya está vacía")
        return
    
    # 2. Eliminar cambios_documentos
    print("  🗑️  Eliminando cambios_documentos...")
    try:
        supabase.table('cambios_documentos').delete().in_('documento_id', doc_ids).execute()
        print("  ✅ cambios_documentos eliminados")
    except Exception as e:
        print(f"  ⚠️  Error en cambios_documentos: {e}")
    
    # 3. Eliminar analisis_ia_portafolio
    print("  🗑️  Eliminando analisis_ia_portafolio...")
    try:
        supabase.table('analisis_ia_portafolio').delete().in_('documento_id', doc_ids).execute()
        print("  ✅ analisis_ia_portafolio eliminados")
    except Exception as e:
        print(f"  ⚠️  Error en analisis_ia_portafolio: {e}")
    
    # 4. Eliminar knowledge_base chunks
    print("  🗑️  Eliminando knowledge_base chunks...")
    try:
        supabase.table('knowledge_base').delete().in_('documento_id', doc_ids).execute()
        print("  ✅ knowledge_base chunks eliminados")
    except Exception as e:
        print(f"  ⚠️  Error en knowledge_base: {e}")
    
    # 5. Eliminar documentos_oficiales
    print("  🗑️  Eliminando documentos_oficiales...")
    try:
        supabase.table('documentos_oficiales').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print("  ✅ documentos_oficiales eliminados")
    except Exception as e:
        print(f"  ❌ Error eliminando documentos: {e}")
        return
    
    # 6. Verificar
    print("\n📊 Verificando estado final...")
    docs_count = supabase.table('documentos_oficiales').select('id', count='exact').execute()
    kb_count = supabase.table('knowledge_base').select('id', count='exact').filter('documento_id', 'not.is', 'null').execute()
    
    print(f"  • documentos_oficiales: {docs_count.count} registros")
    print(f"  • knowledge_base (con documento_id): {kb_count.count} registros")
    
    if docs_count.count == 0 and kb_count.count == 0:
        print("\n✅ RESET COMPLETO EXITOSO")
    else:
        print("\n⚠️  Quedan registros - revisar manualmente")

def reset_storage():
    """Elimina todos los archivos del bucket documentos-oficiales"""
    
    print("\n🗑️  Iniciando reset de Storage...")
    
    try:
        # Listar todos los archivos
        print("  📋 Listando archivos...")
        files = supabase.storage.from_('documentos-oficiales').list()
        
        if not files:
            print("  ✅ Storage ya está vacío")
            return
        
        total_files = 0
        for folder in files:
            if folder.get('name'):
                # Listar archivos en carpeta
                subfolder_files = supabase.storage.from_('documentos-oficiales').list(folder['name'])
                if subfolder_files:
                    paths = [f"{folder['name']}/{f['name']}" for f in subfolder_files if f.get('name')]
                    if paths:
                        total_files += len(paths)
                        print(f"  🗑️  Eliminando {len(paths)} archivos de {folder['name']}...")
                        supabase.storage.from_('documentos-oficiales').remove(paths)
        
        print(f"  ✅ {total_files} archivos eliminados del Storage")
        
    except Exception as e:
        print(f"  ❌ Error eliminando Storage: {e}")

if __name__ == '__main__':
    print("=" * 60)
    print("RESET COMPLETO: documentos_oficiales + Storage")
    print("=" * 60)
    
    reset_database()
    reset_storage()
    
    print("\n" + "=" * 60)
    print("✅ RESET COMPLETO FINALIZADO")
    print("=" * 60)
    print("\n💡 Próximos pasos:")
    print("  1. Verificar en Supabase Dashboard que todo está vacío")
    print("  2. Ejecutar workflow: gh workflow run pipeline-documentos-mineduc.yml -f force_full_sync=true")
    print("  3. Monitorear: gh run list --workflow=pipeline-documentos-mineduc.yml --limit 1")

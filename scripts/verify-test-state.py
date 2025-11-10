#!/usr/bin/env python3
"""
Script para VERIFICAR estado antes/después del reset
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

def verificar_estado():
    """Verifica el estado actual de la base de datos y storage"""
    
    print("=" * 60)
    print("VERIFICACIÓN DE ESTADO")
    print("=" * 60)
    
    # Base de datos
    print("\n📊 BASE DE DATOS:")
    
    # documentos_oficiales
    docs = supabase.table('documentos_oficiales').select('*', count='exact').execute()
    print(f"  • documentos_oficiales: {docs.count} registros")
    
    if docs.count > 0:
        # Por estado
        estados = {}
        for doc in docs.data:
            estado = doc.get('estado_procesamiento', 'desconocido')
            estados[estado] = estados.get(estado, 0) + 1
        
        print("    Estados:")
        for estado, count in estados.items():
            print(f"      - {estado}: {count}")
    
    # knowledge_base
    kb = supabase.table('knowledge_base').select('id', count='exact').filter('documento_id', 'not.is', 'null').execute()
    print(f"  • knowledge_base chunks: {kb.count} registros")
    
    # cambios_documentos
    cambios = supabase.table('cambios_documentos').select('id', count='exact').execute()
    print(f"  • cambios_documentos: {cambios.count} registros")
    
    # Storage
    print("\n📦 STORAGE (documentos-oficiales):")
    
    try:
        files = supabase.storage.from_('documentos-oficiales').list()
        
        if not files:
            print("  • 0 carpetas/archivos")
        else:
            total_files = 0
            for folder in files:
                if folder.get('name'):
                    subfolder_files = supabase.storage.from_('documentos-oficiales').list(folder['name'])
                    file_count = len(subfolder_files) if subfolder_files else 0
                    total_files += file_count
                    if file_count > 0:
                        print(f"  • {folder['name']}/: {file_count} archivos")
            
            print(f"\n  TOTAL: {total_files} archivos")
    
    except Exception as e:
        print(f"  ❌ Error listando Storage: {e}")
    
    # Resumen
    print("\n" + "=" * 60)
    if docs.count == 0 and kb.count == 0:
        print("✅ ENTORNO LIMPIO - Listo para testing desde cero")
    else:
        print("⚠️  HAY DATOS - Ejecutar reset si necesitas empezar desde cero")
    print("=" * 60)

if __name__ == '__main__':
    verificar_estado()

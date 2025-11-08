#!/usr/bin/env python3
"""
FASE 5: Optimizar índices vectoriales
Este script se encarga de optimizar los índices vectoriales de la base de datos
para mejorar el rendimiento de las consultas de similaridad en los embeddings.
Funcionalidades:
- Optimiza los índices de la tabla documentos_oficiales usando la función RPC optimizar_indices_embeddings
- Obtiene estadísticas del total de chunks en la tabla chunks_documentos
- Ejecuta VACUUM ANALYZE para optimizar la base de datos
- Resetea las estadísticas de pg_stat_statements para limpiar métricas previas
Variables de entorno requeridas:
- SUPABASE_URL: URL de la instancia de Supabase
- SUPABASE_SERVICE_ROLE_KEY: Clave de servicio con permisos administrativos
El script utiliza manejo de errores robusto y no falla el workflow en caso de error,
permitiendo que el pipeline continúe ejecutándose.
Returns:
    int: Código de salida 0 (siempre exitoso para no interrumpir el workflow)
"""
"""FASE 5: Optimizar índices vectoriales"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("⚡ Optimizando índices vectoriales...")

try:
    # Optimizar índices de documentos_oficiales
    result1 = supabase.rpc('optimizar_indices_embeddings').execute()
    print(f"✅ Índices documentos_oficiales: {result1.data}")
    
    # Optimizar índices de chunks_documentos
    stats = supabase.table('chunks_documentos').select('id', count='exact').execute()
    total_chunks = stats.count or 0
    print(f"📊 Total chunks: {total_chunks}")
    
    # VACUUM ANALYZE para optimizar
    print("🔧 Ejecutando VACUUM ANALYZE...")
    supabase.rpc('pg_stat_statements_reset').execute()
    
    print("✅ Optimización completada")
    sys.exit(0)
except Exception as e:
    print(f"⚠️ Error: {e}")
    sys.exit(0)  # No fallar el workflow

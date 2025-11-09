#!/usr/bin/env python3
"""
FASE 1.5: Verificación y Sincronización de Storage

Responsabilidades:
1. Verificar que todos los documentos registrados tengan archivo en Storage
2. Re-descargar y subir archivos faltantes desde URL original
3. Marcar documentos como 'storage_validado' o 'error_storage'
4. Generar reporte detallado

Ejecutar ANTES de Fase 2 Transform
"""

import os
import sys
import json
import requests
import time
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv('.env.local')

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# Configuración
BATCH_SIZE = int(os.getenv('VERIFY_BATCH_SIZE', '5'))  # Documentos en paralelo
MAX_RETRIES = 3
TIMEOUT = 30


# ============================================
# VERIFICACIÓN DE STORAGE
# ============================================

def verificar_archivo_existe(storage_path):
    """
    Verifica si un archivo existe en Supabase Storage
    
    Returns:
        (bool, str, int): (existe, mensaje, status_code)
    """
    try:
        # Obtener URL pública
        url = supabase.storage.from_('documentos-oficiales').get_public_url(storage_path)
        
        # HEAD request para verificar existencia
        response = requests.head(url, timeout=5)
        
        if response.status_code == 200:
            content_length = int(response.headers.get('content-length', 0))
            return True, f"OK ({content_length:,} bytes)", 200
        elif response.status_code == 404:
            return False, "Archivo no encontrado (404)", 404
        elif response.status_code == 400:
            return False, "Bad Request - Storage path inválido", 400
        else:
            return False, f"Status code inesperado: {response.status_code}", response.status_code
    
    except requests.Timeout:
        return False, "Timeout verificando Storage", 0
    except Exception as e:
        return False, f"Error: {str(e)[:100]}", 0


# ============================================
# RE-DESCARGA Y UPLOAD
# ============================================

def redownload_y_upload(doc_id, url_original, storage_path, titulo):
    """
    Re-descarga PDF desde URL original y lo sube a Storage
    
    Args:
        doc_id: UUID del documento
        url_original: URL del PDF en DocenteMás
        storage_path: Path destino en Storage
        titulo: Título del documento (para logging)
    
    Returns:
        (bool, str, int): (exito, mensaje, bytes_subidos)
    """
    
    intentos = 0
    
    while intentos < MAX_RETRIES:
        try:
            print(f"      🔄 Descargando (intento {intentos + 1}/{MAX_RETRIES})...")
            
            # Descargar de URL original
            response = requests.get(
                url_original, 
                timeout=TIMEOUT,
                stream=True,
                headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)'
                }
            )
            response.raise_for_status()
            
            pdf_bytes = response.content
            
            # Validar que es PDF
            if not pdf_bytes.startswith(b'%PDF'):
                return False, "Archivo descargado no es PDF válido", 0
            
            size_mb = len(pdf_bytes) / (1024 * 1024)
            print(f"      ✅ Descargado: {len(pdf_bytes):,} bytes ({size_mb:.2f} MB)")
            
            # Validar tamaño razonable (entre 10KB y 100MB)
            if len(pdf_bytes) < 10_000:
                return False, f"Archivo muy pequeño ({len(pdf_bytes)} bytes)", 0
            
            if len(pdf_bytes) > 100_000_000:
                return False, f"Archivo muy grande ({size_mb:.2f} MB)", 0
            
            # Subir a Storage
            print(f"      💾 Subiendo a Storage...")
            
            upload_result = supabase.storage.from_('documentos-oficiales').upload(
                path=storage_path,
                file=pdf_bytes,
                file_options={
                    'content-type': 'application/pdf',
                    'upsert': 'true'  # Sobrescribir si existe
                }
            )
            
            # Verificar resultado
            if hasattr(upload_result, 'error') and upload_result.error:
                error_msg = str(upload_result.error)
                
                # Si error es por archivo ya existente, verificar que existe
                if 'already exists' in error_msg.lower():
                    existe, msg, _ = verificar_archivo_existe(storage_path)
                    if existe:
                        print(f"      ✅ Archivo ya existe y es válido")
                        return True, "Archivo validado (ya existía)", len(pdf_bytes)
                
                return False, f"Error upload: {error_msg[:100]}", 0
            
            # Verificar que se subió correctamente
            time.sleep(0.5)  # Breve espera para que Storage procese
            existe, msg, status = verificar_archivo_existe(storage_path)
            
            if existe:
                print(f"      ✅ Upload exitoso y verificado")
                return True, "Upload exitoso", len(pdf_bytes)
            else:
                return False, f"Upload aparentemente exitoso pero no se encuentra: {msg}", 0
        
        except requests.Timeout:
            intentos += 1
            if intentos < MAX_RETRIES:
                print(f"      ⏱️  Timeout, reintentando...")
                time.sleep(2)
            else:
                return False, f"Timeout después de {MAX_RETRIES} intentos", 0
        
        except requests.HTTPError as e:
            return False, f"HTTP Error {e.response.status_code}: {e.response.reason}", 0
        
        except Exception as e:
            return False, f"Error: {str(e)[:100]}", 0
    
    return False, f"Falló después de {MAX_RETRIES} intentos", 0


# ============================================
# PROCESAMIENTO INDIVIDUAL
# ============================================

def verificar_y_sincronizar_documento(doc):
    """
    Verifica un documento y lo re-sincroniza si es necesario
    
    Returns:
        dict con resultado del procesamiento
    """
    doc_id = doc['id']
    titulo = doc['titulo']
    storage_path = doc['storage_path']
    url_original = doc.get('url_original')
    
    resultado = {
        'doc_id': doc_id,
        'titulo': titulo,
        'storage_path': storage_path,
        'status': 'unknown',
        'mensaje': '',
        'bytes': 0,
        'requirio_redownload': False
    }
    
    print(f"\n📄 [{doc_id}] {titulo[:60]}")
    print(f"   Path: {storage_path}")
    
    # 1. Verificar si existe en Storage
    existe, mensaje, status_code = verificar_archivo_existe(storage_path)
    
    if existe:
        print(f"   ✅ {mensaje}")
        resultado['status'] = 'ok'
        resultado['mensaje'] = mensaje
        return resultado
    
    # 2. Archivo no existe - intentar re-descarga
    print(f"   ❌ {mensaje}")
    
    if not url_original:
        print(f"   ⚠️  No hay URL original para re-descargar")
        resultado['status'] = 'error'
        resultado['mensaje'] = 'Sin URL original para recuperación'
        return resultado
    
    print(f"   🔄 Iniciando re-sincronización...")
    
    # 3. Re-descargar y subir
    exito, msg, bytes_subidos = redownload_y_upload(
        doc_id, 
        url_original, 
        storage_path,
        titulo
    )
    
    if exito:
        print(f"   ✅ Re-sincronizado exitosamente")
        resultado['status'] = 'resincronizado'
        resultado['mensaje'] = msg
        resultado['bytes'] = bytes_subidos
        resultado['requirio_redownload'] = True
    else:
        print(f"   ❌ Re-sincronización falló: {msg}")
        resultado['status'] = 'error'
        resultado['mensaje'] = msg
    
    return resultado


# ============================================
# ACTUALIZACIÓN DE BD
# ============================================

def actualizar_estado_bd(resultado):
    """Actualiza estado del documento en BD según resultado"""
    
    doc_id = resultado['doc_id']
    
    try:
        if resultado['status'] == 'ok':
            # Archivo OK - marcar como storage_validado
            supabase.table('documentos_oficiales').update({
                'etapa_actual': 'storage_validado',
                'fecha_actualizacion': datetime.now().isoformat(),
                'metadata': supabase.rpc('jsonb_merge', {
                    'target': doc_id,
                    'delta': json.dumps({
                        'storage_verificado': True,
                        'fecha_verificacion': datetime.now().isoformat()
                    })
                })
            }).eq('id', doc_id).execute()
        
        elif resultado['status'] == 'resincronizado':
            # Re-descargado exitosamente
            supabase.table('documentos_oficiales').update({
                'etapa_actual': 'storage_validado',
                'fecha_actualizacion': datetime.now().isoformat(),
                'metadata': supabase.rpc('jsonb_merge', {
                    'target': doc_id,
                    'delta': json.dumps({
                        'storage_verificado': True,
                        'requirio_redownload': True,
                        'bytes_redownload': resultado['bytes'],
                        'fecha_redownload': datetime.now().isoformat()
                    })
                })
            }).eq('id', doc_id).execute()
        
        else:
            # Error - marcar para atención manual
            supabase.table('documentos_oficiales').update({
                'etapa_actual': 'error_storage',
                'fecha_actualizacion': datetime.now().isoformat(),
                'metadata': supabase.rpc('jsonb_merge', {
                    'target': doc_id,
                    'delta': json.dumps({
                        'storage_error': resultado['mensaje'],
                        'fecha_error': datetime.now().isoformat(),
                        'requiere_atencion_manual': True
                    })
                })
            }).eq('id', doc_id).execute()
    
    except Exception as e:
        print(f"   ⚠️  Error actualizando BD: {e}")


# ============================================
# PROCESAMIENTO EN BATCH
# ============================================

def procesar_batch(documentos_batch, batch_num, total_batches):
    """Procesa un batch de documentos en paralelo"""
    
    print(f"\n{'='*70}")
    print(f"🚀 BATCH {batch_num}/{total_batches} - {len(documentos_batch)} documentos")
    print(f"{'='*70}")
    
    inicio_batch = time.time()
    resultados = []
    
    # Procesar en paralelo
    with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
        futuros = {
            executor.submit(verificar_y_sincronizar_documento, doc): doc 
            for doc in documentos_batch
        }
        
        for futuro in as_completed(futuros):
            resultado = futuro.result()
            resultados.append(resultado)
            
            # Actualizar BD inmediatamente
            actualizar_estado_bd(resultado)
    
    tiempo_batch = time.time() - inicio_batch
    
    # Estadísticas del batch
    ok = sum(1 for r in resultados if r['status'] == 'ok')
    resincronizados = sum(1 for r in resultados if r['status'] == 'resincronizado')
    errores = sum(1 for r in resultados if r['status'] == 'error')
    
    print(f"\n📊 BATCH {batch_num} completado en {tiempo_batch:.1f}s")
    print(f"   ✅ OK: {ok}")
    print(f"   🔄 Re-sincronizados: {resincronizados}")
    print(f"   ❌ Errores: {errores}")
    print(f"   ⚡ Velocidad: {tiempo_batch/len(documentos_batch):.1f}s/doc")
    
    return resultados


# ============================================
# MAIN
# ============================================

def main():
    print("="*70)
    print("FASE 1.5: VERIFICACIÓN Y SINCRONIZACIÓN DE STORAGE")
    print("="*70)
    
    # 1. Obtener documentos pendientes de verificación
    print("\n🔍 Buscando documentos para verificar...")
    
    documentos = supabase.table('documentos_oficiales')\
        .select('id, titulo, storage_path, url_original')\
        .eq('etapa_actual', 'descargado')\
        .not_.is_('storage_path', 'null')\
        .order('created_at', desc=False)\
        .execute().data or []
    
    print(f"📋 Encontrados: {len(documentos)} documentos")
    
    if len(documentos) == 0:
        print("\n✅ No hay documentos pendientes de verificación")
        
        # Exportar JSON vacío
        export_metrics_json({
            'timestamp': datetime.now().isoformat(),
            'total': 0,
            'validados': 0,
            'resincronizados': 0,
            'errores': 0
        }, 'verify_storage_metrics.json')
        
        return
    
    # 2. Procesar en batches
    inicio_total = time.time()
    total_batches = (len(documentos) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"\n🚀 Modo batch: {len(documentos)} docs en {total_batches} batches de {BATCH_SIZE}")
    
    todos_resultados = []
    
    for batch_num in range(total_batches):
        inicio_idx = batch_num * BATCH_SIZE
        fin_idx = min((batch_num + 1) * BATCH_SIZE, len(documentos))
        batch = documentos[inicio_idx:fin_idx]
        
        resultados_batch = procesar_batch(batch, batch_num + 1, total_batches)
        todos_resultados.extend(resultados_batch)
        
        # Pausa entre batches
        if batch_num < total_batches - 1:
            print(f"\n⏸️  Pausa de 3s antes del siguiente batch...")
            time.sleep(3)
    
    # 3. Resumen final
    tiempo_total = time.time() - inicio_total
    
    ok = sum(1 for r in todos_resultados if r['status'] == 'ok')
    resincronizados = sum(1 for r in todos_resultados if r['status'] == 'resincronizado')
    errores = sum(1 for r in todos_resultados if r['status'] == 'error')
    
    bytes_totales = sum(r['bytes'] for r in todos_resultados if r['bytes'] > 0)
    mb_totales = bytes_totales / (1024 * 1024)
    
    print("\n" + "="*70)
    print("✅ VERIFICACIÓN COMPLETADA")
    print("="*70)
    print(f"📊 Resultados:")
    print(f"   Total procesados: {len(documentos)}")
    print(f"   ✅ Validados (ya existían): {ok}")
    print(f"   🔄 Re-sincronizados: {resincronizados}")
    print(f"   ❌ Errores: {errores}")
    print(f"   📦 Datos descargados: {mb_totales:.2f} MB")
    print(f"\n⏱️  Tiempo total: {tiempo_total:.1f}s")
    print(f"⚡ Velocidad: {tiempo_total/len(documentos):.1f}s/doc")
    
    # 4. Generar reporte de errores si existen
    if errores > 0:
        print(f"\n⚠️  ATENCIÓN: {errores} documentos con errores")
        print(f"\nDocumentos con error:")
        
        for r in todos_resultados:
            if r['status'] == 'error':
                print(f"   ❌ {r['titulo'][:50]}")
                print(f"      Error: {r['mensaje']}")
        
        print(f"\n💡 Estos documentos requieren atención manual:")
        print(f"   1. Verificar que URL original sea accesible")
        print(f"   2. Considerar re-ejecutar monitor-documentos-oficiales")
        print(f"   3. Verificar permisos de Storage")
    
    # 5. Exportar métricas
    export_metrics_json({
        'timestamp': datetime.now().isoformat(),
        'fase': 'verify_storage',
        'total': len(documentos),
        'validados': ok,
        'resincronizados': resincronizados,
        'errores': errores,
        'bytes_descargados': bytes_totales,
        'mb_descargados': round(mb_totales, 2),
        'tiempo_total_segundos': round(tiempo_total, 2),
        'documentos_con_error': [
            {
                'id': r['doc_id'],
                'titulo': r['titulo'],
                'error': r['mensaje']
            }
            for r in todos_resultados if r['status'] == 'error'
        ]
    }, 'verify_storage_metrics.json')
    
    print("\n" + "="*70)
    
    # Exit code basado en resultado
    if errores == len(documentos):
        # Todos fallaron
        print("❌ CRÍTICO: Todos los documentos fallaron")
        sys.exit(1)
    elif errores > 0:
        # Algunos fallaron pero hubo éxitos
        print(f"⚠️  Completado con {errores} errores")
        sys.exit(0)  # No fallar el workflow
    else:
        print("✅ Todos los documentos validados exitosamente")
        sys.exit(0)


def export_metrics_json(metrics: dict, filepath: str):
    """Exporta métricas en formato JSON"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Métricas exportadas: {filepath}")
    except Exception as e:
        print(f"\n⚠️  Error exportando métricas: {e}")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupción manual")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
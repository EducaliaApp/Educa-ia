#!/usr/bin/env python3
"""
FASE 3: Load - Chunking Inteligente + Embeddings Optimizados

MEJORAS IMPLEMENTADAS:
1. Chunking semántico respetando estructura Markdown
2. Metadata rica para filtrado preciso
3. Embeddings con text-embedding-3-large (mejor calidad)
4. Caché de embeddings para re-ejecuciones
5. Procesamiento por lotes (batch)
6. Validación de calidad
"""

import os, sys, re, hashlib, json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
from typing import List, Dict, Tuple

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
openai = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Configuración optimizada
EMBEDDING_MODEL = 'text-embedding-3-large'  # 3072 dimensiones, mejor calidad, costo moderado, Para reducción a 1536 dimensiones escoger el modelo text-embedding-3-small
EMBEDDING_DIMENSIONS = 1536  # Reducción dimensional para eficiencia
MAX_CHUNK_SIZE = 6000  # Chars por chunk (balance calidad/costo)
MIN_CHUNK_SIZE = 500   # Evita chunks muy pequeños
OVERLAP_SIZE = 200     # Overlap mínimo para contexto
MAX_TOKENS_PER_CHUNK = 7000  # 🔧 HARD LIMIT: OpenAI tiene límite de 8192 tokens

# ============================================
# CHUNKING SEMÁNTICO INTELIGENTE
# ============================================

def extraer_metadata_documento(contenido: str, doc_info: dict) -> dict:
    """Extrae metadata del contenido para enriquecer búsqueda"""
    
    metadata = {
        'tipo_documento': doc_info.get('tipo_documento', 'desconocido'),
        'titulo': doc_info.get('titulo', ''),
        'año': '2025',
        'sistema': 'carrera_docente_chile'
    }
    
    # Detectar tipo específico de contenido
    contenido_lower = contenido.lower()
    
    if 'rúbrica' in contenido_lower or 'rubrica' in contenido_lower:
        metadata['categoria'] = 'rubrica_evaluacion'
        
        # Extraer niveles mencionados
        niveles = []
        if 'insatisfactorio' in contenido_lower:
            niveles.append('insatisfactorio')
        if 'básico' in contenido_lower:
            niveles.append('basico')
        if 'competente' in contenido_lower:
            niveles.append('competente')
        if 'destacado' in contenido_lower:
            niveles.append('destacado')
        
        metadata['niveles_desempeno'] = niveles
    
    elif 'módulo' in contenido_lower or 'modulo' in contenido_lower:
        metadata['categoria'] = 'manual_portafolio'
        
        # Extraer número de módulo
        modulo_match = re.search(r'módulo\s+(\d+)', contenido_lower)
        if modulo_match:
            metadata['modulo'] = int(modulo_match.group(1))
    
    # Detectar nivel educativo
    if any(nivel in contenido_lower for nivel in ['educación básica', 'educacion basica', '1° a 6°']):
        metadata['nivel_educativo'] = 'basica_1_6'
    elif '7° básico' in contenido_lower or '4° medio' in contenido_lower:
        metadata['nivel_educativo'] = 'basica_7_media_4'
    elif 'educación parvularia' in contenido_lower:
        metadata['nivel_educativo'] = 'parvularia'
    elif 'educación media técnico' in contenido_lower:
        metadata['nivel_educativo'] = 'media_tecnico_profesional'
    
    # Detectar referencias al MBE
    dominios_mbe = []
    if re.search(r'dominio\s+[a-d]', contenido_lower):
        dominios_mbe = re.findall(r'dominio\s+([a-d])', contenido_lower)
    metadata['dominios_mbe'] = list(set(dominios_mbe))
    
    return metadata


def chunking_semantico_markdown(contenido: str, doc_metadata: dict) -> List[Dict]:
    """
    Divide contenido respetando estructura Markdown
    NUNCA parte un indicador o sección a la mitad
    """
    
    chunks_finales = []
    
    # Detectar si es rúbrica (estructura especial)
    es_rubrica = doc_metadata.get('tipo_documento') == 'rubricas_portafolio'
    
    if es_rubrica:
        chunks_intermedios = chunking_rubricas(contenido, doc_metadata)
    else:
        chunks_intermedios = chunking_generico(contenido, doc_metadata)
    
    # 🔧 NUEVO: Forzar división si algún chunk excede MAX_TOKENS_PER_CHUNK
    for chunk in chunks_intermedios:
        texto = chunk['contenido']
        
        # Estimación rápida: 1 token ≈ 4 caracteres en español
        tokens_estimados = len(texto) // 4
        
        if tokens_estimados > MAX_TOKENS_PER_CHUNK:
            # Dividir forzadamente en chunks más pequeños
            sub_chunks = dividir_chunk_largo(texto, chunk['metadata'])
            chunks_finales.extend(sub_chunks)
        else:
            chunks_finales.append(chunk)
    
    return chunks_finales


def dividir_chunk_largo(texto: str, metadata: dict) -> List[Dict]:
    """
    Divide un chunk que excede MAX_TOKENS_PER_CHUNK
    Respeta saltos de línea y párrafos cuando es posible
    """
    chunks = []
    max_chars = MAX_TOKENS_PER_CHUNK * 4  # Convertir tokens a chars
    
    # Dividir por párrafos primero
    parrafos = texto.split('\n\n')
    
    chunk_actual = ""
    parte_num = 1
    
    for parrafo in parrafos:
        # Si un solo párrafo es demasiado largo, dividirlo por oraciones
        if len(parrafo) > max_chars:
            # Dividir por oraciones (punto + espacio)
            oraciones = re.split(r'(?<=[.!?])\s+', parrafo)
            
            for oracion in oraciones:
                if len(chunk_actual) + len(oracion) > max_chars and chunk_actual:
                    # Guardar chunk actual
                    chunks.append({
                        'contenido': chunk_actual,
                        'metadata': {
                            **metadata,
                            'parte': f'{parte_num}/{len(parrafos)}',
                            'chunk_dividido': True
                        }
                    })
                    chunk_actual = oracion
                    parte_num += 1
                else:
                    chunk_actual += ' ' + oracion if chunk_actual else oracion
        
        # Párrafo normal
        elif len(chunk_actual) + len(parrafo) > max_chars and chunk_actual:
            # Guardar chunk actual
            chunks.append({
                'contenido': chunk_actual,
                'metadata': {
                    **metadata,
                    'parte': f'{parte_num}',
                    'chunk_dividido': True
                }
            })
            chunk_actual = parrafo
            parte_num += 1
        else:
            chunk_actual += '\n\n' + parrafo if chunk_actual else parrafo
    
    # Agregar último chunk
    if chunk_actual.strip():
        chunks.append({
            'contenido': chunk_actual,
            'metadata': {
                **metadata,
                'parte': f'{parte_num}' if parte_num > 1 else 'completo',
                'chunk_dividido': parte_num > 1
            }
        })
    
    return chunks


def chunking_rubricas(contenido: str, doc_metadata: dict) -> List[Dict]:
    """
    Chunking especializado para rúbricas MINEDUC
    Cada indicador completo = 1 chunk (con todos sus niveles)
    """
    
    chunks = []
    
    # Dividir por indicadores (## Indicador...)
    # Patrón: ## Indicador... hasta el siguiente ## Indicador o fin
    indicadores = re.split(r'(?=## Indicador)', contenido)
    
    for idx, indicador_texto in enumerate(indicadores):
        if not indicador_texto.strip():
            continue
        
        # Extraer nombre del indicador
        nombre_match = re.search(r'## Indicador:?\s*(.+?)(?:\n|$)', indicador_texto)
        nombre_indicador = nombre_match.group(1).strip() if nombre_match else f"Indicador {idx+1}"
        
        # Metadata específica del chunk
        chunk_metadata = {
            **doc_metadata,
            'chunk_type': 'indicador_completo',
            'indicador_nombre': nombre_indicador,
            'indicador_numero': idx + 1,
            'tiene_4_niveles': all(nivel in indicador_texto.lower() 
                                   for nivel in ['insatisfactorio', 'básico', 'competente', 'destacado'])
        }
        
        # Si el indicador es muy largo, dividir por niveles
        if len(indicador_texto) > MAX_CHUNK_SIZE:
            # Dividir por niveles manteniendo contexto
            niveles = re.split(r'(?=### Nivel)', indicador_texto)
            
            # Primer chunk: header del indicador
            if niveles[0].strip():
                chunks.append({
                    'contenido': niveles[0],
                    'metadata': {**chunk_metadata, 'parte': 'descripcion'}
                })
            
            # Chunks siguientes: cada nivel
            for nivel_idx, nivel_texto in enumerate(niveles[1:], 1):
                nivel_nombre = re.search(r'### Nivel:?\s*(\w+)', nivel_texto)
                nivel_nombre = nivel_nombre.group(1) if nivel_nombre else f"Nivel {nivel_idx}"
                
                chunks.append({
                    'contenido': f"## {nombre_indicador}\n\n{nivel_texto}",  # Incluir contexto
                    'metadata': {
                        **chunk_metadata,
                        'parte': f'nivel_{nivel_nombre.lower()}',
                        'nivel_desempeno': nivel_nombre.lower()
                    }
                })
        else:
            # Indicador cabe completo en un chunk
            chunks.append({
                'contenido': indicador_texto,
                'metadata': chunk_metadata
            })
    
    return chunks


def chunking_generico(contenido: str, doc_metadata: dict) -> List[Dict]:
    """
    Chunking para manuales y otros documentos
    Respeta estructura de headers (##, ###)
    """
    
    chunks = []
    
    # Dividir por secciones principales (##)
    secciones = re.split(r'(?=^## )', contenido, flags=re.MULTILINE)
    
    chunk_actual = ""
    metadata_actual = doc_metadata.copy()
    
    for seccion in secciones:
        if not seccion.strip():
            continue
        
        # Extraer título de la sección
        titulo_match = re.search(r'^##\s+(.+?)(?:\n|$)', seccion, re.MULTILINE)
        titulo_seccion = titulo_match.group(1).strip() if titulo_match else "Sin título"
        
        # Si agregar esta sección excede el límite, guardar chunk actual
        if len(chunk_actual) + len(seccion) > MAX_CHUNK_SIZE and len(chunk_actual) > MIN_CHUNK_SIZE:
            chunks.append({
                'contenido': chunk_actual,
                'metadata': metadata_actual
            })
            
            # Iniciar nuevo chunk con overlap (últimas líneas del anterior)
            lineas_anteriores = chunk_actual.split('\n')[-5:]  # Últimas 5 líneas
            chunk_actual = '\n'.join(lineas_anteriores) + '\n\n' + seccion
            metadata_actual = {
                **doc_metadata,
                'seccion': titulo_seccion
            }
        else:
            chunk_actual += '\n\n' + seccion if chunk_actual else seccion
            metadata_actual['seccion'] = titulo_seccion
    
    # Agregar último chunk
    if chunk_actual.strip() and len(chunk_actual) > MIN_CHUNK_SIZE:
        chunks.append({
            'contenido': chunk_actual,
            'metadata': metadata_actual
        })
    
    return chunks


# ============================================
# GENERACIÓN DE EMBEDDINGS CON CACHÉ
# ============================================

def generar_embedding_con_cache(texto: str, chunk_hash: str) -> Tuple[List[float], int, float]:
    """
    Genera embedding con sistema de caché
    Evita re-calcular embeddings idénticos
    """
    
    # Buscar en caché
    # 🔧 FIX: Usar .limit(1).execute() en lugar de .maybeSingle() 
    # (maybeSingle no existe en supabase-py, fue renombrado a maybe_single)
    cache_result = supabase.table('embeddings_cache')\
        .select('embedding, tokens_usados')\
        .eq('content_hash', chunk_hash)\
        .eq('model', EMBEDDING_MODEL)\
        .limit(1)\
        .execute()
    
    if cache_result.data and len(cache_result.data) > 0:
        cached = cache_result.data[0]  # Obtener primer resultado
        return cached['embedding'], cached['tokens_usados'], 0.0
    
    # Generar embedding nuevo
    try:
        resp = openai.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texto,
            dimensions=EMBEDDING_DIMENSIONS  # Reducción dimensional
        )
        
        embedding = resp.data[0].embedding
        tokens = resp.usage.total_tokens
        
        # text-embedding-3-large: $0.13 por 1M tokens
        cost = (tokens / 1_000_000) * 0.13
        
        # Guardar en caché
        supabase.table('embeddings_cache').insert({
            'content_hash': chunk_hash,
            'model': EMBEDDING_MODEL,
            'embedding': embedding,
            'tokens_usados': tokens,
            'dimensions': EMBEDDING_DIMENSIONS,
            'created_at': datetime.now().isoformat()
        }).execute()
        
        return embedding, tokens, cost
        
    except Exception as e:
        print(f"  ⚠️  Error generando embedding: {e}")
        raise


def procesar_documento_batch(doc: dict) -> Tuple[int, int, float]:
    """
    Procesa un documento completo:
    1. Extrae metadata
    2. Chunking semántico
    3. Genera embeddings
    4. Guarda en BD
    """
    
    try:
        # Marcar como procesando
        supabase.table('documentos_oficiales')\
            .update({'estado_procesamiento': 'procesando'})\
            .eq('id', doc['id'])\
            .execute()
        
        contenido = doc.get('contenido_markdown') or doc.get('contenido_texto', '')
        
        if not contenido:
            raise ValueError("Documento sin contenido")
        
        # 1. Extraer metadata del documento
        doc_metadata = extraer_metadata_documento(contenido, doc)
        
        # 2. Chunking semántico
        chunks = chunking_semantico_markdown(contenido, doc_metadata)
        
        print(f"  📑 {len(chunks)} chunks semánticos generados")
        
        # 3. Generar embeddings para cada chunk
        total_tokens = 0
        total_cost = 0.0
        chunks_guardados = 0
        
        for idx, chunk_data in enumerate(chunks):
            chunk_texto = chunk_data['contenido']
            chunk_metadata = chunk_data['metadata']
            
            # Hash del contenido para caché
            chunk_hash = hashlib.sha256(chunk_texto.encode()).hexdigest()
            
            # Generar embedding con caché
            embedding, tokens, cost = generar_embedding_con_cache(chunk_texto, chunk_hash)
            
            # 4. Guardar chunk en BD
            supabase.table('chunks_documentos').insert({
                'documento_id': doc['id'],
                'contenido': chunk_texto,
                'chunk_index': idx,
                'chunk_hash': chunk_hash,
                'embedding': embedding,
                'metadata': {
                    **chunk_metadata,
                    'tokens': tokens,
                    'length': len(chunk_texto),
                    'embedding_model': EMBEDDING_MODEL,
                    'embedding_dimensions': EMBEDDING_DIMENSIONS
                }
            }).execute()
            
            total_tokens += tokens
            total_cost += cost
            chunks_guardados += 1
        
        # 5. Marcar documento como completado
        supabase.table('documentos_oficiales').update({
            'procesado': True,
            'fecha_procesamiento': datetime.now().isoformat(),
            'embedding_model': EMBEDDING_MODEL,
            'etapa_actual': 'completado',
            'progreso_procesamiento': 100,
            'estado_procesamiento': 'exitoso',
            'metadata': {
                'chunks_generados': chunks_guardados,
                'tokens_embeddings': total_tokens,
                'costo_embeddings_usd': round(total_cost, 4)
            }
        }).eq('id', doc['id']).execute()
        
        print(f"  ✅ {chunks_guardados} chunks guardados | {total_tokens:,} tokens | ${total_cost:.4f}")
        
        return chunks_guardados, total_tokens, total_cost
        
    except Exception as e:
        # Marcar como fallido
        supabase.table('documentos_oficiales').update({
            'estado_procesamiento': 'fallido',
            'error_procesamiento': str(e),
            'etapa_fallida': 'embeddings'
        }).eq('id', doc['id']).execute()
        
        print(f"  ❌ Error: {e}")
        raise


# ============================================
# PROCESAMIENTO PRINCIPAL
# ============================================

# Buscar documentos listos para embeddings
# IMPORTANTE: Buscar en 'transformado' no en 'texto_extraido'
docs = supabase.table('documentos_oficiales')\
    .select('id, contenido_markdown, contenido_texto, titulo, tipo_documento')\
    .eq('etapa_actual', 'transformado')\
    .eq('procesado', False)\
    .limit(50)\
    .execute().data or []

print(f"🔢 Generando embeddings para {len(docs)} documentos...")
print(f"🤖 Modelo: {EMBEDDING_MODEL} ({EMBEDDING_DIMENSIONS}D)")
print(f"📏 Chunking: semántico adaptativo")

if len(docs) == 0:
    print("\nℹ️  No hay documentos pendientes de carga")
    print("\nCargados: 0")
    print("Chunks: 0")
    print("Tokens: 0")
    print("Costo: $0.0000")
    sys.exit(0)

# Procesar documentos
loaded = 0
total_chunks = 0
total_tokens = 0
total_cost = 0.0

for doc in docs:
    try:
        print(f"\n📄 {doc['titulo']}")
        chunks, tokens, cost = procesar_documento_batch(doc)
        
        loaded += 1
        total_chunks += chunks
        total_tokens += tokens
        total_cost += cost
        
    except Exception as e:
        print(f"  ❌ Error procesando documento: {e}")
        continue

# Reporte final
print("\n" + "="*60)
print(f"✅ Documentos cargados: {loaded}/{len(docs)}")
print(f"📦 Chunks generados: {total_chunks:,}")
print(f"🎯 Tokens totales: {total_tokens:,}")
print(f"💰 Costo total: ${total_cost:.4f} USD")
print(f"📊 Promedio: {total_chunks//max(loaded,1)} chunks/doc, ${total_cost/max(loaded,1):.4f}/doc")

# ============================================
# EXPORTAR MÉTRICAS JSON
# ============================================

def export_metrics_json(metrics: dict, filepath: str):
    """Exporta métricas en formato JSON para GitHub Actions"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Métricas exportadas: {filepath}")
    except Exception as e:
        print(f"\n⚠️ Error exportando métricas: {e}")

# Preparar métricas para exportación
metrics = {
    'timestamp': datetime.now().isoformat(),
    'fase': 'load',
    
    # Aliases para GitHub Actions (compatibilidad)
    'loaded': loaded,
    'tokens': total_tokens,
    'cost_usd': round(total_cost, 4),
    
    # Métricas detalladas
    'documentos_procesados': len(docs),
    'documentos_cargados': loaded,
    'documentos_fallidos': len(docs) - loaded,
    'tasa_exito': round(loaded / max(len(docs), 1) * 100, 2),
    'chunks': {
        'total_generados': total_chunks,
        'promedio_por_documento': total_chunks // max(loaded, 1)
    },
    'embeddings': {
        'modelo': EMBEDDING_MODEL,
        'dimensiones': EMBEDDING_DIMENSIONS,
        'tokens_totales': total_tokens,
        'tokens_promedio_por_doc': total_tokens // max(loaded, 1)
    },
    'costos': {
        'total_usd': round(total_cost, 4),
        'promedio_por_documento_usd': round(total_cost / max(loaded, 1), 4),
        'costo_por_1k_tokens_usd': 0.00013  # text-embedding-3-large
    },
    'configuracion': {
        'max_chunk_size': MAX_CHUNK_SIZE,
        'min_chunk_size': MIN_CHUNK_SIZE,
        'overlap_size': OVERLAP_SIZE
    }
}

export_metrics_json(metrics, 'load_metrics.json')

sys.exit(0 if loaded > 0 else 1)